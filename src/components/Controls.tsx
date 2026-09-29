import React from 'react';
import { Play, Pause, AlertTriangle, AlertOctagon, ServerCrash, WifiOff, BatteryWarning, RotateCcw, MonitorPlay } from 'lucide-react';
import type { SimulationState } from '../types';
import { cn } from '../lib/utils';

interface ControlsProps {
  state: SimulationState;
  onAction: (action: string) => void;
}

export const Controls: React.FC<ControlsProps> = ({ state, onAction }) => {
  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-400 mb-4 tracking-wider flex items-center gap-2">
        <MonitorPlay className="w-4 h-4" />
        SIMULATION CONTROLS
      </h3>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => onAction('TOGGLE_PLAY')}
          className={cn(
            "tech-button py-3",
            state.isRunning ? "bg-amber-900/40 text-amber-500 border-amber-900/50 hover:bg-amber-900/60" : "bg-green-900/40 text-green-500 border-green-900/50 hover:bg-green-900/60"
          )}
        >
          {state.isRunning ? <><Pause className="w-4 h-4" /> PAUSE</> : <><Play className="w-4 h-4" /> START MONITORING</>}
        </button>
        
        <button
          onClick={() => onAction('RESET')}
          className="tech-button py-3 text-gray-400 hover:text-white"
        >
          <RotateCcw className="w-4 h-4" /> RESET SYSTEM
        </button>
      </div>

      <div className="space-y-2 flex-1">
        <button
          onClick={() => onAction('PROGRESSIVE_DEFORMATION')}
          disabled={!state.isRunning || state.deformationLevel > 0}
          className="w-full tech-button justify-start border-orange-900/30 hover:bg-orange-900/20 hover:text-orange-400"
        >
          <AlertTriangle className="w-4 h-4" /> SIMULATE PROGRESSIVE DEFORMATION
        </button>

        <button
          onClick={() => onAction('CRITICAL_EVENT')}
          disabled={!state.isRunning || state.deformationLevel >= 3}
          className="w-full tech-button justify-start border-red-900/30 hover:bg-red-900/20 hover:text-red-400"
        >
          <AlertOctagon className="w-4 h-4" /> SIMULATE CRITICAL EVENT
        </button>

        <button
          onClick={() => onAction('NODE_FAILURE')}
          disabled={!!state.failedNode}
          className="w-full tech-button justify-start border-blue-900/30 hover:bg-blue-900/20 hover:text-blue-400"
        >
          <ServerCrash className="w-4 h-4" /> SIMULATE NODE FAILURE
        </button>

        <button
          onClick={() => onAction('INTERNET_OUTAGE')}
          className={cn("w-full tech-button justify-start transition-all", state.isInternetOutage ? "bg-indigo-900/50 text-indigo-300 border-indigo-500/50" : "hover:bg-indigo-900/20 hover:text-indigo-400")}
        >
          <WifiOff className="w-4 h-4" /> {state.isInternetOutage ? 'RESTORE INTERNET' : 'SIMULATE INTERNET OUTAGE'}
        </button>

        <button
          onClick={() => onAction('LOW_BATTERY')}
          disabled={!!state.lowBatteryNode}
          className="w-full tech-button justify-start hover:bg-yellow-900/20 hover:text-yellow-400"
        >
          <BatteryWarning className="w-4 h-4" /> SIMULATE LOW BATTERY
        </button>
      </div>
    </div>
  );
};
