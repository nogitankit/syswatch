#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <thread>
#include <chrono>
#include <vector>
#include <map>
#include <algorithm>
#include <cmath>
#include <dirent.h>
#include <sys/statvfs.h>
#include <sys/utsname.h>
#include <unistd.h>
#include <cstring>
#include <filesystem>
#include <iomanip>
#include <climits>
#include <cfloat>

namespace fs = std::filesystem;

// ─── Helpers ────────────────────────────────────────────────────────

static std::string trim(const std::string& s) {
  size_t a = s.find_first_not_of(" \t\r\n");
  size_t b = s.find_last_not_of(" \t\r\n");
  return (a == std::string::npos) ? "" : s.substr(a, b - a + 1);
}

static std::string readFileStr(const std::string& path) {
  std::ifstream f(path);
  if (!f) return "";
  std::string content((std::istreambuf_iterator<char>(f)),
                       std::istreambuf_iterator<char>());
  return trim(content);
}

static double readFileDouble(const std::string& path) {
  std::string s = readFileStr(path);
  if (s.empty()) return 0.0;
  try { return std::stod(s); } catch (...) { return 0.0; }
}

static std::string escapeJson(const std::string& s) {
  std::string out;
  for (char c : s) {
    if (c == '"') out += "\\\"";
    else if (c == '\\') out += "\\\\";
    else if (c == '\n') out += "\\n";
    else if (c == '\r') continue;
    else if (c == '\0') continue;
    else out += c;
  }
  return out;
}

static double roundTo(double v, int decimals) {
  double f = std::pow(10.0, decimals);
  return std::round(v * f) / f;
}

static std::string getTimestamp() {
  auto now = std::chrono::system_clock::now();
  auto t = std::chrono::system_clock::to_time_t(now);
  std::tm tm{};
  gmtime_r(&t, &tm);
  char buf[64];
  std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm);
  return buf;
}

// ─── Sensor with min/max tracking ───────────────────────────────────

struct Sensor {
  std::string name;
  double value = 0.0;
  double minVal = DBL_MAX;
  double maxVal = -DBL_MAX;

  void update(double v) {
    value = v;
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }

  void init(const std::string& n, double v) {
    name = n;
    value = v;
    minVal = v;
    maxVal = v;
  }

  std::string toJson() const {
    std::ostringstream o;
    o << std::fixed << std::setprecision(1);
    o << "{\"name\":\"" << escapeJson(name) << "\","
      << "\"value\":" << roundTo(value, 1) << ","
      << "\"min\":" << roundTo((minVal == DBL_MAX ? 0 : minVal), 1) << ","
      << "\"max\":" << roundTo((maxVal == -DBL_MAX ? 0 : maxVal), 1) << "}";
    return o.str();
  }
};

// ─── Per-core CPU times ─────────────────────────────────────────────

struct CpuCoreTimes {
  unsigned long long user = 0, nice = 0, system = 0, idle = 0;
  unsigned long long iowait = 0, irq = 0, softirq = 0, steal = 0;
  unsigned long long total() const {
    return user + nice + system + idle + iowait + irq + softirq + steal;
  }
  unsigned long long active() const {
    return user + nice + system + iowait + irq + softirq + steal;
  }
};

// ─── Network previous counters ──────────────────────────────────────

struct NetPrev {
  unsigned long long rxBytes = 0;
  unsigned long long txBytes = 0;
};

// ─── Disk previous counters ─────────────────────────────────────────

struct DiskPrev {
  unsigned long long readSectors = 0;
  unsigned long long writeSectors = 0;
  std::chrono::steady_clock::time_point lastTime;
};

// ═══════════════════════════════════════════════════════════════════
//   DATA COLLECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// ── CPU ─────────────────────────────────────────────────────────────

static int getCoreCount() {
  int count = 0;
  std::ifstream f("/proc/stat");
  std::string line;
  while (std::getline(f, line)) {
    if (line.substr(0, 3) == "cpu" && line[3] != ' ') count++;
  }
  return count;
}

