import { Play, RefreshCw, Server, Maximize2, Minimize2, BatteryLow } from 'lucide-react';
import { cn } from '../lib/utils';

interface ControlsProps {
  running: boolean;
  stage: number;
  nodeFailure: boolean;
  presentationMode: boolean;
  internet: boolean;
  onStart: () => void;
  onReset: () => void;
  onNodeFailure: () => void;
  onTogglePresentation: () => void;
  onLowBattery: () => void;
}

export default function SimControls({
  running, stage, nodeFailure, presentationMode,
  onStart, onReset, onNodeFailure, onTogglePresentation, onLowBattery,
}: ControlsProps) {
  const STAGE_LABELS = [
    '■ NORMAL',
    '● DEFORMATION DETECTED',
    '▲ DISPLACEMENT INCREASING',
    '▲ NEIGHBOURING ANOMALY',
    '⚠ WARNING ZONE',
    '🔴 CRITICAL',
  ];

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#FFFFFF] border-t border-[#D9DDE1] shrink-0 flex-wrap shadow-sm z-10">
      {/* Stage indicator */}
      <div className="flex items-center gap-2">
        {STAGE_LABELS.map((_label, i) => (
          <div
            key={i}
            className={cn(
              'text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all duration-500',
              i <= stage
                ? i === 5 ? 'border-[#C62828] bg-[#C62828]/10 text-[#C62828]'
                  : i >= 4 ? 'border-[#E67E22] bg-[#E67E22]/10 text-[#E67E22]'
                  : i >= 2 ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#C9A227]'
                  : 'border-[#66707A] bg-[#EEF0F2] text-[#202428]'
                : 'border-[#D9DDE1] bg-transparent text-[#8A939B]'
            )}
          >
            {i + 1}
          </div>
        ))}
        {stage > 0 && stage < 6 && (
          <span className={cn('text-xs font-bold', stage >= 5 ? 'text-[#C62828]' : stage >= 4 ? 'text-[#E67E22]' : 'text-[#C9A227]')}>
            {STAGE_LABELS[stage]}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Control buttons */}
      <button
        onClick={onStart}
        disabled={running && stage >= 5}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all',
          running && stage < 5
            ? 'bg-[#E67E22]/10 border-[#E67E22]/30 text-[#E67E22] hover:bg-[#E67E22]/20'
            : stage >= 5
            ? 'bg-[#EEF0F2] border-[#D9DDE1] text-[#8A939B] cursor-not-allowed'
            : 'bg-[#2E7D32]/10 border-[#2E7D32]/30 text-[#2E7D32] hover:bg-[#2E7D32]/20'
        )}
      >
        <Play className="w-4 h-4" />
        {running && stage < 5 ? 'SIMULATION RUNNING...' : stage >= 5 ? 'CRITICAL REACHED' : '▶ START SUBSIDENCE SIMULATION'}
      </button>

      <button
        onClick={onReset}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border border-[#D9DDE1] text-[#66707A] hover:bg-[#EEF0F2] hover:text-[#202428] transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        RESET
      </button>

      <button
        onClick={onNodeFailure}
        disabled={nodeFailure}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all',
          nodeFailure
            ? 'border-[#C62828]/30 bg-[#C62828]/10 text-[#C62828]'
            : 'border-[#D9DDE1] text-[#66707A] hover:bg-[#EEF0F2] hover:text-[#E67E22]'
        )}
      >
        <Server className="w-4 h-4" />
        {nodeFailure ? 'S5 OFFLINE' : 'SIMULATE NODE FAILURE'}
      </button>

      <button
        onClick={onLowBattery}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border border-[#D9DDE1] text-[#66707A] hover:bg-[#EEF0F2] hover:text-[#C9A227] transition-all"
      >
        <BatteryLow className="w-4 h-4" />
        LOW BATTERY
      </button>

      <button
        onClick={onTogglePresentation}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all',
          presentationMode
            ? 'border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB]'
            : 'border-[#D9DDE1] text-[#66707A] hover:bg-[#EEF0F2] hover:text-[#2563EB]'
        )}
      >
        {presentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        {presentationMode ? 'EXIT PRESENTATION' : 'PRESENTATION MODE'}
      </button>
    </div>
  );
}
