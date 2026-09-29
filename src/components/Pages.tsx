import type { SimState } from '../store/simulation';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn } from '../lib/utils';



// ─── Dashboard overview page ───────────────────────────────────────────────
export function DashboardPage({ state }: { state: SimState }) {
  const activeNodes = Object.values(state.nodes).filter(n => n.status !== 'OFFLINE').length;
  const criticalNodes = Object.values(state.nodes).filter(n => n.status === 'CRITICAL').length;
  const warningNodes = Object.values(state.nodes).filter(n => n.status === 'WARNING').length;
  const avgRisk = Math.round(Object.values(state.nodes).reduce((a, n) => a + n.aiRisk, 0) / 9);

  const kpis = [
    { label: 'Active Nodes', value: `${activeNodes}/9`, color: activeNodes < 9 ? 'text-[#E67E22]' : 'text-[#2E7D32]' },
    { label: 'Critical Sensors', value: criticalNodes, color: criticalNodes > 0 ? 'text-[#C62828]' : 'text-[#2E7D32]' },
    { label: 'Warning Sensors', value: warningNodes, color: warningNodes > 0 ? 'text-[#E67E22]' : 'text-[#2E7D32]' },
    { label: 'Avg AI Risk', value: `${avgRisk}%`, color: avgRisk > 60 ? 'text-[#C62828]' : avgRisk > 35 ? 'text-[#E67E22]' : 'text-[#2E7D32]' },
    { label: 'Gateway', value: 'ONLINE', color: 'text-[#2E7D32]' },
    { label: 'Internet', value: state.internet ? 'CONNECTED' : 'OFFLINE', color: state.internet ? 'text-[#2E7D32]' : 'text-[#C62828]' },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[#202428] mb-1">SYSTEM DASHBOARD</h2>
        <p className="text-[#8A939B] text-sm">Real-time overview of STRATAGUARD AI monitoring network</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-[#FFFFFF] border border-[#D9DDE1] rounded-xl p-5">
            <div className="text-xs text-[#8A939B] font-bold tracking-widest mb-2">{k.label.toUpperCase()}</div>
            <div className={cn('text-3xl font-black', k.color)}>{k.value.toString()}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#FFFFFF] border border-[#D9DDE1] rounded-xl p-5">
          <div className="text-xs text-[#8A939B] font-bold tracking-widest mb-4">DISPLACEMENT TREND (ALL SENSORS)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={state.displacementHistory}>
              <CartesianGrid strokeDasharray="2 4" stroke="#EEF0F2" vertical={false} />
              <XAxis dataKey="t" stroke="#D9DDE1" fontSize={9} tick={{ fill: '#8A939B' }} />
              <YAxis stroke="#D9DDE1" fontSize={9} tick={{ fill: '#8A939B' }} unit="mm" />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D9DDE1', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="val" stroke="#C62828" strokeWidth={2} fill="#C6282820" dot={false} name="Displacement" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D9DDE1] rounded-xl p-5">
          <div className="text-xs text-[#8A939B] font-bold tracking-widest mb-4">NODE RISK SCORES</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={Object.values(state.nodes).map(n => ({ id: n.id, risk: n.aiRisk, fill: n.aiRisk >= 76 ? '#C62828' : n.aiRisk >= 51 ? '#E67E22' : n.aiRisk >= 26 ? '#C9A227' : '#2E7D32' }))}>
              <CartesianGrid strokeDasharray="2 4" stroke="#EEF0F2" vertical={false} />
              <XAxis dataKey="id" stroke="#D9DDE1" fontSize={9} tick={{ fill: '#8A939B' }} />
              <YAxis stroke="#D9DDE1" fontSize={9} tick={{ fill: '#8A939B' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D9DDE1', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="risk" name="Risk Score" radius={[4, 4, 0, 0]}
                label={{ position: 'top', fill: '#8A939B', fontSize: 9 }}>
                {Object.values(state.nodes).map((n) => (
                  <rect key={n.id} fill={n.aiRisk >= 76 ? '#C62828' : n.aiRisk >= 51 ? '#E67E22' : n.aiRisk >= 26 ? '#C9A227' : '#2E7D32'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alert summary */}
      <div className="bg-[#FFFFFF] border border-[#D9DDE1] rounded-xl p-5">
        <div className="text-xs text-[#8A939B] font-bold tracking-widest mb-4">RECENT ALERTS</div>
        <div className="space-y-2">
          {state.alerts.slice(-4).reverse().map(a => (
            <div key={a.id} className="flex items-center gap-3 text-sm">
              <span className={cn('font-black text-xs w-16 text-right shrink-0',
                a.level === 'CRITICAL' ? 'text-[#C62828]' : a.level === 'WARNING' ? 'text-[#E67E22]' : 'text-[#202428]'
              )}>{a.level}</span>
              <span className="text-[#66707A]">{a.message}</span>
              <span className="text-[#8A939B] font-mono text-xs ml-auto shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sensor Network page ───────────────────────────────────────────────────
export function SensorNetworkPage({ state }: { state: SimState }) {
  const RISK_COLOR: Record<string, string> = {
    NORMAL: 'text-[#2E7D32]', WATCH: 'text-[#C9A227]',
    WARNING: 'text-[#E67E22]', CRITICAL: 'text-[#C62828]', OFFLINE: 'text-[#8A939B]',
  };

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#202428] mb-1">SENSOR NETWORK</h2>
          <p className="text-[#8A939B] text-sm">Self-healing LoRa mesh — 9 surface sensor nodes</p>
        </div>
        {state.nodeFailure && (
          <div className="px-4 py-2 bg-[#EEF0F2] border border-[#D9DDE1] rounded-lg text-[#202428] font-bold text-sm animate-pulse">
            🔄 SELF-HEALING ROUTE RECONFIGURED
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Object.values(state.nodes).map(n => (
          <div key={n.id} className={cn('bg-[#FFFFFF] border rounded-xl p-4 transition-all duration-500',
            n.status === 'CRITICAL' ? 'border-[#C62828]/40' :
            n.status === 'WARNING' ? 'border-[#E67E22]/40' :
            n.status === 'OFFLINE' ? 'border-[#D9DDE1]' : 'border-[#D9DDE1]'
          )}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-black text-[#202428]">{n.id}</span>
              <span className={cn('text-xs font-bold border px-2 py-0.5 rounded-full', RISK_COLOR[n.status],
                n.status === 'CRITICAL' ? 'border-[#C62828]' :
                n.status === 'OFFLINE' ? 'border-[#D9DDE1]' : 'border-current'
              )}>{n.status}</span>
            </div>

            {n.status === 'OFFLINE' ? (
              <div className="text-[#8A939B] text-sm text-center py-3">NODE OFFLINE</div>
            ) : (
              <div className="space-y-1.5 text-xs">
                {[
                  ['Battery', `${Math.round(n.battery)}%`, n.battery < 20 ? 'text-[#C62828]' : 'text-[#2E7D32]'],
                  ['Signal', `${Math.round(n.rssi)} dBm`, 'text-[#202428]'],
                  ['Packet Delivery', `${n.packetDelivery.toFixed(1)}%`, 'text-[#2E7D32]'],
                  ['Hop Count', n.id === 'S3' || n.id === 'S6' || n.id === 'S9' ? '1 (direct)' : '2', 'text-[#66707A]'],
                  ['Displacement', `${n.displacement.toFixed(1)} mm`, RISK_COLOR[n.status]],
                ].map(([k, v, c]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-[#8A939B]">{k}</span>
                    <span className={cn('font-bold', c as string)}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Risk page ─────────────────────────────────────────────────────────
export function AIRiskPage({ state }: { state: SimState }) {
  const node = state.nodes[state.selectedNode];
  const riskFactors = node ? [
    { label: 'Displacement trend', val: Math.min(1, node.displacement / 15) },
    { label: 'Displacement rate', val: Math.min(1, node.displacementRate / 2) },
    { label: 'Tilt variation', val: Math.min(1, node.tilt / 3) },
    { label: 'Tilt rate', val: Math.min(1, node.tiltRate / 0.03) },
    { label: 'Vibration anomaly', val: node.vibration },
    { label: 'Crack detection', val: node.crackDetected ? 1 : 0 },
    { label: 'Neighbour correlation', val: node.aiRisk > 50 ? 0.85 : 0.2 },
    { label: 'Persistence score', val: node.aiRisk > 30 ? 0.65 : 0.1 },
  ] : [];

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[#202428] mb-1">AI RISK ENGINE</h2>
        <p className="text-[#8A939B] text-sm">Demonstration AI Risk Engine — Simulated Data Only</p>
        <p className="text-xs text-[#C9A227] mt-1 border border-yellow-900/50 bg-[#C9A227]/10 px-3 py-1 rounded inline-block">
          This is a prototype risk assessment. Not validated for real mine safety decisions.
        </p>
      </div>

      {node && (
        <div className="grid grid-cols-2 gap-6">
          {/* Risk gauge */}
          <div className="bg-[#FFFFFF] border border-[#D9DDE1] rounded-xl p-6 flex flex-col items-center">
            <div className="text-xs text-[#8A939B] font-bold tracking-widest mb-4">CURRENT RISK — {node.id}</div>
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="44" stroke="#EEF0F2" strokeWidth="8" fill="none" />
                <circle
                  cx="50" cy="50" r="44"
                  stroke={node.aiRisk >= 76 ? '#C62828' : node.aiRisk >= 51 ? '#E67E22' : node.aiRisk >= 26 ? '#C9A227' : '#2E7D32'}
                  strokeWidth="8" fill="none"
                  strokeDasharray={`${(node.aiRisk / 100) * 276} 276`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-[#202428]">{node.aiRisk}</span>
                <span className="text-[#8A939B]">/100</span>
                <span className={cn('mt-2 font-black text-lg',
                  node.aiRisk >= 76 ? 'text-[#C62828]' : node.aiRisk >= 51 ? 'text-[#E67E22]' : 'text-[#C9A227]'
                )}>{node.status}</span>
              </div>
            </div>
            <div className="w-full grid grid-cols-4 gap-1 mt-4 text-center text-[10px]">
              {[['0-25', 'NORMAL', '#2E7D32'], ['26-50', 'WATCH', '#C9A227'], ['51-75', 'WARNING', '#E67E22'], ['76-100', 'CRITICAL', '#C62828']].map(([r, l, c]) => (
                <div key={l} className="py-1 rounded" style={{ border: `1px solid ${c}44`, color: c }}>
                  <div className="font-bold">{l}</div>
                  <div>{r}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk factors */}
          <div className="bg-[#FFFFFF] border border-[#D9DDE1] rounded-xl p-6">
            <div className="text-xs text-[#8A939B] font-bold tracking-widest mb-5">RISK CONTRIBUTING FACTORS</div>
            <div className="space-y-3">
              {riskFactors.map(f => {
                const pct = Math.round(f.val * 100);
                const color = pct > 75 ? '#C62828' : pct > 50 ? '#E67E22' : pct > 25 ? '#C9A227' : '#2E7D32';
                return (
                  <div key={f.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#66707A]">{f.label}</span>
                      <span className="font-bold" style={{ color }}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Architecture page ────────────────────────────────────────────────────
export function ArchitecturePage() {
  const layers = [
    { title: 'SURFACE SENSOR NODES', desc: 'ESP32/STM32 + IMU + Displacement + Vibration + LoRa', color: '#06b6d4' },
    { title: 'SELF-HEALING LoRa MESH', desc: 'Sub-GHz radio, multi-hop, automatic rerouting on node failure', color: '#3b82f6' },
    { title: 'EDGE GATEWAY', desc: 'Raspberry Pi — local MQTT broker, data aggregation', color: '#8b5cf6' },
    { title: 'LOCAL PROCESSING', desc: 'Spatial-temporal feature extraction from all 9 nodes', color: '#a78bfa' },
    { title: 'AI RISK ENGINE', desc: 'Subsidence risk assessment — displacement / tilt / vibration / correlation', color: '#E67E22' },
    { title: 'DIGITAL TWIN / GIS', desc: 'Real-time 3D visualization of mine state and risk zones', color: '#2E7D32' },
    { title: 'EARLY WARNING OUTPUT', desc: 'Local sirens, SMS/alerts, cloud dashboard — offline-first', color: '#C62828' },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-[#202428] mb-1">SYSTEM ARCHITECTURE</h2>
        <p className="text-[#8A939B] text-sm">End-to-end data flow from sensor to early warning</p>
      </div>
      <div className="max-w-2xl mx-auto">
        {layers.map((l, i) => (
          <div key={i} className="flex items-center gap-4 mb-2">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: l.color, backgroundColor: `${l.color}22` }} />
              {i < layers.length - 1 && <div className="w-px h-8 mt-1" style={{ backgroundColor: `${l.color}44` }} />}
            </div>
            <div className="flex-1 border rounded-xl p-4 mb-2" style={{ borderColor: `${l.color}33`, backgroundColor: `${l.color}08` }}>
              <div className="font-black text-sm mb-0.5" style={{ color: l.color }}>{l.title}</div>
              <div className="text-[#66707A] text-xs">{l.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto mt-8 border border-[#D9DDE1] rounded-xl p-5 bg-[#FFFFFF]">
        <div className="text-sm font-black text-[#202428] mb-3">POWER ARCHITECTURE (PROPOSED)</div>
        <div className="flex gap-4 text-xs text-[#66707A]">
          {['Solar Panel → Charge Controller → LiFePO4 Battery → Power Management IC → Low-Power Sensor Node'].map((step) =>
            step.split(' → ').map((part, i, arr) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-[#66707A] font-medium">{part}</span>
                {i < arr.length - 1 && <span className="text-[#66707A]">→</span>}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hardware page ────────────────────────────────────────────────────────
export function HardwarePage() {
  const hw = [
    { name: 'MCU', spec: 'ESP32 / STM32L4', purpose: 'Ultra-low power processing, sensor interfacing, LoRa control' },
    { name: 'IMU / TILT', spec: 'MPU-6050 / ADXL355', purpose: '6-DoF accelerometer + gyro for precise tilt measurement' },
    { name: 'DISPLACEMENT', spec: 'Draw-wire / LiDAR', purpose: 'Vertical settlement measurement (0–50 mm range)' },
    { name: 'VIBRATION', spec: 'MEMS Accelerometer', purpose: 'High-frequency vibration detection from blasting/shifting' },
    { name: 'CRACK SENSOR', spec: 'Strain gauge / Conductive', purpose: 'Localized surface fissure detection' },
    { name: 'LoRa MODULE', spec: 'SX1276 / SX1262', purpose: '868/915 MHz, long range, mesh capable, low power' },
    { name: 'BATTERY', spec: 'LiFePO4 18650 Pack', purpose: 'Long-life chemistry, safe in underground proximity' },
    { name: 'SOLAR', spec: '5–10 W Monocrystalline', purpose: 'Continuous unattended operation in open-cast area' },
    { name: 'ENCLOSURE', spec: 'IP67 NEMA-4X', purpose: 'All-weather, dust-proof, shockproof surface deployment' },
    { name: 'GATEWAY', spec: 'Raspberry Pi 4B', purpose: 'Local MQTT broker, edge AI inference, offline storage' },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-[#202428] mb-1">CONCEPTUAL HARDWARE</h2>
        <p className="text-[#8A939B] text-sm">Proposed component stack for real deployment — illustrative only</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {hw.map(h => (
          <div key={h.name} className="bg-[#FFFFFF] border border-[#D9DDE1] rounded-xl p-4 hover:border-cyan-800/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
              <div>
                <div className="text-xs font-black text-[#202428] tracking-widest">{h.name}</div>
                <div className="text-sm font-bold text-[#202428] mt-0.5">{h.spec}</div>
                <div className="text-xs text-[#8A939B] mt-1">{h.purpose}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alerts page ──────────────────────────────────────────────────────────
export function AlertsPage({ state }: { state: SimState }) {
  const LEVEL_STYLE: Record<string, string> = {
    CRITICAL: 'text-[#C62828] bg-[#C62828]/5 border-[#C62828]/50',
    WARNING: 'text-[#E67E22] bg-[#E67E22]/5 border-[#E67E22]/40',
    WATCH: 'text-[#C9A227] bg-[#C9A227]/5 border-[#C9A227]/40',
    INFO: 'text-[#202428] bg-[#EEF0F2] border-[#D9DDE1]',
    OFFLINE: 'text-[#66707A] bg-[#EEF0F2] border-[#D9DDE1]/50',
  };
  return (
    <div className="p-6 h-full overflow-y-auto space-y-3">
      <h2 className="text-2xl font-black text-[#202428] mb-4">ALERT & EVENT LOG</h2>
      {state.alerts.slice().reverse().map(a => (
        <div key={a.id} className={cn('flex items-start gap-4 px-4 py-3 rounded-xl border', LEVEL_STYLE[a.level] ?? LEVEL_STYLE.INFO)}>
          <span className="font-black text-sm w-20 shrink-0 mt-0.5">{a.level}</span>
          <span className="text-[#66707A] flex-1">{a.message}</span>
          <span className="text-[#8A939B] font-mono text-xs mt-0.5 shrink-0">{a.time}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Mine Panels page ────────────────────────────────────────────────────
export function MinePanelsPage({ state }: { state: SimState }) {
  const panels = [
    { id: 'P-01', sensors: ['S1', 'S2', 'S4', 'S5'], depth: '~200 m', status: 'NORMAL' },
    { id: 'P-02', sensors: ['S2', 'S3', 'S5', 'S6'], depth: '~220 m', status: state.stage >= 2 ? 'WATCH' : 'NORMAL' },
    { id: 'P-03', sensors: ['S4', 'S5', 'S6', 'S8'], depth: '~250 m', status: state.stage >= 5 ? 'CRITICAL' : state.stage >= 3 ? 'WARNING' : state.stage >= 1 ? 'WATCH' : 'NORMAL' },
    { id: 'P-04', sensors: ['S6', 'S7', 'S8', 'S9'], depth: '~230 m', status: 'NORMAL' },
  ];

  const COLORS: Record<string, string> = {
    NORMAL: 'text-[#2E7D32] border-[#2E7D32]/30 bg-[#2E7D32]/10',
    WATCH: 'text-[#C9A227] border-[#C9A227]/30 bg-[#C9A227]/10',
    WARNING: 'text-[#E67E22] border-[#E67E22]/30 bg-[#E67E22]/10',
    CRITICAL: 'text-[#C62828] border-[#C62828]/30 bg-[#C62828]/10',
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-black text-[#202428] mb-6">MINE PANELS</h2>
      <div className="grid grid-cols-2 gap-5">
        {panels.map(p => {
          const node = state.nodes['S5'];
          const isActive = p.id === 'P-03';
          return (
            <div key={p.id} className={cn('border rounded-xl p-5', COLORS[p.status])}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-black text-[#202428]">{p.id}</span>
                <span className={cn('text-xs font-black px-3 py-1 rounded-full border', COLORS[p.status])}>{p.status}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#8A939B]">Depth</span><span className="font-medium text-[#66707A]">{p.depth}</span></div>
                <div className="flex justify-between"><span className="text-[#8A939B]">Sensor Coverage</span><span className="font-medium text-[#66707A]">{p.sensors.join(', ')}</span></div>
                {isActive && node && (
                  <>
                    <div className="flex justify-between"><span className="text-[#8A939B]">Deformation</span><span className="font-bold text-[#E67E22]">{node.displacement.toFixed(1)} mm</span></div>
                    <div className="flex justify-between"><span className="text-[#8A939B]">Trend</span><span className={cn('font-bold', state.stage > 0 ? 'text-[#C62828]' : 'text-[#2E7D32]')}>{state.stage > 0 ? '↑ Increasing' : '→ Stable'}</span></div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