static std::vector<CpuCoreTimes> readAllCpuTimes(int coreCount) {
  // index 0 = aggregate "cpu", 1..coreCount = per-core
  std::vector<CpuCoreTimes> times(coreCount + 1);
  std::ifstream f("/proc/stat");
  std::string line;
  int idx = 0;
  while (std::getline(f, line) && idx <= coreCount) {
    if (line.substr(0, 3) != "cpu") break;
    std::istringstream ss(line);
    std::string label;
    ss >> label;
    auto& t = times[idx];
    ss >> t.user >> t.nice >> t.system >> t.idle
       >> t.iowait >> t.irq >> t.softirq >> t.steal;
    idx++;
  }
  return times;
}

static std::string getCpuName() {
  std::ifstream f("/proc/cpuinfo");
  std::string line;
  while (std::getline(f, line)) {
    if (line.find("model name") != std::string::npos) {
      auto pos = line.find(':');
      if (pos != std::string::npos) return trim(line.substr(pos + 1));
    }
  }
  return "Unknown CPU";
}

static int getThreadCount() {
  std::ifstream f("/proc/cpuinfo");
  std::string line;
  int count = 0;
  while (std::getline(f, line)) {
    if (line.find("processor") == 0) count++;
  }
  return count;
}

static int getPhysicalCoreCount() {
  // Count unique core ids
  std::ifstream f("/proc/cpuinfo");
  std::string line;
  std::vector<int> coreIds;
  while (std::getline(f, line)) {
    if (line.find("core id") == 0) {
      auto pos = line.find(':');
      if (pos != std::string::npos) {
        int id = std::stoi(trim(line.substr(pos + 1)));
        if (std::find(coreIds.begin(), coreIds.end(), id) == coreIds.end())
          coreIds.push_back(id);
      }
    }
  }
  return coreIds.empty() ? getCoreCount() : (int)coreIds.size();
}

static double getMaxCpuSpeedMHz() {
  // Try cpufreq first
  std::string s = readFileStr("/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq");
  if (!s.empty()) {
    try { return std::stod(s) / 1000.0; } catch (...) {}
  }
  // Fallback to /proc/cpuinfo
  std::ifstream f("/proc/cpuinfo");
  std::string line;
  while (std::getline(f, line)) {
    if (line.find("cpu MHz") != std::string::npos) {
      auto pos = line.find(':');
      if (pos != std::string::npos) {
        try { return std::stod(trim(line.substr(pos + 1))); } catch (...) {}
      }
    }
  }
  return 0.0;
}

static double getCoreClock(int core) {
  std::ostringstream path;
  path << "/sys/devices/system/cpu/cpu" << core << "/cpufreq/scaling_cur_freq";
  double kHz = readFileDouble(path.str());
  return kHz / 1000.0; // to MHz
}

// CPU temperature: try thermal_zone, then hwmon
static double getCpuTemperature() {
  // Try thermal zones first
  for (int i = 0; i < 20; i++) {
    std::ostringstream typePath, tempPath;
    typePath << "/sys/class/thermal/thermal_zone" << i << "/type";
    tempPath << "/sys/class/thermal/thermal_zone" << i << "/temp";

    std::string type = readFileStr(typePath.str());
    if (type.find("x86_pkg") != std::string::npos ||
        type.find("cpu") != std::string::npos ||
        type.find("coretemp") != std::string::npos ||
        type.find("k10temp") != std::string::npos) {
      double millideg = readFileDouble(tempPath.str());
      if (millideg > 0) return millideg / 1000.0;
    }
  }

  // Try hwmon
  std::string hwmonBase = "/sys/class/hwmon/";
  try {
    for (auto& entry : fs::directory_iterator(hwmonBase)) {
      std::string name = readFileStr(entry.path().string() + "/name");
      if (name == "coretemp" || name == "k10temp" || name == "cpu_thermal") {
        double millideg = readFileDouble(entry.path().string() + "/temp1_input");
        if (millideg > 0) return millideg / 1000.0;
      }
    }
  } catch (...) {}

  // Last resort: any thermal_zone
  for (int i = 0; i < 20; i++) {
    std::ostringstream tempPath;
    tempPath << "/sys/class/thermal/thermal_zone" << i << "/temp";
    double millideg = readFileDouble(tempPath.str());
    if (millideg > 1000) return millideg / 1000.0;
  }

  return 0.0;
}

