import React from 'react';
import { ShieldAlert, TrendingUp, Zap, HelpCircle, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import type { RiskLevel, SimulationState } from '../types';

interface RiskEngineProps {
  state: SimulationState;
  calculateRisk: () => { score: number; level: RiskLevel; trend: 'INCREASING ↑' | 'STABLE →' | 'DECREASING ↓' };
}

export const RiskEngine: React.FC<RiskEngineProps> = ({ state, calculateRisk }) => {
  const { score, level, trend } = calculateRisk();

  const colorMap = {
    NORMAL: 'text-green-500',
    WATCH: 'text-yellow-500',
    WARNING: 'text-orange-500',
    CRITICAL: 'text-red-500',
    OFFLINE: 'text-gray-500'
  };

  const bgMap = {
    NORMAL: 'bg-green-500',
    WATCH: 'bg-yellow-500',
    WARNING: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
    OFFLINE: 'bg-gray-500'
  };

  const showExplanation = score > 30;

  return (
    <div className="glass-panel p-6 flex flex-col h-full relative overflow-hidden">
      {/* Decorative background element */}
      <div className={cn(
        "absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none transition-colors duration-1000",
        bgMap[level]
      )}></div>

      <div className="flex items-center gap-2 mb-6 text-gray-300">
        <ShieldAlert className="w-5 h-5 text-gray-400" />
        <h2 className="text-xl font-bold">PROTOTYPE RISK ENGINE</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col">
          <span className="text-sm text-gray-400 font-medium tracking-wide mb-1">CURRENT RISK:</span>
          <span className={cn("text-3xl font-extrabold tracking-wider transition-colors duration-500", colorMap[level])}>
            {level}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm text-gray-400 font-medium tracking-wide mb-1">RISK SCORE:</span>
          <span className="text-4xl font-bold text-white tracking-widest">{score.toFixed(0)}<span className="text-xl text-gray-500">/100</span></span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="bg-[#0b0c10]/50 p-3 rounded-lg border border-gray-800">
          <div className="text-gray-500 mb-1">ZONE:</div>
          <div className="font-semibold text-gray-200">PANEL P-03</div>
        </div>
        <div className="bg-[#0b0c10]/50 p-3 rounded-lg border border-gray-800">
          <div className="text-gray-500 mb-1 flex items-center gap-1">
            TREND:
          </div>
          <div className={cn("font-semibold", trend.includes('↑') ? "text-orange-400" : "text-green-400")}>{trend}</div>
        </div>
      </div>

      {/* Threshold Legend */}
      <div className="mb-6 border border-gray-800 rounded-lg overflow-hidden">
        <div className="flex text-[10px] font-bold text-center h-2 w-full">
          <div className="bg-green-500 w-[30%]"></div>
          <div className="bg-yellow-500 w-[20%]"></div>
          <div className="bg-orange-500 w-[25%]"></div>
          <div className="bg-red-500 w-[25%]"></div>
        </div>
        <div className="flex text-[10px] font-medium text-gray-400 p-2 justify-between bg-[#0b0c10]/80">
          <span>NORMAL 0-30</span>
          <span>WATCH 31-50</span>
          <span>WARNING 51-75</span>
          <span>CRITICAL 76-100</span>
        </div>
      </div>

      {/* AI Explanation panel */}
      {showExplanation && (
        <div className="mt-auto bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-sm text-blue-100">WHY IS THIS ZONE AT RISK?</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-300">
            {state.deformationLevel >= 1 && (
              <li className="flex gap-2 items-start">
                <TrendingUp className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <span>Displacement increasing</span>
              </li>
            )}
            {state.deformationLevel >= 2 && (
              <>
                <li className="flex gap-2 items-start">
                  <Activity className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span>Deformation persistent</span>
                </li>
                <li className="flex gap-2 items-start">
                  <TrendingUp className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                  <span>Tilt variation increasing</span>
                </li>
              </>
            )}
            {state.deformationLevel >= 3 && (
              <>
                <li className="flex gap-2 items-start">
                  <Zap className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span>Neighbouring nodes affected</span>
                </li>
                <li className="flex gap-2 items-start">
                  <Zap className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span>Vibration anomaly detected</span>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
      {!showExplanation && (
        <div className="mt-auto bg-green-900/10 rounded-lg p-4 border border-green-900/30 text-green-500 text-sm flex items-center justify-center font-medium">
          No significant risk factors detected
        </div>
      )}
    </div>
  );
};
