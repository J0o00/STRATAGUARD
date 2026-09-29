import { Server, Wifi, WifiOff, Radio, AlertCircle, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export default function TopBar({
  internet, activeNodes, criticalZones, stage,
}: {
  internet: boolean;
  activeNodes: number;
  criticalZones: number;
  stage: number;
}) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const indicators = [
    { label: 'SYSTEM STATUS', value: 'ACTIVE', color: 'text-[#2E7D32]', icon: Activity },
    { label: 'GATEWAY', value: 'ONLINE', color: 'text-[#2E7D32]', icon: Server },
    { label: 'NETWORK', value: 'HEALTHY', color: 'text-[#2E7D32]', icon: Radio },
    {
      label: 'INTERNET',
      value: internet ? 'ONLINE' : 'OFFLINE',
      color: internet ? 'text-[#2E7D32]' : 'text-[#C62828]',
      icon: internet ? Wifi : WifiOff,
    },
    {
      label: 'ACTIVE NODES',
      value: `${activeNodes} / 9`,
      color: activeNodes < 9 ? 'text-[#E67E22]' : 'text-[#2E7D32]',
      icon: Radio,
    },
    {
      label: 'CRITICAL ZONES',
      value: criticalZones.toString(),
      color: criticalZones > 0 ? 'text-[#C62828]' : 'text-[#2E7D32]',
      icon: AlertCircle,
    },
  ];

  return (
    <header className="flex items-center gap-6 px-6 py-2 bg-[#FFFFFF] border-b border-[#D9DDE1] shrink-0 shadow-sm z-10">
      <div className="flex items-center gap-6 flex-1 flex-wrap">
        {indicators.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[10px] text-[#8A939B] font-bold tracking-widest whitespace-nowrap">{label}:</span>
            <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
            <span className={cn('text-xs font-bold', color)}>{value}</span>
          </div>
        ))}
      </div>

      {/* Simulation stage indicator */}
      {stage > 0 && (
        <div className={cn(
          'px-3 py-1 rounded-full text-[10px] font-bold border tracking-widest animate-pulse shrink-0',
          stage >= 5 ? 'bg-[#C62828]/10 border-[#C62828]/30 text-[#C62828]' :
          stage >= 3 ? 'bg-[#E67E22]/10 border-[#E67E22]/30 text-[#E67E22]' :
                       'bg-[#C9A227]/10 border-[#C9A227]/30 text-[#C9A227]'
        )}>
          {stage >= 5 ? 'CRITICAL EVENT ACTIVE' :
           stage >= 3 ? 'WARNING ACTIVE' : 'SIMULATION RUNNING'}
        </div>
      )}

      {/* Clock */}
      <div className="text-right shrink-0">
        <div className="text-sm font-mono font-bold text-[#202428]">{timeStr}</div>
        <div className="text-[10px] text-[#8A939B]">{dateStr}</div>
      </div>
    </header>
  );
}