// ── RAM ─────────────────────────────────────────────────────────────

struct MemInfo {
  double totalGB = 0, usedGB = 0, availGB = 0;
  double swapTotalGB = 0, swapUsedGB = 0, swapFreeGB = 0;
  double memPercent = 0, swapPercent = 0;
};

static MemInfo getMemInfo() {
  MemInfo m;
  std::ifstream f("/proc/meminfo");
  std::string line;
  double memTotal = 0, memAvail = 0, swapTotal = 0, swapFree = 0;

  while (std::getline(f, line)) {
    std::istringstream ss(line);
    std::string key;
    double value;
    ss >> key >> value;
    if (key == "MemTotal:") memTotal = value;
    else if (key == "MemAvailable:") memAvail = value;
    else if (key == "SwapTotal:") swapTotal = value;
    else if (key == "SwapFree:") swapFree = value;
  }

  double gb = 1024.0 * 1024.0; // kB to GB
  m.totalGB = roundTo(memTotal / gb, 2);
  m.availGB = roundTo(memAvail / gb, 2);
  m.usedGB = roundTo((memTotal - memAvail) / gb, 2);
  m.swapTotalGB = roundTo(swapTotal / gb, 2);
  m.swapFreeGB = roundTo(swapFree / gb, 2);
  m.swapUsedGB = roundTo((swapTotal - swapFree) / gb, 2);
  m.memPercent = m.totalGB > 0 ? roundTo((m.usedGB / m.totalGB) * 100.0, 2) : 0;
  m.swapPercent = m.swapTotalGB > 0 ? roundTo((m.swapUsedGB / m.swapTotalGB) * 100.0, 2) : 0;
  return m;
}

// ── Disk ────────────────────────────────────────────────────────────

struct DiskInfo {
  std::string name;
  double totalGB = 0;
  double freeGB = 0;
  double throughputRead = 0;
  double throughputWrite = 0;
  double dataReadGB = 0;
  double dataWrittenGB = 0;
  double temperature = 0;
  std::string mountPoint;
  std::string device;
};

