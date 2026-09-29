import {
  Activity, AlertTriangle, BarChart2, Box,
  Grid, HardDrive, LayoutDashboard, Network,
  Shield, Wifi, WifiOff,
} from 'lucide-react';
import { cn } from '../lib/utils';

const PAGES = [
  { id: 'twin',   label: 'Digital Twin',      icon: Box },
  { id: 'dash',   label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'net',    label: 'Sensor Network',    icon: Network },
  { id: 'ai',     label: 'AI Risk',           icon: Shield },
  { id: 'alerts', label: 'Alerts',            icon: AlertTriangle },
  { id: 'panels', label: 'Mine Panels',       icon: Grid },
  { id: 'arch',   label: 'System Architecture', icon: BarChart2 },
  { id: 'hw',     label: 'Hardware',          icon: HardDrive },
];

export default function Sidebar({ page, setPage, internet, onInternetToggle }: {
  page: string;
  setPage: (p: string) => void;
  internet: boolean;
  onInternetToggle: () => void;
}) {
  return (
    <aside className="flex flex-col w-56 shrink-0 bg-[#EEF0F2] border-r border-[#D9DDE1] z-10 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-[#D9DDE1]">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-6 h-6 text-[#E67E22]" />
          <span className="text-xl font-black tracking-tight text-[#202428]">
            STRATA<span className="text-[#66707A]">GUARD</span>
          </span>
        </div>
        <div className="text-[10px] text-[#66707A] leading-tight font-medium ml-8">
          Mine Subsidence Monitoring<br />& Early Warning System
        </div>
        <div className="mt-2 ml-8 inline-flex px-2 py-0.5 bg-[#FFFFFF] border border-[#D9DDE1] rounded text-[9px] text-[#8A939B] font-bold tracking-widest">
          VIRTUAL PROTOTYPE • SIMULATED DATA
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {PAGES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              page === id
                ? 'bg-[#FFFFFF] text-[#202428] border-l-[3px] border-l-[#E67E22] shadow-sm'
                : 'text-[#66707A] hover:bg-[#D9DDE1]/50 hover:text-[#202428] border-l-[3px] border-l-transparent'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Internet toggle */}
      <div className="p-4 border-t border-[#D9DDE1]">
        <button
          onClick={onInternetToggle}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all',
            internet
              ? 'border-[#2E7D32] bg-[#2E7D32]/10 text-[#2E7D32] hover:bg-[#2E7D32]/20'
              : 'border-[#E67E22] bg-[#E67E22]/10 text-[#E67E22] hover:bg-[#E67E22]/20 animate-pulse'
          )}
        >
          {internet ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {internet ? 'INTERNET: ONLINE' : 'INTERNET: OFFLINE'}
        </button>
        {!internet && (
          <div className="mt-2 text-[10px] text-[#E67E22] text-center font-bold tracking-wide">
            LOCAL EDGE MODE: ACTIVE
          </div>
        )}
      </div>

      {/* Tagline */}
      <div className="px-4 pb-5 text-[9px] text-[#8A939B] text-center leading-relaxed">
        "SENSE CONTINUOUSLY. ANALYSE INTELLIGENTLY. WARN EARLY."
      </div>
    </aside>
  );
}
