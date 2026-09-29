export type RiskLevel = 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
export type SimStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface NodeData {
  id: string;
  x: number; // grid col 0-2
  y: number; // grid row 0-2
  status: RiskLevel;
  battery: number;
  rssi: number;
  packetDelivery: number;
  displacement: number;
  displacementRate: number;
  tilt: number;
  tiltRate: number;
  vibration: number; // 0-1
  crackDetected: boolean;
  aiRisk: number; // 0-100
}

export interface Alert {
  id: string;
  time: string;
  level: RiskLevel | 'INFO';
  message: string;
}

export interface SimState {
  running: boolean;
  stage: SimStage;
  internet: boolean;
  syncing: boolean;
  syncDone: boolean;
  nodeFailure: boolean;
  presentationMode: boolean;
  selectedNode: string;
  selectedPanel: string;
  viewMode: 'SURFACE' | 'COMBINED' | 'UNDERGROUND';
  showSensors: boolean;
  showMesh: boolean;
  showHeatmap: boolean;
  nodes: Record<string, NodeData>;
  alerts: Alert[];
  displacementHistory: { t: string; val: number }[];
}

const t = () => new Date().toLocaleTimeString('en', { hour12: false });

function baseNodes(): Record<string, NodeData> {
  const grid = [
    ['S1',0,0], ['S2',1,0], ['S3',2,0],
    ['S4',0,1], ['S5',1,1], ['S6',2,1],
    ['S7',0,2], ['S8',1,2], ['S9',2,2],
  ] as [string, number, number][];

  const rec: Record<string, NodeData> = {};
  for (const [id, x, y] of grid) {
    rec[id] = {
      id, x, y,
      status: 'NORMAL',
      battery: 80 + Math.random() * 18,
      rssi: -60 - Math.random() * 20,
      packetDelivery: 97 + Math.random() * 2,
      displacement: 0.5 + Math.random() * 0.5,
      displacementRate: 0.02 + Math.random() * 0.05,
      tilt: 0.05 + Math.random() * 0.05,
      tiltRate: 0.001 + Math.random() * 0.002,
      vibration: 0.1 + Math.random() * 0.1,
      crackDetected: false,
      aiRisk: 5 + Math.floor(Math.random() * 10),
    };
  }
  return rec;
}

// epicenter distance from S5 (col=1, row=1)
function epicenterFactor(x: number, y: number): number {
  const dx = x - 1, dy = y - 1;
  const d = Math.sqrt(dx * dx + dy * dy); // 0 at center, √2 at corners
  return Math.max(0, 1 - d * 0.55);
}

export function buildStageNodes(stage: SimStage, nodeFailure: boolean): Record<string, NodeData> {
  const base = baseNodes();
  const factors = [0, 0.15, 0.35, 0.6, 0.8, 1.0];
  const f = factors[stage];

  for (const node of Object.values(base)) {
    if (nodeFailure && node.id === 'S5') {
      node.status = 'OFFLINE';
      node.battery = 0;
      node.aiRisk = 0;
      continue;
    }
    const ef = epicenterFactor(node.x, node.y);
    const fi = f * ef;

    node.displacement = +(0.5 + fi * 13.7 + Math.random() * 0.3).toFixed(1);
    node.displacementRate = +(0.02 + fi * 1.78 + Math.random() * 0.05).toFixed(2);
    node.tilt = +(0.05 + fi * 2.75 + Math.random() * 0.05).toFixed(2);
    node.tiltRate = +(0.001 + fi * 0.029 + Math.random() * 0.002).toFixed(3);
    node.vibration = Math.min(1, 0.1 + fi * 0.85);
    node.crackDetected = fi > 0.65;
    node.aiRisk = Math.min(100, Math.round(5 + fi * 77 + Math.random() * 5));
    node.battery = Math.max(5, node.battery - fi * 15);

    const r = node.aiRisk;
    if (node.id === 'S5' && stage >= 5) node.status = 'CRITICAL';
    else if (r >= 76) node.status = 'CRITICAL';
    else if (r >= 51) node.status = 'WARNING';
    else if (r >= 26) node.status = 'WATCH';
    else node.status = 'NORMAL';
  }
  return base;
}


export function initialState(): SimState {
  const nodes = buildStageNodes(0, false);
  return {
    running: false,
    stage: 0,
    internet: true,
    syncing: false,
    syncDone: false,
    nodeFailure: false,
    presentationMode: false,
    selectedNode: 'S5',
    selectedPanel: 'P-03',
    viewMode: 'COMBINED',
    showSensors: true,
    showMesh: true,
    showHeatmap: true,
    nodes,
    alerts: [{ id: 'a0', time: t(), level: 'INFO', message: 'All nodes operational — system nominal' }],
    displacementHistory: Array.from({ length: 12 }, (_, i) => ({
      t: `14:${(15 + i).toString().padStart(2, '0')}`,
      val: +(0.5 + Math.random() * 0.4).toFixed(2),
    })),
  };
}