static std::vector<DiskInfo> getDisks(std::map<std::string, DiskPrev>& prevStats) {
  std::vector<DiskInfo> disks;
  auto now = std::chrono::steady_clock::now();

  // Read mounted filesystems
  std::ifstream mounts("/proc/mounts");
  std::string line;
  std::map<std::string, std::string> mountDevices; // mountpoint -> device

  while (std::getline(mounts, line)) {
    std::istringstream ss(line);
    std::string dev, mount, fstype;
    ss >> dev >> mount >> fstype;

    // Only real filesystems
    if (fstype == "ext4" || fstype == "xfs" || fstype == "btrfs" ||
        fstype == "ntfs" || fstype == "vfat" || fstype == "exfat" ||
        fstype == "f2fs" || fstype == "zfs") {
      mountDevices[mount] = dev;
    }
  }

  for (auto& [mount, dev] : mountDevices) {
    DiskInfo d;
    d.mountPoint = mount;
    d.device = dev;

    // Get disk name from device basename
    std::string devBase = dev.substr(dev.rfind('/') + 1);
    // Strip partition number to get block device (e.g., sda1 -> sda)
    std::string blockDev = devBase;
    while (!blockDev.empty() && std::isdigit(blockDev.back())) blockDev.pop_back();
    if (blockDev.empty()) blockDev = devBase;

    // Try to get model name
    std::string modelPath = "/sys/block/" + blockDev + "/device/model";
    d.name = readFileStr(modelPath);
    if (d.name.empty()) d.name = devBase;

    // Get space
    struct statvfs stat;
    if (statvfs(mount.c_str(), &stat) == 0) {
      d.totalGB = roundTo((double)stat.f_blocks * stat.f_frsize / (1024.0 * 1024.0 * 1024.0), 1);
      d.freeGB = roundTo((double)stat.f_bavail * stat.f_frsize / (1024.0 * 1024.0 * 1024.0), 1);
    }

    // Get throughput from /sys/block/*/stat
    std::string statPath = "/sys/block/" + blockDev + "/stat";
    std::string statStr = readFileStr(statPath);
    if (!statStr.empty()) {
      std::istringstream ss(statStr);
      unsigned long long readIOs, readMerges, readSectors, readTicks;
      unsigned long long writeIOs, writeMerges, writeSectors, writeTicks;
      ss >> readIOs >> readMerges >> readSectors >> readTicks
         >> writeIOs >> writeMerges >> writeSectors >> writeTicks;

      auto& prev = prevStats[blockDev];
      if (prev.lastTime.time_since_epoch().count() > 0) {
        double elapsed = std::chrono::duration<double>(now - prev.lastTime).count();
        if (elapsed > 0) {
          unsigned long long deltaRead = readSectors - prev.readSectors;
          unsigned long long deltaWrite = writeSectors - prev.writeSectors;
          d.throughputRead = (double)(deltaRead * 512) / elapsed;
          d.throughputWrite = (double)(deltaWrite * 512) / elapsed;
        }
      }

      d.dataReadGB = roundTo((double)(readSectors * 512) / 1e9, 1);
      d.dataWrittenGB = roundTo((double)(writeSectors * 512) / 1e9, 1);
      prev.readSectors = readSectors;
      prev.writeSectors = writeSectors;
      prev.lastTime = now;
    }

    // Temperature from hwmon (if available)
    try {
      std::string hwmonBase = "/sys/block/" + blockDev + "/device/hwmon/";
      if (fs::exists(hwmonBase)) {
        for (auto& entry : fs::directory_iterator(hwmonBase)) {
          double temp = readFileDouble(entry.path().string() + "/temp1_input");
          if (temp > 0) d.temperature = temp / 1000.0;
          break;
        }
      }
    } catch (...) {}

    disks.push_back(d);
  }

  return disks;
}

// ── Network ─────────────────────────────────────────────────────────

struct NetInterface {
  std::string name;
  std::string ipAddress;
  std::string macAddress;
  double throughputDownload = 0;
  double throughputUpload = 0;
  double downloadDataGB = 0;
  double uploadDataGB = 0;
};

static std::string getMacAddress(const std::string& iface) {
  return readFileStr("/sys/class/net/" + iface + "/address");
}

static std::string getIpAddress(const std::string& iface) {
  // Simple approach: parse from /proc/net/fib_trie or use ip command output
  // For reliability, read from the interface's inet address
  std::string cmd = "ip -4 addr show " + iface + " 2>/dev/null | grep -oP '(?<=inet )\\S+' | cut -d/ -f1 | head -1";
  FILE* pipe = popen(cmd.c_str(), "r");
  if (!pipe) return "0.0.0.0";
  char buf[128];
  std::string result;
  if (fgets(buf, sizeof(buf), pipe)) result = trim(buf);
  pclose(pipe);
  return result.empty() ? "0.0.0.0" : result;
}

