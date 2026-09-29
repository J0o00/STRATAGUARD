import React from 'react';
import type { AlertEvent } from '../types';
import { AlertTriangle, Info, Bell, WifiOff } from 'lucide-react';
import { cn } from '../lib/utils';

export const AlertLog: React.FC<{ logs: AlertEvent[] }> = ({ logs }) => {
  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-400 mb-4 tracking-wider flex items-center gap-2">
        <Bell className="w-4 h-4" />
        EVENT & ALERT CENTER
      </h3>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-2">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-4">No events recorded</div>
        ) : (
          logs.slice().reverse().map(log => (
            <div 
              key={log.id} 
              className={cn(
                "p-3 rounded-lg border text-sm animate-in fade-in slide-in-from-right-4 duration-300",
                log.level === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-100' :
                log.level === 'WARNING' ? 'bg-orange-500/10 border-orange-500/30 text-orange-100' :
                log.level === 'WATCH' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-100' :
                log.level === 'OFFLINE' ? 'bg-gray-500/10 border-gray-500/30 text-gray-200' :
                'bg-[#0b0c10]/50 border-gray-800 text-gray-300'
              )}
            >
              <div className="flex justify-between items-start mb-1 text-xs opacity-75">
                <span className="font-mono">{log.timestamp}</span>
                <span className="font-bold">{log.source}</span>
              </div>
              <div className="flex gap-2">
                {log.level === 'CRITICAL' || log.level === 'WARNING' ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : 
                 log.level === 'OFFLINE' ? <WifiOff className="w-4 h-4 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                <p>{log.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
