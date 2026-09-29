export type RiskLevel = 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL' | 'OFFLINE';

export interface SensorData {
  id: string;
  x: number;
  y: number;
  displacement: number;
  displacementRate: number;
  tilt: number;
  vibration: number;
  crackDetected: boolean;
  battery: number;
  rssi: number;
  packetDelivery: number;
  status: RiskLevel;
}

export interface NetworkStatus {
  gatewayOnline: boolean;
  internetOnline: boolean;
  meshHealthy: boolean;
  activeNodes: number;
  totalNodes: number;
  averageBattery: number;
}

export interface SimulationState {
  isRunning: boolean;
  isInternetOutage: boolean;
  isPresentationMode: boolean;
  viewMode: 'SURFACE' | 'UNDERGROUND' | 'COMBINED';
  showSensors: boolean;
  showMesh: boolean;
  showHeatmap: boolean;
  failedNode: string | null;
  lowBatteryNode: string | null;
  deformationLevel: number; // 0 to 5 for progressive deformation
  alertLog: AlertEvent[];
  nodes: Record<string, SensorData>;
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  level: RiskLevel | 'INFO';
  message: string;
  source: string;
}
