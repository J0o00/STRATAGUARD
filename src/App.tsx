import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import {
  Box, LayoutDashboard, Network, Shield, AlertTriangle,
  Grid, BarChart2, HardDrive, Wifi, WifiOff, Play,
  RefreshCw, Server, BatteryLow, Maximize2, Minimize2,
  Activity, Radio, Layers,
} from 'lucide-react';
import { initialState, buildStageNodes } from './store/simulation';
import type { SimState, SimStage } from './store/simulation';

// Lazy-load the 3D component
const DigitalTwin3D = lazy(() => import('./components/DigitalTwin3D'));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString('en', { hour12: false });

const RISK_COLOR: Record<string, string> = {
  NORMAL: '#4C9A5A', WATCH: '#C9A227', WARNING: '#D9822B',
  CRITICAL: '#C43D3D', OFFLINE: '#8A939B',
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState<SimState>(initialState());
  const [page, setPage] = useState('twin');
  const [clock, setClock] = useState(ts());
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const histTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setClock(ts()), 1000);
    return () => clearInterval(id);
  }, []);

  // Simulation ticker
  useEffect(() => {
    if (!state.running || state.stage >= 5) {
      if (simTimer.current) clearInterval(simTimer.current);
      return;
    }
    simTimer.current = setInterval(() => {
      setState(prev => {
        const newStage = Math.min(5, prev.stage + 1) as SimStage;
        const nodes = buildStageNodes(newStage, prev.nodeFailure);
        const stageAlerts: Record<number, { level: SimState['alerts'][0]['level']; msg: string }> = {
          1: { level: 'INFO',     msg: 'Early deformation signal detected at S5' },
          2: { level: 'WATCH',    msg: 'Increasing displacement trend at S5' },
          3: { level: 'WARNING',  msg: 'Neighbouring nodes S4/S6/S8 show correlated movement' },
          4: { level: 'WARNING',  msg: 'Rapid deformation detected — Panel P-03 at risk' },
          5: { level: 'CRITICAL', msg: 'CRITICAL: Subsidence risk threshold exceeded — early warning issued' },
        };
        const alert = stageAlerts[newStage];
        const newAlerts = alert
          ? [...prev.alerts, { id: Date.now().toString(), time: ts(), level: alert.level, message: alert.msg }]
          : prev.alerts;
        return { ...prev, stage: newStage, nodes, alerts: newAlerts };
      });
    }, 2500);
    return () => { if (simTimer.current) clearInterval(simTimer.current); };
  }, [state.running, state.stage, state.nodeFailure]);

  // Displacement history ticker
  useEffect(() => {
    histTimer.current = setInterval(() => {
      setState(prev => {
        const baseVal = prev.nodes['S5']?.displacement ?? 0.5;
        const newPt = { t: ts(), val: +(baseVal + (Math.random() - 0.3) * 0.4).toFixed(2) };
        const hist = [...prev.displacementHistory, newPt];
        if (hist.length > 20) hist.shift();
        return { ...prev, displacementHistory: hist };
      });
    }, 1500);
    return () => { if (histTimer.current) clearInterval(histTimer.current); };
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleStart = () => setState(prev => ({
    ...prev, running: true,
    alerts: [...prev.alerts, { id: Date.now().toString(), time: ts(), level: 'INFO', message: 'Subsidence simulation started — monitoring P-03 epicenter' }],
  }));

  const handleReset = () => setState({ ...initialState(), internet: state.internet });

  const handleNodeFailure = () => setState(prev => {
    const nodes = buildStageNodes(prev.stage, true);
    return {
      ...prev, nodeFailure: true, nodes,
      alerts: [...prev.alerts, { id: Date.now().toString(), time: ts(), level: 'INFO', message: 'S5 offline — self-healing mesh rerouted: S4→S8→S6' }],
    };
  });

  const handleLowBattery = () => setState(prev => {
    const nodes = { ...prev.nodes };
    if (nodes['S4']) nodes['S4'] = { ...nodes['S4'], battery: 8 };
    return {
      ...prev, nodes,
      alerts: [...prev.alerts, { id: Date.now().toString(), time: ts(), level: 'WARNING', message: 'S4 battery critical (8%) — MAINTENANCE REQUIRED' }],
    };
  });

  const handleInternetToggle = () => setState(prev => {
    const willBeOnline = !prev.internet;
    const alerts = [...prev.alerts];
    if (!prev.internet) {
      alerts.push({ id: Date.now().toString(), time: ts(), level: 'INFO', message: 'Internet restored — syncing stored events...' });
    } else {
      alerts.push({ id: Date.now().toString(), time: ts(), level: 'WARNING', message: 'Internet OFFLINE — LOCAL EDGE MODE active. Monitoring continues.' });
    }
    return { ...prev, internet: willBeOnline, alerts };
  });

  const handleSelectNode = (id: string) => setState(prev => ({ ...prev, selectedNode: id }));
  const patch = (p: Partial<SimState>) => setState(prev => ({ ...prev, ...p }));

  // ─── Computed ──────────────────────────────────────────────────────────────
  const activeNodes = Object.values(state.nodes).filter(n => n.status !== 'OFFLINE').length;
  const criticalCount = Object.values(state.nodes).filter(n => n.status === 'CRITICAL').length;
  const selectedNode = state.nodes[state.selectedNode] ?? null;
  const isPresentation = state.presentationMode;
  const stageColor = state.stage >= 5 ? '#C43D3D' : state.stage >= 3 ? '#D9822B' : state.stage >= 1 ? '#C9A227' : '#4C9A5A';

  const NAV_ITEMS = [
    { id: 'twin',   icon: Box,            label: 'Digital Twin' },
    { id: 'dash',   icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'net',    icon: Network,         label: 'Sensors' },
    { id: 'ai',     icon: Shield,          label: 'AI Risk' },
    { id: 'alerts', icon: AlertTriangle,   label: 'Alerts' },
    { id: 'panels', icon: Grid,            label: 'Mine Panels' },
    { id: 'arch',   icon: BarChart2,       label: 'Architecture' },
    { id: 'hw',     icon: HardDrive,       label: 'Hardware' },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#1a2332' }}>

      {/* ── Full-screen 3D Digital Twin background ──────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Suspense fallback={
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#1a2332' }}>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
              <div style={{ width:40, height:40, border:'2px solid rgba(255,255,255,0.2)', borderTop:'2px solid rgba(255,255,255,0.8)', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 12px' }} />
              <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase' }}>Loading Digital Twin</div>
            </div>
          </div>
        }>
          <DigitalTwin3D
            state={state}
            selectedNode={state.selectedNode}
            onSelectNode={handleSelectNode}
          />
        </Suspense>
      </div>

      {/* ── UI Layer (all floating glass) ───────────────────────────────── */}
      {!isPresentation && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>

          {/* ─ TOP STATUS BAR ─────────────────────────────────────────────── */}
          <TopStatusBar
            clock={clock}
            internet={state.internet}
            activeNodes={activeNodes}
            criticalCount={criticalCount}
            stage={state.stage}
            stageColor={stageColor}
            onInternetToggle={handleInternetToggle}
          />

          {/* ─ LEFT NAV ───────────────────────────────────────────────────── */}
          <LeftNav page={page} setPage={setPage} navItems={NAV_ITEMS} />

          {/* ─ VIEW CONTROLS (only on twin page) ─────────────────────────── */}
          {page === 'twin' && (
            <ViewControls state={state} patch={patch} />
          )}

          {/* ─ RIGHT SENSOR PANEL (only on twin page) ────────────────────── */}
          {page === 'twin' && selectedNode && (
            <RightSensorPanel node={selectedNode} />
          )}

          {/* ─ BOTTOM ANALYTICS BAR (only on twin page) ──────────────────── */}
          {page === 'twin' && (
            <BottomAnalyticsBar state={state} />
          )}

          {/* ─ OFFLINE BADGE ─────────────────────────────────────────────── */}
          {!state.internet && <OfflineBadge />}

          {/* ─ NODE FAILURE BADGE ────────────────────────────────────────── */}
          {state.nodeFailure && <SelfHealBadge />}

          {/* ─ PAGE OVERLAY (all non-twin pages) ────────────────────────── */}
          {page !== 'twin' && (
            <PageOverlay page={page} state={state} />
          )}

          {/* ─ SIM CONTROLS BAR ──────────────────────────────────────────── */}
          <SimBar
            running={state.running}
            stage={state.stage}
            nodeFailure={state.nodeFailure}
            stageColor={stageColor}
            onStart={handleStart}
            onReset={handleReset}
            onNodeFailure={handleNodeFailure}
            onLowBattery={handleLowBattery}
            onTogglePresentation={() => patch({ presentationMode: true })}
          />

        </div>
      )}

      {/* ── Presentation mode exit ───────────────────────────────────────── */}
      {isPresentation && (
        <button
          onClick={() => patch({ presentationMode: false })}
          style={{
            position:'absolute', bottom:20, right:20, zIndex:100,
            pointerEvents:'auto',
          }}
          className="glass float-btn"
        >
          <Minimize2 size={14} /> EXIT PRESENTATION
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP STATUS BAR
// ─────────────────────────────────────────────────────────────────────────────
function TopStatusBar({ clock, internet, activeNodes, criticalCount, stage, stageColor, onInternetToggle }: any) {
  const indicators = [
    { label: 'SYSTEM',  value: 'ACTIVE',  color: '#4C9A5A', icon: Activity },
    { label: 'GATEWAY', value: 'ONLINE',  color: '#4C9A5A', icon: Server },
    { label: 'NETWORK', value: 'HEALTHY', color: '#4C9A5A', icon: Radio },
    { label: 'INTERNET', value: internet ? 'ONLINE' : 'OFFLINE', color: internet ? '#4C9A5A' : '#C43D3D', icon: internet ? Wifi : WifiOff },
    { label: 'NODES', value: `${activeNodes}/9`, color: activeNodes < 9 ? '#D9822B' : '#4C9A5A', icon: Layers },
  ];

  return (
    <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 pointer-events-auto z-20 w-[96vw] md:w-auto anim-fade-up">
      <div className="glass rounded-[18px] px-3 py-2 md:px-5 md:py-[10px] flex items-center gap-3 md:gap-5 overflow-x-auto hide-scrollbar [&>*]:shrink-0">
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'#202428', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Activity size={14} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:800, color:'#202428', letterSpacing:'0.06em', lineHeight:1 }}>STRATAGUARD AI</div>
            <div style={{ fontSize:9, color:'#667078', fontWeight:600, letterSpacing:'0.08em' }}>MINE SUBSIDENCE MONITORING</div>
          </div>
        </div>

        <div style={{ width:1, height:28, background:'rgba(0,0,0,0.1)' }} />

        {/* Status indicators */}
        {indicators.map(({ label, value, color }) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }} className="pulse-dot" />
            <div>
              <div style={{ fontSize:8, color:'#8A939B', fontWeight:700, letterSpacing:'0.1em', lineHeight:1 }}>{label}</div>
              <div style={{ fontSize:10, fontWeight:700, color, lineHeight:1.4 }}>{value}</div>
            </div>
          </div>
        ))}

        {/* Critical zones */}
        {criticalCount > 0 && (
          <>
            <div style={{ width:1, height:28, background:'rgba(0,0,0,0.1)' }} />
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#C43D3D', animation:'pulseDot 0.8s ease-in-out infinite' }} />
              <div style={{ fontSize:10, fontWeight:700, color:'#C43D3D' }}>{criticalCount} CRITICAL</div>
            </div>
          </>
        )}

        {/* Stage pill */}
        {stage > 0 && (
          <>
            <div style={{ width:1, height:28, background:'rgba(0,0,0,0.1)' }} />
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:99, background:`${stageColor}18`, border:`1px solid ${stageColor}40` }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:stageColor }} />
              <div style={{ fontSize:9, fontWeight:800, color:stageColor, letterSpacing:'0.1em' }}>
                {stage >= 5 ? 'CRITICAL EVENT' : stage >= 3 ? 'WARNING ACTIVE' : 'SIM RUNNING'}
              </div>
            </div>
          </>
        )}

        <div style={{ width:1, height:28, background:'rgba(0,0,0,0.1)' }} />

        {/* Internet toggle */}
        <button
          onClick={onInternetToggle}
          style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:8, transition:'background 0.2s' }}
          className="glass-hover"
        >
          {internet ? <Wifi size={12} color="#4C9A5A" /> : <WifiOff size={12} color="#C43D3D" />}
          <span style={{ fontSize:9, fontWeight:700, color:internet?'#4C9A5A':'#C43D3D', letterSpacing:'0.08em' }}>
            {internet ? 'ONLINE' : 'OFFLINE'}
          </span>
        </button>

        <div style={{ width:1, height:28, background:'rgba(0,0,0,0.1)' }} />

        {/* Clock */}
        <div style={{ fontSize:13, fontWeight:700, color:'#202428', fontVariantNumeric:'tabular-nums', letterSpacing:'0.04em' }}>{clock}</div>
      </div>

      {/* Badge */}
      <div style={{ textAlign:'center', marginTop:6 }}>
        <span style={{ fontSize:8, color:'rgba(255,255,255,0.55)', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase',
          padding:'2px 8px', borderRadius:99, background:'rgba(0,0,0,0.18)' }}>
          VIRTUAL PROTOTYPE · SIMULATED DATA
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEFT NAV
// ─────────────────────────────────────────────────────────────────────────────
function LeftNav({ page, setPage, navItems }: any) {
  return (
    <div className="absolute left-1/2 bottom-2 md:bottom-auto md:left-4 -translate-x-1/2 md:-translate-x-0 md:top-1/2 md:-translate-y-1/2 pointer-events-auto z-20 anim-slide-right w-[96vw] md:w-auto overflow-x-auto hide-scrollbar">
      <div className="glass rounded-[20px] px-2 py-2 md:px-[6px] md:py-[8px] flex flex-row md:flex-col gap-2 md:gap-2">
        {navItems.map(({ id, icon: Icon, label }: any) => (
          <button
            key={id}
            title={label}
            onClick={() => setPage(id)}
            className={`nav-icon${page === id ? ' active' : ''}`}
            style={{ pointerEvents:'auto' }}
          >
            <Icon size={16} />
          </button>
        ))}

        <div className="hidden md:block w-full h-[1px] bg-black/10 my-1" />

        {/* Tagline vertical */}
        <div className="hidden md:block" style={{ writingMode:'vertical-rl', textOrientation:'mixed', fontSize:7, fontWeight:700, letterSpacing:'0.14em', color:'rgba(255,255,255,0.55)', textAlign:'center', padding:'4px 2px', userSelect:'none' }}>
          SENSE · ANALYSE · WARN
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW CONTROLS (Twin page only)
// ─────────────────────────────────────────────────────────────────────────────
function ViewControls({ state, patch }: any) {
  const views = ['SURFACE', 'COMBINED', 'UNDERGROUND'];
  const toggles = [
    { key:'showSensors', label:'Sensors' },
    { key:'showMesh',    label:'Mesh' },
    { key:'showHeatmap', label:'Heatmap' },
  ];
  return (
    <div className="absolute top-[80px] md:top-[90px] left-4 md:left-[72px] pointer-events-auto z-20 flex flex-col gap-[6px] anim-fade-in">
      {/* View mode */}
      <div className="glass" style={{ borderRadius:99, padding:'4px 6px', display:'flex', gap:2 }}>
        {views.map(v => (
          <button key={v} onClick={() => patch({ viewMode: v as any })} className={`view-pill${state.viewMode === v ? ' active' : ''}`}>
            {v}
          </button>
        ))}
      </div>
      {/* Layer toggles */}
      <div style={{ display:'flex', gap:6 }}>
        {toggles.map(({ key, label }) => {
          const on = state[key as keyof typeof state] as boolean;
          return (
            <button key={key} onClick={() => patch({ [key]: !on } as any)}
              className="glass"
              style={{ borderRadius:99, padding:'3px 12px', fontSize:10, fontWeight:700, cursor:'pointer', border:'none',
                color: on ? '#202428' : 'rgba(255,255,255,0.5)', background: on ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)', pointerEvents:'auto', transition:'all 0.2s' }}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIGHT SENSOR PANEL
// ─────────────────────────────────────────────────────────────────────────────
function RightSensorPanel({ node }: { node: any }) {
  const RISK_COLORS: Record<string, string> = {
    NORMAL:'#4C9A5A', WATCH:'#C9A227', WARNING:'#D9822B', CRITICAL:'#C43D3D', OFFLINE:'#8A939B',
  };
  const rc = RISK_COLORS[node.status] ?? '#8A939B';
  const vibLabel = node.vibration > 0.7 ? 'HIGH' : node.vibration > 0.4 ? 'MODERATE' : 'LOW';
  const isOffline = node.status === 'OFFLINE';

  const riskFactors = [
    { label: 'Displacement', val: Math.min(1, node.displacement / 15) },
    { label: 'Tilt',         val: Math.min(1, node.tilt / 3) },
    { label: 'Vibration',    val: node.vibration },
    { label: 'Correlation',  val: node.aiRisk > 50 ? 0.8 : 0.2 },
    { label: 'Persistence',  val: node.aiRisk > 30 ? 0.65 : 0.15 },
  ];

  const barColor = (val: number) =>
    val > 0.75 ? '#C43D3D' : val > 0.5 ? '#D9822B' : val > 0.25 ? '#C9A227' : '#4C9A5A';

  return (
    <div className="absolute right-4 top-[100px] md:top-1/2 md:-translate-y-1/2 pointer-events-auto z-20 w-[200px] md:w-[220px] scale-[0.85] md:scale-100 origin-top-right md:origin-right anim-slide-left">
      <div className="glass" style={{ borderRadius:20, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid rgba(0,0,0,0.06)', background:`${rc}08` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <div style={{ fontSize:9, color:'#667078', fontWeight:700, letterSpacing:'0.1em' }}>SELECTED NODE</div>
            <div style={{ fontSize:8, fontWeight:800, color:rc, background:`${rc}18`, padding:'2px 7px', borderRadius:99, border:`1px solid ${rc}40`, letterSpacing:'0.08em' }}>
              {node.status}
            </div>
          </div>
          <div style={{ fontSize:32, fontWeight:900, color:'#202428', lineHeight:1 }}>{node.id}</div>
        </div>

        {isOffline ? (
          <div style={{ padding:'20px 16px', textAlign:'center', color:'#8A939B', fontSize:12 }}>Node offline — no data</div>
        ) : (
          <>
            {/* Telemetry grid */}
            <div style={{ padding:'10px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {[
                { k:'BATTERY', v:`${Math.round(node.battery)}%`, c: node.battery < 20 ? '#C43D3D' : '#4C9A5A' },
                { k:'SIGNAL',  v:`${Math.round(node.rssi)} dBm`, c:'#667078' },
                { k:'PACKET',  v:`${node.packetDelivery.toFixed(1)}%`, c:'#4C9A5A' },
                { k:'STATUS',  v:'LIVE', c:'#4C9A5A' },
              ].map(({ k, v, c }) => (
                <div key={k} style={{ background:'rgba(255,255,255,0.5)', borderRadius:10, padding:'7px 9px', border:'1px solid rgba(255,255,255,0.6)' }}>
                  <div style={{ fontSize:8, color:'#8A939B', fontWeight:700, letterSpacing:'0.1em', marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Sensor readings */}
            <div style={{ padding:'0 12px 10px', display:'flex', flexDirection:'column', gap:4 }}>
              {[
                { k:'DISPLACEMENT', v:`${node.displacement.toFixed(1)} mm`, sub:`+${node.displacementRate.toFixed(2)} mm/hr`, c:rc },
                { k:'TILT',         v:`${node.tilt.toFixed(2)}°`,           sub:`+${node.tiltRate.toFixed(3)}°/hr`,          c:'#C9A227' },
                { k:'VIBRATION',    v:vibLabel,  sub:'',  c: node.vibration > 0.6 ? '#C43D3D':'#C9A227' },
                { k:'CRACK',        v: node.crackDetected ? 'DETECTED':'CLEAR', sub:'', c: node.crackDetected?'#C43D3D':'#4C9A5A' },
              ].map(({ k, v, sub, c }) => (
                <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.45)', borderRadius:8, padding:'5px 9px', border:'1px solid rgba(255,255,255,0.55)' }}>
                  <div style={{ fontSize:8, color:'#667078', fontWeight:700, letterSpacing:'0.08em' }}>{k}</div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:c }}>{v}</div>
                    {sub && <div style={{ fontSize:8, color:'#D9822B', fontWeight:600 }}>{sub}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Risk */}
            <div style={{ padding:'0 12px 14px' }}>
              <div style={{ background:'rgba(255,255,255,0.45)', borderRadius:12, padding:'10px', border:'1px solid rgba(255,255,255,0.55)' }}>
                <div style={{ fontSize:8, color:'#8A939B', fontWeight:700, letterSpacing:'0.1em', marginBottom:8 }}>AI RISK ASSESSMENT</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  {/* Gauge */}
                  <div style={{ position:'relative', width:48, height:48, flexShrink:0 }}>
                    <svg viewBox="0 0 48 48" style={{ width:48, height:48, transform:'rotate(-90deg)' }}>
                      <circle cx="24" cy="24" r="19" stroke="rgba(0,0,0,0.08)" strokeWidth="5" fill="none" />
                      <circle cx="24" cy="24" r="19" stroke={rc} strokeWidth="5" fill="none"
                        strokeDasharray={`${(node.aiRisk/100)*119} 119`} strokeLinecap="round"
                        style={{ transition:'stroke-dasharray 0.7s ease' }} />
                    </svg>
                    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                      <div style={{ fontSize:12, fontWeight:900, color:'#202428', lineHeight:1 }}>{node.aiRisk}</div>
                      <div style={{ fontSize:7, color:'#8A939B' }}>/100</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'#8A939B', marginBottom:2 }}>RISK LEVEL</div>
                    <div style={{ fontSize:15, fontWeight:900, color:rc }}>{node.status}</div>
                  </div>
                </div>
                {riskFactors.map(f => {
                  const pct = Math.round(f.val * 100);
                  const c = barColor(f.val);
                  return (
                    <div key={f.label} style={{ marginBottom:5 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                        <span style={{ fontSize:8, color:'#667078', fontWeight:600 }}>{f.label}</span>
                        <span style={{ fontSize:8, fontWeight:700, color:c }}>{pct}%</span>
                      </div>
                      <div className="risk-bar-track">
                        <div className="risk-bar-fill" style={{ width:`${pct}%`, background:c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM ANALYTICS BAR
// ─────────────────────────────────────────────────────────────────────────────
function BottomAnalyticsBar({ state }: { state: SimState }) {
  const node = state.nodes[state.selectedNode];
  const activeNodes = Object.values(state.nodes).filter(n => n.status !== 'OFFLINE').length;
  const critAlerts = state.alerts.filter(a => a.level === 'CRITICAL' || a.level === 'WARNING').length;
  const lastAlerts = state.alerts.slice(-3).reverse();

  // Mini sparkline
  const hist = state.displacementHistory;
  const maxV = Math.max(...hist.map(p => p.val), 1);
  const pts = hist.map((p, i) => {
    const x = (i / (hist.length - 1 || 1)) * 140;
    const y = 30 - (p.val / maxV) * 26;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="absolute bottom-[64px] left-1/2 -translate-x-1/2 pointer-events-auto z-20 flex flex-row gap-2 md:gap-[10px] anim-fade-up w-[96vw] md:w-auto overflow-x-auto hide-scrollbar">

      {/* Displacement mini chart */}
      <div className="glass shrink-0" style={{ borderRadius:16, padding:'10px 14px', minWidth:180 }}>
        <div style={{ fontSize:8, color:'#667078', fontWeight:700, letterSpacing:'0.1em', marginBottom:6 }}>DISPLACEMENT TREND</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:10 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'#202428', lineHeight:1 }}>
              {node?.displacement.toFixed(1) ?? '—'}<span style={{ fontSize:10, fontWeight:500, color:'#667078' }}> mm</span>
            </div>
            <div style={{ fontSize:8, color: node && node.displacementRate > 0.5 ? '#D9822B' : '#4C9A5A', fontWeight:600, marginTop:2 }}>
              +{node?.displacementRate.toFixed(2)} mm/hr
            </div>
          </div>
          <svg width="140" height="32" style={{ flex:1 }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C43D3D" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#C43D3D" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline points={pts} fill="none" stroke="#C43D3D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Risk summary */}
      <div className="glass shrink-0" style={{ borderRadius:16, padding:'10px 16px', minWidth:110, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:8, color:'#667078', fontWeight:700, letterSpacing:'0.1em', marginBottom:4 }}>AI RISK</div>
        <div style={{ fontSize:28, fontWeight:900, color: RISK_COLOR[node?.status ?? 'NORMAL'], lineHeight:1 }}>
          {node?.aiRisk ?? 0}
        </div>
        <div style={{ fontSize:8, color:'#8A939B' }}>/100 · {node?.status ?? 'NORMAL'}</div>
      </div>

      {/* Alerts summary */}
      <div className="glass shrink-0" style={{ borderRadius:16, padding:'10px 14px', minWidth:200, maxWidth:240 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <div style={{ fontSize:8, color:'#667078', fontWeight:700, letterSpacing:'0.1em' }}>RECENT ALERTS</div>
          {critAlerts > 0 && <span style={{ fontSize:9, fontWeight:700, color:'#C43D3D', background:'rgba(196,61,61,0.12)', padding:'1px 7px', borderRadius:99 }}>{critAlerts} active</span>}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {lastAlerts.length === 0 ? (
            <div style={{ fontSize:10, color:'#8A939B' }}>No alerts</div>
          ) : lastAlerts.map(a => {
            const ac = a.level === 'CRITICAL' ? '#C43D3D' : a.level === 'WARNING' ? '#D9822B' : a.level === 'WATCH' ? '#C9A227' : '#667078';
            return (
              <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:6 }} className="anim-alert">
                <div style={{ width:4, height:4, borderRadius:'50%', background:ac, marginTop:4, flexShrink:0 }} />
                <div style={{ fontSize:9, color:'#202428', lineHeight:1.4, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.message}</div>
                <div style={{ fontSize:8, color:'#8A939B', flexShrink:0 }}>{a.time}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Network health */}
      <div className="glass shrink-0" style={{ borderRadius:16, padding:'10px 16px', minWidth:120, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:8, color:'#667078', fontWeight:700, letterSpacing:'0.1em', marginBottom:4 }}>NETWORK</div>
        <div style={{ fontSize:24, fontWeight:800, color:'#4C9A5A', lineHeight:1 }}>{Math.round(activeNodes/9*100)}%</div>
        <div style={{ fontSize:8, color:'#8A939B', marginTop:2 }}>{activeNodes}/9 nodes</div>
        {state.nodeFailure && (
          <div style={{ fontSize:8, color:'#D9822B', fontWeight:700, marginTop:4, textAlign:'center' }}>SELF-HEALING ACTIVE</div>
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIM BAR
// ─────────────────────────────────────────────────────────────────────────────
function SimBar({ running, stage, nodeFailure, stageColor, onStart, onReset, onNodeFailure, onLowBattery, onTogglePresentation }: any) {
  const STAGE_LABELS = ['NORMAL', 'DEFORMATION', 'INCREASING', 'ANOMALY', 'WARNING', 'CRITICAL'];
  return (
    <div className="absolute bottom-16 md:bottom-[12px] left-1/2 -translate-x-1/2 pointer-events-auto z-20 w-[96vw] md:w-auto overflow-x-auto hide-scrollbar anim-fade-up">
      <div className="glass rounded-full px-3 py-1.5 md:px-[14px] md:py-[6px] flex items-center gap-2 md:gap-[10px] w-max mx-auto shrink-0 [&>*]:shrink-0">

        {/* Stage pips */}
        <div style={{ display:'flex', gap:3, alignItems:'center' }}>
          {STAGE_LABELS.map((label, i) => (
            <div key={i} title={label} className={`stage-pip${i <= stage ? ` active-${i}` : ''}`} />
          ))}
          <span style={{ fontSize:9, fontWeight:700, color: stageColor, marginLeft:4, letterSpacing:'0.08em' }}>
            {STAGE_LABELS[stage]}
          </span>
        </div>

        <div style={{ width:1, height:20, background:'rgba(0,0,0,0.1)' }} />

        {/* Start/running button */}
        <button onClick={onStart} disabled={running && stage >= 5} className="float-btn float-btn-primary"
          style={{ fontSize:11, padding:'6px 16px', opacity: running && stage >= 5 ? 0.5 : 1, pointerEvents:'auto' }}>
          <Play size={12} />
          {running && stage < 5 ? 'SIMULATION RUNNING...' : stage >= 5 ? 'CRITICAL REACHED' : 'START SUBSIDENCE SIMULATION'}
        </button>

        <button onClick={onReset} className="float-btn float-btn-outline" style={{ fontSize:11, padding:'6px 12px', pointerEvents:'auto' }}>
          <RefreshCw size={12} /> RESET
        </button>

        <div style={{ width:1, height:20, background:'rgba(0,0,0,0.1)' }} />

        <button onClick={onNodeFailure} disabled={nodeFailure} className={`float-btn ${nodeFailure ? 'float-btn-danger' : 'float-btn-outline'}`}
          style={{ fontSize:11, padding:'6px 12px', pointerEvents:'auto', opacity: nodeFailure ? 0.7 : 1 }}>
          <Server size={12} />
          {nodeFailure ? 'S5 OFFLINE' : 'NODE FAILURE'}
        </button>

        <button onClick={onLowBattery} className="float-btn float-btn-outline" style={{ fontSize:11, padding:'6px 12px', pointerEvents:'auto' }}>
          <BatteryLow size={12} /> LOW BATTERY
        </button>

        <div style={{ width:1, height:20, background:'rgba(0,0,0,0.1)' }} />

        <button onClick={onTogglePresentation} className="float-btn float-btn-outline" style={{ fontSize:11, padding:'6px 12px', pointerEvents:'auto' }}>
          <Maximize2 size={12} /> PRESENT
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE BADGE
// ─────────────────────────────────────────────────────────────────────────────
function OfflineBadge() {
  return (
    <div className="absolute top-[140px] md:top-[90px] right-4 md:right-[16px] pointer-events-none z-20 anim-slide-left scale-90 md:scale-100 origin-top-right md:origin-right">
      <div className="glass" style={{ borderRadius:16, padding:'12px 16px', borderColor:'rgba(196,61,61,0.3)', maxWidth:180 }}>
        <div style={{ fontSize:10, fontWeight:800, color:'#C43D3D', letterSpacing:'0.1em', marginBottom:8 }}>INTERNET OFFLINE</div>
        <div style={{ fontSize:9, fontWeight:700, color:'#D9822B', letterSpacing:'0.08em', marginBottom:6 }}>LOCAL EDGE MODE ACTIVE</div>
        {['LOCAL AI ACTIVE','LOCAL STORAGE ACTIVE','LOCAL ALERTS ACTIVE'].map(s => (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <div style={{ width:4, height:4, borderRadius:'50%', background:'#4C9A5A' }} />
            <span style={{ fontSize:8, color:'#667078', fontWeight:600 }}>{s}</span>
          </div>
        ))}
        <div style={{ marginTop:8, fontSize:8, color:'#202428', fontStyle:'italic', fontWeight:500, lineHeight:1.5, borderTop:'1px solid rgba(0,0,0,0.08)', paddingTop:6 }}>
          "Internet is optional. Monitoring is not."
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-HEAL BADGE
// ─────────────────────────────────────────────────────────────────────────────
function SelfHealBadge() {
  return (
    <div className="absolute top-[140px] md:top-[90px] right-4 md:right-[16px] pointer-events-none z-[21] anim-slide-left scale-90 md:scale-100 origin-top-right md:origin-right">
      <div className="glass" style={{ borderRadius:14, padding:'8px 14px' }}>
        <div style={{ fontSize:9, fontWeight:800, color:'#D9822B', letterSpacing:'0.08em' }}>⟳ SELF-HEALING ROUTE RECONFIGURED</div>
        <div style={{ fontSize:8, color:'#667078', marginTop:3 }}>S4 → S8 → S6 active</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE OVERLAY (non-twin pages)
// ─────────────────────────────────────────────────────────────────────────────
function PageOverlay({ page, state }: { page: string; state: SimState }) {
  const activeNodes = Object.values(state.nodes).filter(n => n.status !== 'OFFLINE').length;
  const node = state.nodes[state.selectedNode];

  const PAGE_LABELS: Record<string, string> = {
    dash: 'Dashboard', net: 'Sensor Network', ai: 'AI Risk Engine',
    alerts: 'Alert Log', panels: 'Mine Panels', arch: 'System Architecture', hw: 'Hardware',
  };

  return (
    <div className="absolute inset-0 flex items-start justify-center pt-24 md:pt-[80px] pointer-events-none z-15">
      <div className="glass rounded-[16px] md:rounded-[24px] p-4 md:p-[24px_28px] max-w-[900px] w-[95%] md:w-[calc(100%-120px)] max-h-[calc(100vh-160px)] md:max-h-[calc(100vh-140px)] overflow-y-auto pointer-events-auto">
        <h2 style={{ fontSize:22, fontWeight:800, color:'#202428', marginBottom:4 }}>{PAGE_LABELS[page]}</h2>
        <p style={{ fontSize:12, color:'#667078', marginBottom:20 }}>STRATAGUARD AI · Simulated Data Only</p>

        {page === 'dash' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-3">
            {[
              { k:'Active Nodes', v:`${activeNodes}/9`, c: activeNodes<9?'#D9822B':'#4C9A5A' },
              { k:'AI Risk (S5)',  v:`${node?.aiRisk ?? 0}%`,  c: node?.aiRisk ?? 0 > 60 ? '#C43D3D':'#4C9A5A' },
              { k:'Alerts',       v:state.alerts.length,  c:'#202428' },
              { k:'Displacement', v:`${node?.displacement.toFixed(1) ?? '—'} mm`, c:'#D9822B' },
              { k:'Gateway',      v:'ONLINE',  c:'#4C9A5A' },
              { k:'Internet',     v:state.internet?'ONLINE':'OFFLINE', c:state.internet?'#4C9A5A':'#C43D3D' },
            ].map(({ k, v, c }) => (
              <div key={k} style={{ background:'rgba(255,255,255,0.5)', borderRadius:14, padding:'14px 16px', border:'1px solid rgba(255,255,255,0.6)' }}>
                <div style={{ fontSize:9, color:'#8A939B', fontWeight:700, letterSpacing:'0.1em', marginBottom:6 }}>{k.toUpperCase()}</div>
                <div style={{ fontSize:22, fontWeight:800, color:c }}>{v.toString()}</div>
              </div>
            ))}
          </div>
        )}

        {page === 'net' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[10px]">
            {Object.values(state.nodes).map(n => {
              const rc = RISK_COLOR[n.status] ?? '#8A939B';
              return (
                <div key={n.id} style={{ background:'rgba(255,255,255,0.5)', borderRadius:14, padding:'12px 14px', border:`1px solid ${rc}30` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:16, fontWeight:800, color:'#202428' }}>{n.id}</span>
                    <span style={{ fontSize:9, fontWeight:700, color:rc, background:`${rc}18`, padding:'2px 7px', borderRadius:99 }}>{n.status}</span>
                  </div>
                  {n.status !== 'OFFLINE' ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:3, fontSize:10, color:'#667078' }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span>Battery</span><span style={{ fontWeight:600, color: n.battery < 20 ? '#C43D3D' : '#202428' }}>{Math.round(n.battery)}%</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span>Displacement</span><span style={{ fontWeight:600, color:rc }}>{n.displacement.toFixed(1)} mm</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span>Signal</span><span style={{ fontWeight:600 }}>{Math.round(n.rssi)} dBm</span></div>
                    </div>
                  ) : (
                    <div style={{ fontSize:11, color:'#8A939B', textAlign:'center', paddingTop:6 }}>OFFLINE</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {page === 'ai' && node && (
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 md:gap-4">
            <div style={{ background:'rgba(255,255,255,0.5)', borderRadius:16, padding:'16px', border:'1px solid rgba(255,255,255,0.6)', display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ fontSize:9, color:'#8A939B', fontWeight:700, letterSpacing:'0.1em', marginBottom:12 }}>CURRENT RISK — {node.id}</div>
              <div style={{ position:'relative', width:120, height:120 }}>
                <svg viewBox="0 0 80 80" style={{ width:120, height:120, transform:'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="32" stroke="rgba(0,0,0,0.08)" strokeWidth="6" fill="none" />
                  <circle cx="40" cy="40" r="32" stroke={RISK_COLOR[node.status]} strokeWidth="6" fill="none"
                    strokeDasharray={`${(node.aiRisk/100)*201} 201`} strokeLinecap="round"
                    style={{ transition:'all 0.7s ease' }} />
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontSize:30, fontWeight:900, color:'#202428', lineHeight:1 }}>{node.aiRisk}</div>
                  <div style={{ fontSize:10, color:RISK_COLOR[node.status], fontWeight:700 }}>{node.status}</div>
                </div>
              </div>
              <div style={{ marginTop:12, padding:'6px 0', width:'100%' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
                  {[['0–25','NORMAL','#4C9A5A'],['26–50','WATCH','#C9A227'],['51–75','WARNING','#D9822B'],['76–100','CRITICAL','#C43D3D']].map(([r,l,c]) => (
                    <div key={l} style={{ textAlign:'center', padding:'4px', borderRadius:8, border:`1px solid ${c}40`, background:`${c}10` }}>
                      <div style={{ fontSize:9, fontWeight:700, color:c }}>{l}</div>
                      <div style={{ fontSize:8, color:'#8A939B' }}>{r}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.5)', borderRadius:16, padding:'16px', border:'1px solid rgba(255,255,255,0.6)' }}>
              <div style={{ fontSize:9, color:'#8A939B', fontWeight:700, letterSpacing:'0.1em', marginBottom:14 }}>RISK CONTRIBUTING FACTORS</div>
              {[
                { label:'Displacement trend', val: Math.min(1, node.displacement/15) },
                { label:'Displacement rate',  val: Math.min(1, node.displacementRate/2) },
                { label:'Tilt variation',     val: Math.min(1, node.tilt/3) },
                { label:'Vibration anomaly',  val: node.vibration },
                { label:'Crack detection',    val: node.crackDetected ? 1 : 0 },
                { label:'Neighbour correlation', val: node.aiRisk > 50 ? 0.85 : 0.2 },
              ].map(f => {
                const pct = Math.round(f.val*100);
                const c = pct > 75 ? '#C43D3D' : pct > 50 ? '#D9822B' : pct > 25 ? '#C9A227' : '#4C9A5A';
                return (
                  <div key={f.label} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'#202428' }}>{f.label}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:c }}>{pct}%</span>
                    </div>
                    <div className="risk-bar-track">
                      <div className="risk-bar-fill" style={{ width:`${pct}%`, background:c }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {page === 'alerts' && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {state.alerts.slice().reverse().map(a => {
              const ac = a.level==='CRITICAL'?'#C43D3D':a.level==='WARNING'?'#D9822B':a.level==='WATCH'?'#C9A227':'#667078';
              return (
                <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'rgba(255,255,255,0.5)', borderRadius:12, border:`1px solid ${ac}25` }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:ac, flexShrink:0 }} />
                  <span style={{ fontSize:10, fontWeight:700, color:ac, width:64, flexShrink:0 }}>{a.level}</span>
                  <span style={{ fontSize:11, color:'#202428', flex:1 }}>{a.message}</span>
                  <span style={{ fontSize:9, color:'#8A939B', fontFamily:'monospace' }}>{a.time}</span>
                </div>
              );
            })}
          </div>
        )}

        {page === 'panels' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { id:'P-01', sensors:['S1','S2','S4','S5'], depth:'~200 m', status:'NORMAL' },
              { id:'P-02', sensors:['S2','S3','S5','S6'], depth:'~220 m', status: state.stage>=2?'WATCH':'NORMAL' },
              { id:'P-03', sensors:['S4','S5','S6','S8'], depth:'~250 m', status: state.stage>=5?'CRITICAL':state.stage>=3?'WARNING':state.stage>=1?'WATCH':'NORMAL' },
              { id:'P-04', sensors:['S6','S7','S8','S9'], depth:'~230 m', status:'NORMAL' },
            ].map(p => {
              const rc = RISK_COLOR[p.status] ?? '#8A939B';
              return (
                <div key={p.id} style={{ background:'rgba(255,255,255,0.5)', borderRadius:16, padding:'16px', border:`1px solid ${rc}30` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:20, fontWeight:900, color:'#202428' }}>{p.id}</span>
                    <span style={{ fontSize:9, fontWeight:700, color:rc, background:`${rc}18`, padding:'3px 10px', borderRadius:99 }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize:10, color:'#667078', display:'flex', flexDirection:'column', gap:4 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span>Depth</span><span style={{ fontWeight:600, color:'#202428' }}>{p.depth}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span>Sensors</span><span style={{ fontWeight:600, color:'#202428' }}>{p.sensors.join(', ')}</span></div>
                    {p.id === 'P-03' && node && (
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span>Deformation</span><span style={{ fontWeight:700, color:rc }}>{node.displacement.toFixed(1)} mm</span></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {page === 'arch' && (
          <div style={{ maxWidth:560, margin:'0 auto' }}>
            {[
              { t:'SURFACE SENSOR NODES', d:'ESP32 + IMU + Displacement + Vibration + LoRa', c:'#4C9A5A' },
              { t:'SELF-HEALING LoRa MESH', d:'Sub-GHz, multi-hop, auto-rerouting on failure', c:'#C9A227' },
              { t:'EDGE GATEWAY', d:'Raspberry Pi — local MQTT, data aggregation', c:'#D9822B' },
              { t:'LOCAL PROCESSING', d:'Spatial-temporal feature extraction', c:'#C43D3D' },
              { t:'AI RISK ENGINE', d:'Subsidence risk assessment — simulated prototype', c:'#D9822B' },
              { t:'DIGITAL TWIN / GIS', d:'Real-time 3D visualization of mine state', c:'#C9A227' },
              { t:'EARLY WARNING OUTPUT', d:'Sirens, SMS, cloud dashboard — offline-first', c:'#C43D3D' },
            ].map((l, i, arr) => (
              <div key={i} style={{ display:'flex', gap:16, marginBottom:8 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={{ width:12, height:12, borderRadius:'50%', background:l.c, border:`2px solid ${l.c}`, marginTop:4 }} />
                  {i < arr.length - 1 && <div style={{ width:2, height:32, background:`${l.c}40`, flex:1 }} />}
                </div>
                <div style={{ flex:1, background:'rgba(255,255,255,0.5)', borderRadius:12, padding:'10px 14px', border:`1px solid ${l.c}30`, marginBottom: i < arr.length-1 ? 0 : 0 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:l.c, letterSpacing:'0.06em' }}>{l.t}</div>
                  <div style={{ fontSize:10, color:'#667078', marginTop:2 }}>{l.d}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {page === 'hw' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { n:'MCU', s:'ESP32 / STM32L4', p:'Ultra-low power processing, LoRa control' },
              { n:'IMU / TILT', s:'MPU-6050 / ADXL355', p:'6-DoF accelerometer + gyro' },
              { n:'DISPLACEMENT', s:'Draw-wire / LiDAR', p:'Vertical settlement measurement' },
              { n:'VIBRATION', s:'MEMS Accelerometer', p:'High-frequency vibration detection' },
              { n:'CRACK SENSOR', s:'Strain gauge / Conductive', p:'Surface fissure detection' },
              { n:'LoRa MODULE', s:'SX1276 / SX1262', p:'868/915 MHz, long range, mesh' },
              { n:'BATTERY', s:'LiFePO4 18650 Pack', p:'Long-life, safe chemistry' },
              { n:'SOLAR', s:'5–10 W Monocrystalline', p:'Continuous unattended operation' },
              { n:'ENCLOSURE', s:'IP67 NEMA-4X', p:'All-weather, dust-proof' },
              { n:'GATEWAY', s:'Raspberry Pi 4B', p:'Local MQTT, edge inference' },
            ].map(h => (
              <div key={h.n} style={{ background:'rgba(255,255,255,0.5)', borderRadius:12, padding:'12px 14px', border:'1px solid rgba(255,255,255,0.6)' }}>
                <div style={{ fontSize:9, fontWeight:800, color:'#D9822B', letterSpacing:'0.1em', marginBottom:3 }}>{h.n}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'#202428', marginBottom:2 }}>{h.s}</div>
                <div style={{ fontSize:10, color:'#667078' }}>{h.p}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