static std::vector<NetInterface> getNetInterfaces(std::map<std::string, NetPrev>& prevStats, double elapsed) {
  std::vector<NetInterface> interfaces;

  std::ifstream f("/proc/net/dev");
  std::string line;
  std::getline(f, line); // header 1
  std::getline(f, line); // header 2

  while (std::getline(f, line)) {
    std::istringstream ss(line);
    std::string iface;
    ss >> iface;
    if (iface.back() == ':') iface.pop_back();

    // Skip loopback and virtual interfaces
    if (iface == "lo" || iface.substr(0, 4) == "veth" || iface.substr(0, 6) == "docker" ||
        iface.substr(0, 2) == "br" || iface.substr(0, 5) == "virbr") continue;

    unsigned long long rxBytes, rxPackets, rxErrs, rxDrop, rxFifo, rxFrame, rxCompressed, rxMulticast;
    unsigned long long txBytes, txPackets, txErrs, txDrop, txFifo, txColls, txCarrier, txCompressed;
    ss >> rxBytes >> rxPackets >> rxErrs >> rxDrop >> rxFifo >> rxFrame >> rxCompressed >> rxMulticast;
    ss >> txBytes >> txPackets >> txErrs >> txDrop >> txFifo >> txColls >> txCarrier >> txCompressed;

    // Skip inactive interfaces
    if (rxBytes == 0 && txBytes == 0) continue;

    NetInterface ni;
    ni.name = iface;
    ni.macAddress = getMacAddress(iface);
    ni.ipAddress = getIpAddress(iface);
    ni.downloadDataGB = roundTo((double)rxBytes / 1e9, 2);
    ni.uploadDataGB = roundTo((double)txBytes / 1e9, 2);

    auto& prev = prevStats[iface];
    if (prev.rxBytes > 0 && elapsed > 0) {
      ni.throughputDownload = (double)(rxBytes - prev.rxBytes) / elapsed;
      ni.throughputUpload = (double)(txBytes - prev.txBytes) / elapsed;
    }
    prev.rxBytes = rxBytes;
    prev.txBytes = txBytes;

    interfaces.push_back(ni);
  }

  return interfaces;
}

// ── System Info ─────────────────────────────────────────────────────

struct SystemInfo {
  std::string osName;
  std::string hostname;
  std::string motherboard;
  std::string biosVendor;
  std::string biosVersion;
  std::string biosDate;
};

static SystemInfo getSystemInfo() {
  SystemInfo si;

  // OS
  std::string prettyName;
  std::ifstream osRelease("/etc/os-release");
  std::string line;
  while (std::getline(osRelease, line)) {
    if (line.find("PRETTY_NAME=") == 0) {
      prettyName = line.substr(13);
      if (!prettyName.empty() && prettyName.front() == '"') prettyName.erase(0, 1);
      if (!prettyName.empty() && prettyName.back() == '"') prettyName.pop_back();
    }
  }

  struct utsname uts;
  std::string arch = "unknown";
  if (uname(&uts) == 0) {
    arch = uts.machine;
    if (arch == "x86_64") arch = "x64";
    else if (arch == "aarch64") arch = "arm64";
  }
  si.osName = (prettyName.empty() ? "Linux" : prettyName) + " " + arch;

  // Hostname
  char hostBuf[256];
  if (gethostname(hostBuf, sizeof(hostBuf)) == 0) si.hostname = hostBuf;

  // Motherboard
  si.motherboard = readFileStr("/sys/devices/virtual/dmi/id/board_name");
  if (si.motherboard.empty()) si.motherboard = "N/A";

  // BIOS
  si.biosVendor = readFileStr("/sys/devices/virtual/dmi/id/bios_vendor");
  si.biosVersion = readFileStr("/sys/devices/virtual/dmi/id/bios_version");
  si.biosDate = readFileStr("/sys/devices/virtual/dmi/id/bios_date");
  if (si.biosVendor.empty()) si.biosVendor = "N/A";
  if (si.biosVersion.empty()) si.biosVersion = "N/A";
  if (si.biosDate.empty()) si.biosDate = "N/A";

  return si;
}

// ── Battery ─────────────────────────────────────────────────────────

struct BatteryInfo {
  bool present = false;
  double chargeLevel = 0;
  double health = 0;
  double designCapacity = 0;
  double fullChargeCapacity = 0;
  double currentCapacity = 0;
  int cycleCount = 0;
};

