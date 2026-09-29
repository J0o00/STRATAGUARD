import { AlertTriangle, CheckCircle, TrendingUp, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import type { NodeData } from '../store/simulation';

const RISK_COLORS: Record<string, string> = {
  NORMAL: 'text-[#2E7D32]', WATCH: 'text-[#C9A227]',
  WARNING: 'text-[#E67E22]', CRITICAL: 'text-[#C62828]', OFFLINE: 'text-[#757575]',
};
const RISK_BG: Record<string, string> = {
  NORMAL: 'bg-[#2E7D32]/5 border-[#2E7D32]/30',
  WATCH:   'bg-[#C9A227]/5 border-[#C9A227]/30',
  WARNING: 'bg-[#E67E22]/5 border-[#E67E22]/30',
  CRITICAL: 'bg-[#C62828]/5 border-[#C62828]/40',
  OFFLINE: 'bg-[#757575]/5 border-[#757575]/20',
};

function RiskBar({ label, val }: { label: string; val: number }) {
  const color = val > 0.75 ? '#C62828' : val > 0.5 ? '#E67E22' : val > 0.25 ? '#C9A227' : '#2E7D32';
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-[#66707A]">{label}</span>
        <span className="font-bold" style={{ color }}>{Math.round(val * 100)}%</span>
      </div>
      <div className="h-1.5 bg-[#EEF0F2] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function RightPanel({ node }: { node: NodeData | null }) {
  if (!node) return (
    <aside className="w-72 shrink-0 bg-[#FFFFFF] border-l border-[#D9DDE1] flex items-center justify-center text-[#8A939B] text-sm">
      Click a sensor node to inspect
    </aside>
  );

  const isOffline = node.status === 'OFFLINE';
  const riskFactors = [
    { label: 'Displacement trend', val: Math.min(1, node.displacement / 15) },
    { label: 'Tilt variation', val: Math.min(1, node.tilt / 3) },
    { label: 'Vibration anomaly', val: node.vibration },
    { label: 'Neighbour correlation', val: node.aiRisk > 50 ? 0.8 : 0.2 },
    { label: 'Persistence', val: node.aiRisk > 30 ? 0.65 : 0.15 },
  ];

  const riskColor = RISK_COLORS[node.status] ?? 'text-[#8A939B]';
  const vibLabel = node.vibration > 0.7 ? 'HIGH' : node.vibration > 0.4 ? 'MODERATE' : 'LOW';

  return (
    <aside className="w-72 shrink-0 bg-[#FFFFFF] border-l border-[#D9DDE1] overflow-y-auto">
      {/* Header */}
      <div className={cn('p-4 border-b border-[#D9DDE1]', RISK_BG[node.status])}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#66707A] font-bold tracking-widest">SELECTED NODE</span>
          <span className={cn('text-xs font-black tracking-widest border rounded-full px-2 py-0.5', riskColor,
            node.status === 'CRITICAL' ? 'border-[#C62828] animate-pulse' : 'border-current'
          )}>
            {node.status}
          </span>
        </div>
        <div className="text-3xl font-black text-[#202428]">{node.id}</div>
      </div>

      {/* Telemetry */}
      <div className="p-4 border-b border-[#D9DDE1] space-y-3">
        <div className="text-[10px] text-[#8A939B] font-bold tracking-widest mb-2">TELEMETRY</div>

        {isOffline ? (
          <div className="text-[#8A939B] text-sm text-center py-4">Node offline — no data</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F5F6F7] rounded-lg p-3 border border-[#D9DDE1]">
                <div className="text-[10px] text-[#8A939B] mb-0.5">BATTERY</div>
                <div className={cn('text-lg font-bold', node.battery < 20 ? 'text-[#C62828]' : 'text-[#2E7D32]')}>
                  {Math.round(node.battery)}%
                </div>
              </div>
              <div className="bg-[#F5F6F7] rounded-lg p-3 border border-[#D9DDE1]">
                <div className="text-[10px] text-[#8A939B] mb-0.5">SIGNAL</div>
                <div className="text-lg font-bold text-[#005B96]">{Math.round(node.rssi)} dBm</div>
              </div>
              <div className="bg-[#F5F6F7] rounded-lg p-3 border border-[#D9DDE1]">
                <div className="text-[10px] text-[#8A939B] mb-0.5">PACKET DEL.</div>
                <div className="text-lg font-bold text-[#2E7D32]">{node.packetDelivery.toFixed(1)}%</div>
              </div>
              <div className="bg-[#F5F6F7] rounded-lg p-3 border border-[#D9DDE1]">
                <div className="text-[10px] text-[#8A939B] mb-0.5">LAST UPDATE</div>
                <div className="text-xs font-bold text-[#005B96]">Live</div>
              </div>
            </div>

            <div className="text-[10px] text-[#8A939B] font-bold tracking-widest mt-4 mb-2">SENSOR READINGS</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-[#F5F6F7] rounded px-3 py-2 border border-[#D9DDE1]">
                <div>
                  <div className="text-[10px] text-[#8A939B]">DISPLACEMENT</div>
                  <div className={cn('text-base font-bold', riskColor)}>{node.displacement.toFixed(1)} mm</div>
                </div>
                <div className="text-right">
                  <TrendingUp className="w-3.5 h-3.5 text-[#E67E22] ml-auto mb-0.5" />
                  <div className="text-[10px] text-[#E67E22] font-bold">+{node.displacementRate.toFixed(2)} mm/hr</div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#F5F6F7] rounded px-3 py-2 border border-[#D9DDE1]">
                <div>
                  <div className="text-[10px] text-[#8A939B]">TILT</div>
                  <div className="text-base font-bold text-[#C9A227]">{node.tilt.toFixed(2)}°</div>
                </div>
                <div className="text-[10px] text-[#C9A227] font-bold">+{node.tiltRate.toFixed(3)}°/hr</div>
              </div>

              <div className="flex items-center justify-between bg-[#F5F6F7] rounded px-3 py-2 border border-[#D9DDE1]">
                <div>
                  <div className="text-[10px] text-[#8A939B]">VIBRATION</div>
                  <div className={cn('text-base font-bold', node.vibration > 0.6 ? 'text-[#C62828]' : 'text-[#C9A227]')}>{vibLabel}</div>
                </div>
                <Zap className={cn('w-4 h-4', node.vibration > 0.6 ? 'text-[#C62828] animate-pulse' : 'text-[#C9A227]')} />
              </div>

              <div className="flex items-center justify-between bg-[#F5F6F7] rounded px-3 py-2 border border-[#D9DDE1]">
                <div>
                  <div className="text-[10px] text-[#8A939B]">CRACK STATUS</div>
                  <div className={cn('text-base font-bold', node.crackDetected ? 'text-[#C62828]' : 'text-[#2E7D32]')}>
                    {node.crackDetected ? 'DETECTED' : 'CLEAR'}
                  </div>
                </div>
                {node.crackDetected
                  ? <AlertTriangle className="w-4 h-4 text-[#C62828] animate-pulse" />
                  : <CheckCircle className="w-4 h-4 text-[#2E7D32]" />}
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI Risk */}
      {!isOffline && (
        <div className="p-4">
          <div className="text-[10px] text-[#8A939B] font-bold tracking-widest mb-3">
            AI RISK ASSESSMENT (PROTOTYPE)
          </div>

          <div className="flex items-center gap-4 mb-4">
            {/* Gauge ring */}
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="#D9DDE1" strokeWidth="7" fill="none" />
                <circle
                  cx="32" cy="32" r="26"
                  stroke={node.aiRisk >= 76 ? '#C62828' : node.aiRisk >= 51 ? '#E67E22' : node.aiRisk >= 26 ? '#C9A227' : '#2E7D32'}
                  strokeWidth="7" fill="none"
                  strokeDasharray={`${(node.aiRisk / 100) * 163} 163`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black text-[#202428] leading-none">{node.aiRisk}</span>
                <span className="text-[8px] text-[#8A939B]">/100</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-[#66707A] mb-0.5">RISK LEVEL</div>
              <div className={cn('text-xl font-black', riskColor)}>{node.status}</div>
              <div className="text-[9px] text-[#8A939B] mt-1 leading-tight">
                Subsidence Risk Assessment<br />& Early Warning
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#8A939B] font-bold tracking-widest mb-2">RISK FACTORS</div>
          {riskFactors.map(f => <RiskBar key={f.label} label={f.label} val={f.val} />)}
        </div>
      )}
    </aside>
  );
}
