#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <thread>
#include <chrono>

//read RAM usage
//file: /proc/meminfo
void getRAM(double &totalMem, double &freeMem){
  std::ifstream file("/proc/meminfo");
  std::string line, key;
  double value;
  double memTotal = 0, memAvailable = 0;

  while(std::getline(file, line)){
    std::stringstream ss(line);
    ss >> key >> value;
    //in KB
    if(key == "MemTotal:") memTotal = value;
    if(key == "MemAvailable:") memAvailable = value;
  }
  //convert to MB
  totalMem = memTotal / 1024.0;
  freeMem = memAvailable / 1024.0;
}

//read CPU usage
//file: /proc/stat
struct CpuTimes {
  unsigned long long user = 0;
  unsigned long long nice = 0;
  unsigned long long system = 0;
  unsigned long long idle = 0;
  unsigned long long iowait = 0;
  unsigned long long irq = 0;
  unsigned long long softirq = 0;
  unsigned long long steal = 0;
};
void getCPU(double &cpuPercent){
  static CpuTimes lastTimes;

  std::ifstream file("/proc/stat");
  std::string cpu;
  CpuTimes currentTimes;
  file >> cpu >> currentTimes.user >> currentTimes.nice >> currentTimes.system >> currentTimes.idle
       >> currentTimes.iowait >> currentTimes.irq >> currentTimes.softirq >>currentTimes.steal;
  //calc differences 
  unsigned long long deltaUser = currentTimes.user - lastTimes.user;
  unsigned long long deltaNice = currentTimes.nice - lastTimes.nice;
  unsigned long long deltaSystem = currentTimes.system - lastTimes.system;
  unsigned long long deltaIdle = currentTimes.idle - lastTimes.idle;
  unsigned long long deltaIowait = currentTimes.iowait - lastTimes.iowait;
  unsigned long long deltaIrq = currentTimes.irq - lastTimes.irq;
  unsigned long long deltaSoftirq = currentTimes.softirq - lastTimes.softirq;
  unsigned long long deltaSteal = currentTimes.steal - lastTimes.steal;

  unsigned long long total = deltaUser + deltaNice + deltaSystem + deltaIdle + deltaIowait + deltaIrq + deltaSoftirq + deltaSteal;
  if(total > 0)
    cpuPercent = (double)(deltaUser + deltaNice + deltaSystem + deltaIowait + deltaIrq + deltaSoftirq + deltaSteal) / total * 100.0;
  else
    cpuPercent = 0.0;
  
  lastTimes = currentTimes;
}

int main(){
  std::cout<< "Starting Telemetry Engine..."<<std::endl;
  while(true){
    //important metrics
    double totalMem = 0, freeMem = 0, cpuPercent = 0;

    getRAM(totalMem, freeMem);
    getCPU(cpuPercent);
    double usedMem = totalMem - freeMem;
    
    //generate JSON output
    std::cout << "{"
              << "\"cpuPercent\":" << cpuPercent << ", "
              << "\"ramTotalMB\":" << totalMem << ", "
              << "\"ramUsedMB\":" << usedMem
              << "}" << std::endl;
    std::this_thread::sleep_for(std::chrono::milliseconds(1000));
  }
  return 0;
}