static BatteryInfo getBatteryInfo() {
  BatteryInfo b;
  std::string base = "/sys/class/power_supply/";

  try {
    for (auto& entry : fs::directory_iterator(base)) {
      std::string type = readFileStr(entry.path().string() + "/type");
      if (type != "Battery") continue;

      b.present = true;
      double energyFull = readFileDouble(entry.path().string() + "/energy_full");
      double energyFullDesign = readFileDouble(entry.path().string() + "/energy_full_design");
      double energyNow = readFileDouble(entry.path().string() + "/energy_now");

      // Some systems use charge_* instead of energy_*
      if (energyFull == 0) {
        energyFull = readFileDouble(entry.path().string() + "/charge_full");
        energyFullDesign = readFileDouble(entry.path().string() + "/charge_full_design");
        energyNow = readFileDouble(entry.path().string() + "/charge_now");
      }

      if (energyFull > 0) {
        b.chargeLevel = roundTo((energyNow / energyFull) * 100.0, 1);
        b.health = roundTo((energyFull / energyFullDesign) * 100.0, 1);
      }

      b.designCapacity = roundTo(energyFullDesign / 1000.0, 1); // to mWh
      b.fullChargeCapacity = roundTo(energyFull / 1000.0, 1);
      b.currentCapacity = roundTo(energyNow / 1000.0, 1);

      std::string cycleStr = readFileStr(entry.path().string() + "/cycle_count");
      if (!cycleStr.empty()) {
        try { b.cycleCount = std::stoi(cycleStr); } catch (...) {}
      }

      break; // first battery only
    }
  } catch (...) {}

  return b;
}

// ═══════════════════════════════════════════════════════════════════
//   JSON OUTPUT BUILDER
// ═══════════════════════════════════════════════════════════════════

static std::string sensorArrayJson(const std::vector<Sensor>& sensors) {
  std::string out = "[";
  for (size_t i = 0; i < sensors.size(); i++) {
    if (i > 0) out += ",";
    out += sensors[i].toJson();
  }
  out += "]";
  return out;
}

