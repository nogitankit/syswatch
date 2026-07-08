// ─── Sensor with min/max tracking ───────────────────────────────────

export interface Sensor {
  name: string;
  value: number;
  min: number;
  max: number;
}

// ─── CPU ────────────────────────────────────────────────────────────

export interface CpuInfo {
  manufacturerName: string;
  socketDesignation: string;
  currentSpeed: number;
  coreCount: number;
  threadCount: number;
}

export interface CpuData {
  name: string;
  maxLoad: number;
  load: Sensor[];
  clock: Sensor[];
  temperature: Sensor[];
  voltage: Sensor[];
  power: Sensor[];
  info: CpuInfo[];
}

// ─── GPU ────────────────────────────────────────────────────────────

export interface GpuCard {
  name: string;
  temperature: Sensor[];
  memory: Sensor[];
  maxLoad: number;
  load: Sensor[];
  clock: Sensor[];
  power: Sensor[];
  fan: Sensor[];
}

export interface GpuData {
  info: string;
  cards: GpuCard[];
}

// ─── RAM ────────────────────────────────────────────────────────────

export interface RamInfo {
  manufacturerName: string;
  configuredSpeed: number;
  configuredVoltage: number;
  size: number;
}

export interface RamData {
  load: Sensor[];
  info: RamInfo[];
  layout: RamInfo[];
}

// ─── Disk ───────────────────────────────────────────────────────────

export interface DiskData {
  name: string;
  totalSpace: number;
  freeSpace: number;
  throughputRead: number;
  throughputWrite: number;
  dataRead: number;
  dataWritten: number;
  temperature: Sensor;
  health: string;
}

// ─── Network ────────────────────────────────────────────────────────

export interface NetworkInterface {
  name: string;
  macAddress: string;
  ipAddress: string;
  throughputDownload: number;
  throughputUpload: number;
  downloadData: number;
  uploadData: number;
}

// ─── Battery ────────────────────────────────────────────────────────

export interface BatteryData {
  present: boolean;
  cycleCount: string;
  level: Sensor[];
  capacity: Sensor[];
}

// ─── System ─────────────────────────────────────────────────────────

export interface SystemData {
  os: { name: string; hostname?: string };
  storage: { disks: DiskData[] };
  network: { interfaces: NetworkInterface[] };
  motherboard: { name: string };
  bios: { vendor: string; version: string; date: string };
  battery: BatteryData;
  superIO: { name: string; fan: Sensor[]; fanControl: Sensor[] };
}

// ─── HardwareInfo (top-level) ───────────────────────────────────────

export interface HardwareInfo {
  cpu: CpuData;
  ram: RamData;
  gpu: GpuData;
  system: SystemData;
  timestamp: string;
}

// ─── WebSocket Message ──────────────────────────────────────────────

export interface TelemetryMessage {
  type: 'data' | 'initialData' | 'secondsData' | 'minutesData';
  data: HardwareInfo;
}

// ─── Dashboard-specific derived types ───────────────────────────────

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
