#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <thread>
#include <chrono>

// read RAM usage from /proc/meminfo
void getRAMUsage(double &totalMem, double &freeMem) {
    std::ifstream file("/proc/meminfo");
    std::string line, key;
    double value;

    double memTotal = 0, memAvailable = 0;

    while (std::getline(file, line)) {
        std::stringstream ss(line);
        ss >> key >> value;
        //in KB
        if (key == "MemTotal:") memTotal = value; 
        if (key == "MemAvailable:") memAvailable = value;
    }
    
    totalMem = memTotal / 1024.0; // convert to MB
    freeMem = memAvailable / 1024.0;
}

// read CPU usage from /proc/stat
// calculates the delta between total time and idle time
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

void getCPUUsage(double &cpuPercent, double &userPercent, double &nicePercent, double &systemPercent,
                 double &idlePercent, double &iowaitPercent, double &irqPercent, double &softirqPercent,
                 double &stealPercent) {
    static CpuTimes lastTimes;
    
    std::ifstream file("/proc/stat");
    std::string cpu;
    CpuTimes currentTimes;
    
    file >> cpu >> currentTimes.user >> currentTimes.nice >> currentTimes.system >> currentTimes.idle
         >> currentTimes.iowait >> currentTimes.irq >> currentTimes.softirq >> currentTimes.steal;

    unsigned long long deltaUser = currentTimes.user - lastTimes.user;
    unsigned long long deltaNice = currentTimes.nice - lastTimes.nice;
    unsigned long long deltaSystem = currentTimes.system - lastTimes.system;
    unsigned long long deltaIdle = currentTimes.idle - lastTimes.idle;
    unsigned long long deltaIowait = currentTimes.iowait - lastTimes.iowait;
    unsigned long long deltaIrq = currentTimes.irq - lastTimes.irq;
    unsigned long long deltaSoftirq = currentTimes.softirq - lastTimes.softirq;
    unsigned long long deltaSteal = currentTimes.steal - lastTimes.steal;

    unsigned long long total = deltaUser + deltaNice + deltaSystem + deltaIdle + deltaIowait + deltaIrq + deltaSoftirq + deltaSteal;

    if (total > 0) {
        cpuPercent = (double)(deltaUser + deltaNice + deltaSystem + deltaIowait + deltaIrq + deltaSoftirq + deltaSteal) / total * 100.0;
        userPercent = (double)deltaUser / total * 100.0;
        nicePercent = (double)deltaNice / total * 100.0;
        systemPercent = (double)deltaSystem / total * 100.0;
        idlePercent = (double)deltaIdle / total * 100.0;
        iowaitPercent = (double)deltaIowait / total * 100.0;
        irqPercent = (double)deltaIrq / total * 100.0;
        softirqPercent = (double)deltaSoftirq / total * 100.0;
        stealPercent = (double)deltaSteal / total * 100.0;
    } else {
        cpuPercent = 0.0;
        userPercent = 0.0;
        nicePercent = 0.0;
        systemPercent = 0.0;
        idlePercent = 0.0;
        iowaitPercent = 0.0;
        irqPercent = 0.0;
        softirqPercent = 0.0;
        stealPercent = 0.0;
    }

    lastTimes = currentTimes;
}

int main() {
    std::cout << "Starting Telemetry Engine..." << std::endl;
    
    while (true) {
        double totalMem = 0, freeMem = 0, cpuPercent = 0;
        double userPercent = 0, nicePercent = 0, systemPercent = 0, idlePercent = 0;
        double iowaitPercent = 0, irqPercent = 0, softirqPercent = 0, stealPercent = 0;
        
        getRAMUsage(totalMem, freeMem);
        getCPUUsage(cpuPercent, userPercent, nicePercent, systemPercent, idlePercent, iowaitPercent, irqPercent, softirqPercent, stealPercent);
        double usedMem = totalMem - freeMem;

        // Generate JSON output
        std::cout << "{"
                  << "\"cpu_usage_percent\": " << cpuPercent << ", "
                  << "\"cpu_user_percent\": " << userPercent << ", "
                  << "\"cpu_nice_percent\": " << nicePercent << ", "
                  << "\"cpu_system_percent\": " << systemPercent << ", "
                  << "\"cpu_idle_percent\": " << idlePercent << ", "
                  << "\"cpu_iowait_percent\": " << iowaitPercent << ", "
                  << "\"cpu_irq_percent\": " << irqPercent << ", "
                  << "\"cpu_softirq_percent\": " << softirqPercent << ", "
                  << "\"cpu_steal_percent\": " << stealPercent << ", "
                  << "\"ram_total_mb\": " << totalMem << ", "
                  << "\"ram_used_mb\": " << usedMem
                  << "}" << std::endl;

        std::this_thread::sleep_for(std::chrono::milliseconds(1000));
    }
    return 0;
}