static std::string buildJson(
    const std::string& cpuName, int physCores, int threads, double maxSpeedMHz,
    double maxLoad,
    const std::vector<Sensor>& cpuLoad,
    const std::vector<Sensor>& cpuClock,
    Sensor& cpuTemp,
    const MemInfo& mem,
    const std::vector<Sensor>& ramLoad,
    const std::vector<DiskInfo>& diskInfos,
    const std::vector<NetInterface>& netIfaces,
    const SystemInfo& sysInfo,
    const BatteryInfo& bat,
    const std::string& timestamp)
{
  std::ostringstream j;
  j << std::fixed << std::setprecision(2);

  j << "{";

  // ── CPU ──
  j << "\"cpu\":{";
  j << "\"name\":\"" << escapeJson(cpuName) << "\",";
  j << "\"maxLoad\":" << roundTo(maxLoad, 1) << ",";
  j << "\"load\":" << sensorArrayJson(cpuLoad) << ",";
  j << "\"clock\":" << sensorArrayJson(cpuClock) << ",";
  j << "\"temperature\":[" << cpuTemp.toJson() << "],";
  j << "\"voltage\":[],";
  j << "\"power\":[],";
  j << "\"info\":[{";
  j << "\"manufacturerName\":\"" << (cpuName.find("Intel") != std::string::npos ? "Intel" :
                                       cpuName.find("AMD") != std::string::npos ? "AMD" : "N/A") << "\",";
  j << "\"socketDesignation\":\"N/A\",";
  j << "\"currentSpeed\":" << roundTo(maxSpeedMHz / 1000.0, 2) << ",";
  j << "\"coreCount\":" << physCores << ",";
  j << "\"threadCount\":" << threads;
  j << "}]";
  j << "},";

  // ── RAM ──
  j << "\"ram\":{";
  j << "\"load\":" << sensorArrayJson(ramLoad) << ",";
  j << "\"info\":[],\"layout\":[]";
  j << "},";

  // ── GPU (stub — no NVML) ──
  j << "\"gpu\":{\"info\":\"N/A\",\"cards\":[]},";

  // ── System ──
  j << "\"system\":{";

  // OS
  j << "\"os\":{\"name\":\"" << escapeJson(sysInfo.osName) << "\","
    << "\"hostname\":\"" << escapeJson(sysInfo.hostname) << "\"},";

  // Storage
  j << "\"storage\":{\"disks\":[";
  for (size_t i = 0; i < diskInfos.size(); i++) {
    if (i > 0) j << ",";
    auto& d = diskInfos[i];
    j << "{\"name\":\"" << escapeJson(d.name) << "\","
      << "\"totalSpace\":" << d.totalGB << ","
      << "\"freeSpace\":" << d.freeGB << ","
      << "\"throughputRead\":" << roundTo(d.throughputRead, 1) << ","
      << "\"throughputWrite\":" << roundTo(d.throughputWrite, 1) << ","
      << "\"dataRead\":" << d.dataReadGB << ","
      << "\"dataWritten\":" << d.dataWrittenGB << ","
      << "\"temperature\":{\"name\":\"Temperature\",\"value\":" << d.temperature
      << ",\"min\":" << d.temperature << ",\"max\":" << d.temperature << "},"
      << "\"health\":\"N/A\"}";
  }
  j << "]},";

  // Network
  j << "\"network\":{\"interfaces\":[";
  for (size_t i = 0; i < netIfaces.size(); i++) {
    if (i > 0) j << ",";
    auto& n = netIfaces[i];
    j << "{\"name\":\"" << escapeJson(n.name) << "\","
      << "\"macAddress\":\"" << escapeJson(n.macAddress) << "\","
      << "\"ipAddress\":\"" << escapeJson(n.ipAddress) << "\","
      << "\"throughputDownload\":" << roundTo(n.throughputDownload, 1) << ","
      << "\"throughputUpload\":" << roundTo(n.throughputUpload, 1) << ","
      << "\"downloadData\":" << n.downloadDataGB << ","
      << "\"uploadData\":" << n.uploadDataGB << "}";
  }
  j << "]},";

  // Motherboard
  j << "\"motherboard\":{\"name\":\"" << escapeJson(sysInfo.motherboard) << "\"},";

  // BIOS
  j << "\"bios\":{\"vendor\":\"" << escapeJson(sysInfo.biosVendor) << "\","
    << "\"version\":\"" << escapeJson(sysInfo.biosVersion) << "\","
    << "\"date\":\"" << escapeJson(sysInfo.biosDate) << "\"},";

  // Battery
  j << "\"battery\":{";
  if (bat.present) {
    j << "\"present\":true,"
      << "\"cycleCount\":\"" << bat.cycleCount << "\","
      << "\"level\":[{\"name\":\"Charge level\",\"value\":" << bat.chargeLevel
      << ",\"min\":" << bat.chargeLevel << ",\"max\":" << bat.chargeLevel << "},"
      << "{\"name\":\"Health\",\"value\":" << bat.health
      << ",\"min\":" << bat.health << ",\"max\":" << bat.health << "}],"
      << "\"capacity\":[{\"name\":\"Design capacity\",\"value\":" << bat.designCapacity
      << ",\"min\":" << bat.designCapacity << ",\"max\":" << bat.designCapacity << "},"
      << "{\"name\":\"Full charge capacity\",\"value\":" << bat.fullChargeCapacity
      << ",\"min\":" << bat.fullChargeCapacity << ",\"max\":" << bat.fullChargeCapacity << "},"
      << "{\"name\":\"Remaining capacity\",\"value\":" << bat.currentCapacity
      << ",\"min\":" << bat.currentCapacity << ",\"max\":" << bat.currentCapacity << "}]";
  } else {
    j << "\"present\":false,\"cycleCount\":\"0\",\"level\":[],\"capacity\":[]";
  }
  j << "},";

  // SuperIO stub
  j << "\"superIO\":{\"name\":\"N/A\",\"fan\":[],\"fanControl\":[]}";

  j << "},"; // end system

  // Timestamp
  j << "\"timestamp\":\"" << timestamp << "\"";

  j << "}";
  return j.str();
}

// ═══════════════════════════════════════════════════════════════════
//   MAIN
// ═══════════════════════════════════════════════════════════════════

