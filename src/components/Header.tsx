import React from 'react';
import { Activity, ShieldCheck, Wifi, Battery, Server, WifiOff } from 'lucide-react';
import type { NetworkStatus } from '../types';
import { cn } from '../lib/utils';

export const Header: React.FC<{ status: NetworkStatus, isPresentation: boolean, onTogglePresentation: () => void, setPage: (p:string)=>void, page: string }> = ({ status, isPresentation, onTogglePresentation, setPage, page }) => {
  return (
    <header className="glass-panel px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 border-t-0 border-x-0 rounded-t-none rounded-b-2xl mb-6 bg-[#0b0c10]/95 sticky top-0 z-50 shadow-blue-900/10">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-red-600 blur-lg opacity-20"></div>
          <Activity className="w-10 h-10 text-red-500 relative z-10" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white">
            STRATAGUARD <span className="text-red-500">AI</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-400 font-medium tracking-widest uppercase">
            Real-Time Mine Subsidence Intelligence
          </p>
        </div>
        <div className="ml-4 px-2 py-0.5 bg-red-900/30 border border-red-500/50 rounded text-[10px] font-bold text-red-400 uppercase tracking-widest">
          Virtual Prototype
        </div>
      </div>

      {!isPresentation && (
        <div className="flex bg-[#0b0c10] rounded-lg p-1 border border-gray-800 flex-wrap justify-center mt-2 md:mt-0">
          <button onClick={()=>setPage('dashboard')} className={cn("px-2 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-colors", page === 'dashboard' ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300")}>DASHBOARD</button>
          <button onClick={()=>setPage('digital-twin')} className={cn("px-2 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-colors", page === 'digital-twin' ? "bg-gray-800 text-blue-400" : "text-gray-500 hover:text-gray-300")}>DIGITAL TWIN</button>
          <button onClick={()=>setPage('network')} className={cn("px-2 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-colors", page === 'network' ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300")}>NETWORK</button>
          <button onClick={()=>setPage('architecture')} className={cn("px-2 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-colors", page === 'architecture' ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300")}>ARCHITECTURE</button>
          <button onClick={()=>setPage('hardware')} className={cn("px-2 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-md transition-colors", page === 'hardware' ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300")}>HARDWARE</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span className="text-gray-300 font-mono">SYS: {status.activeNodes}/{status.totalNodes}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {status.gatewayOnline ? <Server className="w-4 h-4 text-blue-500" /> : <Server className="w-4 h-4 text-red-500" />}
          <span className="text-gray-300 font-mono">GW: {status.gatewayOnline ? 'ON' : 'OFF'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {status.internetOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />}
          <span className="text-gray-300 font-mono">NET: {status.internetOnline ? 'ON' : 'OFFLINE MODE'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Battery className={cn("w-4 h-4", status.averageBattery < 30 ? "text-red-500" : "text-green-500")} />
          <span className="text-gray-300 font-mono">PWR: {Math.round(status.averageBattery)}%</span>
        </div>

        <button 
          onClick={onTogglePresentation}
          className="ml-2 text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-gray-300 font-bold border border-gray-700"
        >
          {isPresentation ? 'EXIT DEMO' : 'PRESENT'}
        </button>
      </div>
    </header>
  );
};
