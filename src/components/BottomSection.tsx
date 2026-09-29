import { cn } from '../lib/utils';
import type { SimState } from '../store/simulation';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Alert } from '../store/simulation';

const ALERT_STYLE: Record<string, string> = {
  CRITICAL: 'text-[#C62828] bg-[#C62828]/5 border-[#C62828]/40',
  WARNING:  'text-[#E67E22] bg-[#E67E22]/5 border-[#E67E22]/40',
  WATCH:    'text-[#C9A227] bg-[#C9A227]/5 border-[#C9A227]/40',
  INFO:     'text-[#202428] bg-[#EEF0F2]/50 border-[#D9DDE1]',
  OFFLINE:  'text-[#757575] bg-[#EEF0F2]/50 border-[#D9DDE1]',
};

function AlertRow({ a }: { a: Alert }) {
  return (
    <div className={cn('flex items-start gap-3 px-3 py-2 rounded-lg border text-xs', ALERT_STYLE[a.level] ?? ALERT_STYLE.INFO)}>
      <span className="font-black tracking-widest shrink-0 mt-0.5 text-[10px]">{a.level}</span>
      <span className="flex-1">{a.message}</span>
      <span className="text-[#8A939B] shrink-0 font-mono text-[9px] mt-0.5">{a.time}</span>
    </div>
  );
}

// Risk heatmap grid (2D top-view)
function RiskHeatmap({ nodes }: { nodes: SimState['nodes'] }) {
  const RISK_COLOR: Record<string, string> = {
    NORMAL: '#2E7D32', WATCH: '#C9A227', WARNING: '#E67E22', CRITICAL: '#C62828', OFFLINE: '#757575',
  };
  const gridNodes = ['S1','S2','S3','S4','S5','S6','S7','S8','S9'];
  return (
    <div className="grid grid-cols-3 gap-2 p-3">
      {gridNodes.map(id => {
        const n = nodes[id];
        const c = RISK_COLOR[n?.status ?? 'NORMAL'];
        return (
          <div key={id} className="relative aspect-square rounded-lg flex items-center justify-center text-xs font-black transition-all duration-700"
            style={{ backgroundColor: `${c}22`, border: `2px solid ${c}88`, boxShadow: n?.status === 'CRITICAL' ? `0 0 10px ${c}66` : 'none' }}>
            <span style={{ color: c }}>{id}</span>
            {n?.status === 'CRITICAL' && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: c }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BottomSection({ state }: { state: SimState }) {
  const node = state.nodes[state.selectedNode];

  return (
    <div className="flex gap-3 h-full">
      {/* Displacement chart */}
      <div className="flex-1 bg-[#FFFFFF] border border-[#D9DDE1] shadow-sm rounded-xl p-3 flex flex-col min-w-0">
        <div className="text-[10px] text-[#8A939B] font-bold tracking-widest mb-2">
          DISPLACEMENT TREND — {state.selectedNode}
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={state.displacementHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="dispGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C62828" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#C62828" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#EEF0F2" vertical={false} />
              <XAxis dataKey="t" stroke="#D9DDE1" fontSize={9} tick={{ fill: '#8A939B' }} />
              <YAxis stroke="#D9DDE1" fontSize={9} tick={{ fill: '#8A939B' }} unit="mm" />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D9DDE1', borderRadius: 8, fontSize: 11, color: '#202428' }}
                labelStyle={{ color: '#66707A' }}
                itemStyle={{ color: '#C62828' }}
              />
              <ReferenceLine y={8} stroke="#C9A227" strokeDasharray="4 4" label={{ value: 'Warn', fill: '#C9A227', fontSize: 9 }} />
              <Area type="monotone" dataKey="val" stroke="#C62828" strokeWidth={2} fill="url(#dispGrad)" dot={false} name="Displacement" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk heatmap */}
      <div className="w-52 bg-[#FFFFFF] border border-[#D9DDE1] shadow-sm rounded-xl flex flex-col shrink-0">
        <div className="text-[10px] text-[#8A939B] font-bold tracking-widest p-3 pb-0">
          RISK HEATMAP (SURFACE)
        </div>
        <RiskHeatmap nodes={state.nodes} />
        <div className="px-3 pb-3 text-[9px] text-[#8A939B] text-center">
          Estimated affected zone: P-03 epicenter
        </div>
      </div>

      {/* Alert log */}
      <div className="flex-1 bg-[#FFFFFF] border border-[#D9DDE1] shadow-sm rounded-xl p-3 flex flex-col min-w-0">
        <div className="text-[10px] text-[#8A939B] font-bold tracking-widest mb-2">ALERT & EVENT LOG</div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {state.alerts.slice().reverse().map(a => <AlertRow key={a.id} a={a} />)}
        </div>
      </div>

      {/* Mine Panel Info */}
      <div className="w-52 bg-[#FFFFFF] border border-[#D9DDE1] shadow-sm rounded-xl p-4 shrink-0 flex flex-col gap-3">
        <div className="text-[10px] text-[#8A939B] font-bold tracking-widest">MINE PANEL INFO</div>
        <div>
          <div className="text-xl font-black text-[#202428]">{state.selectedPanel}</div>
          <div className={cn('text-sm font-bold', node?.status === 'CRITICAL' ? 'text-[#C62828]' : 'text-[#E67E22]')}>
            {state.stage >= 4 ? 'HIGH RISK' : state.stage >= 2 ? 'ELEVATED RISK' : 'NORMAL'}
          </div>
        </div>

        {[
          { k: 'Depth (approx.)', v: '~250 m' },
          { k: 'Sensor Coverage', v: 'S4, S5, S6, S8' },
          { k: 'Current Deform.', v: node ? `${node.displacement.toFixed(1)} mm` : '—' },
          { k: 'Trend', v: state.stage > 0 ? '↑ Increasing' : '→ Stable' },
          { k: 'Risk Level', v: node?.status ?? 'NORMAL' },
        ].map(({ k, v }) => (
          <div key={k} className="flex flex-col border-t border-[#EEF0F2] pt-2">
            <span className="text-[10px] text-[#66707A]">{k}</span>
            <span className={cn('text-xs font-bold',
              v === 'CRITICAL' ? 'text-[#C62828]' :
              v?.includes('↑') ? 'text-[#E67E22]' : 'text-[#202428]'
            )}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