int main() {
  std::cerr << "Starting SysWatch Telemetry Engine..." << std::endl;

  // ── Init static info ──
  int coreCount = getCoreCount();
  std::string cpuName = getCpuName();
  int threadCount = getThreadCount();
  int physCoreCount = getPhysicalCoreCount();
  double maxSpeedMHz = getMaxCpuSpeedMHz();
  SystemInfo sysInfo = getSystemInfo();
  BatteryInfo batInfo = getBatteryInfo();

  // ── Init per-core sensors ──
  std::vector<Sensor> cpuLoad(coreCount);
  std::vector<Sensor> cpuClock(coreCount);
  Sensor cpuTemp;
  cpuTemp.init("Package", 0.0);

  for (int i = 0; i < coreCount; i++) {
    cpuLoad[i].init("Core #" + std::to_string(i), 0.0);
    cpuClock[i].init("Core #" + std::to_string(i), 0.0);
  }

  // ── Init RAM sensors ──
  std::vector<Sensor> ramLoad(6);
  ramLoad[0].init("Memory Used", 0.0);
  ramLoad[1].init("Memory Available", 0.0);
  ramLoad[2].init("Memory", 0.0);
  ramLoad[3].init("Virtual Memory Used", 0.0);
  ramLoad[4].init("Virtual Memory Available", 0.0);
  ramLoad[5].init("Virtual Memory", 0.0);

  // ── State for deltas ──
  auto prevCpuTimes = readAllCpuTimes(coreCount);
  std::map<std::string, NetPrev> netPrevStats;
  std::map<std::string, DiskPrev> diskPrevStats;

  bool firstRun = true;

  // ── First read to establish baselines ──
  std::this_thread::sleep_for(std::chrono::milliseconds(500));

  while (true) {
    auto loopStart = std::chrono::steady_clock::now();

    // ── CPU Usage ──
    auto currentCpuTimes = readAllCpuTimes(coreCount);
    double maxLoadVal = 0.0;

    // Aggregate
    {
      auto& prev = prevCpuTimes[0];
      auto& curr = currentCpuTimes[0];
      unsigned long long totalDelta = curr.total() - prev.total();
      unsigned long long activeDelta = curr.active() - prev.active();
      if (totalDelta > 0)
        maxLoadVal = (double)activeDelta / totalDelta * 100.0;
    }

    // Per-core
    for (int i = 0; i < coreCount; i++) {
      auto& prev = prevCpuTimes[i + 1];
      auto& curr = currentCpuTimes[i + 1];
      unsigned long long totalDelta = curr.total() - prev.total();
      unsigned long long activeDelta = curr.active() - prev.active();
      double usage = (totalDelta > 0) ? ((double)activeDelta / totalDelta * 100.0) : 0.0;
      cpuLoad[i].update(usage);

      double clock = getCoreClock(i);
      cpuClock[i].update(clock);
    }

    prevCpuTimes = currentCpuTimes;

    // ── CPU Temperature ──
    double temp = getCpuTemperature();
    if (temp > 0) cpuTemp.update(temp);

    // ── RAM ──
    MemInfo mem = getMemInfo();
    ramLoad[0].update(mem.usedGB);
    ramLoad[1].update(mem.availGB);
    ramLoad[2].update(mem.memPercent);
    ramLoad[3].update(mem.swapUsedGB);
    ramLoad[4].update(mem.swapFreeGB);
    ramLoad[5].update(mem.swapPercent);

    // ── Disks ──
    auto diskInfos = getDisks(diskPrevStats);

    // ── Network ──
    double elapsed = firstRun ? 1.0 : 1.0; // approx 1s per loop
    auto netIfaces = getNetInterfaces(netPrevStats, elapsed);

    // ── Battery (only on first run or every 60s) ──
    // Battery changes slowly, just read once at start
    // (already initialized above)

    // ── Build JSON ──
    std::string timestamp = getTimestamp();
    std::string json = buildJson(
      cpuName, physCoreCount, threadCount, maxSpeedMHz,
      maxLoadVal, cpuLoad, cpuClock, cpuTemp,
      mem, ramLoad,
      diskInfos, netIfaces,
      sysInfo, batInfo,
      timestamp
    );

    std::cout << json << std::endl;

    firstRun = false;

    // ── Wait ~1 second ──
    auto loopEnd = std::chrono::steady_clock::now();
    auto loopDuration = std::chrono::duration_cast<std::chrono::milliseconds>(loopEnd - loopStart);
    int sleepMs = 1000 - (int)loopDuration.count();
    if (sleepMs > 0)
      std::this_thread::sleep_for(std::chrono::milliseconds(sleepMs));
  }

  return 0;
}