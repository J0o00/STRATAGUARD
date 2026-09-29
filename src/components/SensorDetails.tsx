import React from 'react';
import type { SensorData } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Battery, Wifi, Activity, ServerCrash } from 'lucide-react';
import { cn } from '../lib/utils';

interface SensorDetailsProps {
  node: SensorData | null;
  history: any[];
}

export const SensorDetails: React.FC<SensorDetailsProps> = ({ node, history }) => {
  if (!node) {
    return (
      <div className="glass-panel p-6 flex flex-col h-full items-center justify-center text-gray-500">
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p>Select a node on the map to view details</p>
      </div>
    );
  }

  const isOffline = node.status === 'OFFLINE';

  const colorMap = {
    NORMAL: 'text-green-500',
    WATCH: 'text-yellow-500',
    WARNING: 'text-orange-500',
    CRITICAL: 'text-red-500',
    OFFLINE: 'text-gray-500'
  };

  return (
    <div className="glass-panel p-6 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-wider text-white">NODE {node.id}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-400 text-sm">Status:</span>
            <span className={cn("font-bold text-sm tracking-widest", colorMap[node.status])}>
              {node.status}
            </span>
          </div>
        </div>
        
        {/* Battery & Network Status */}
        <div className="flex gap-4 bg-gray-900/50 p-2 rounded-lg border border-gray-800">
          <div className="flex flex-col items-center justify-center min-w-[50px]">
            <Battery className={cn("w-5 h-5 mb-1", node.battery < 20 ? "text-red-500" : "text-green-500")} />
            <span className="text-xs font-mono">{node.battery}%</span>
          </div>
          <div className="flex flex-col items-center justify-center min-w-[50px] border-l border-gray-700 pl-4">
            <Wifi className={cn("w-5 h-5 mb-1", isOffline ? "text-gray-600" : "text-blue-400")} />
            <span className="text-xs font-mono">{isOffline ? 'OFF' : `${node.rssi}dBm`}</span>
          </div>
        </div>
      </div>

      {isOffline ? (
        <div className="flex-1 flex flex-col items-center justify-center text-red-400/80 bg-red-950/10 rounded-xl border border-red-900/20">
          <ServerCrash className="w-16 h-16 mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">NODE OFFLINE</h3>
          <p className="text-sm text-center max-w-[250px]">Connection lost to sensor node. Check power supply or mesh routing.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
              <div className="text-xs text-gray-400 mb-1">Displacement</div>
              <div className="text-lg font-bold text-white font-mono">{node.displacement.toFixed(1)} <span className="text-xs text-gray-500">mm</span></div>
            </div>
            <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
              <div className="text-xs text-gray-400 mb-1">Rate</div>
              <div className={cn("text-lg font-bold font-mono", node.displacementRate > 0.5 ? "text-orange-400" : "text-white")}>
                +{node.displacementRate.toFixed(2)} <span className="text-xs text-gray-500">mm/h</span>
              </div>
            </div>
            <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
              <div className="text-xs text-gray-400 mb-1">Tilt</div>
              <div className="text-lg font-bold text-white font-mono">{node.tilt.toFixed(2)}°</div>
            </div>
            <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
              <div className="text-xs text-gray-400 mb-1">Vibration</div>
              <div className={cn("text-sm font-bold mt-1", node.vibration > 1.0 ? "text-orange-500" : "text-green-500")}>
                {node.vibration > 1.0 ? 'Elevated' : 'Normal'}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[200px] w-full">
            <h3 className="text-xs font-semibold text-gray-500 mb-4 tracking-wider">SENSOR TELEMETRY HISTORY</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={10} tickMargin={10} />
                <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} label={{ value: 'mm', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 10 } }} />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="displacement" stroke="#3b82f6" strokeWidth={2} dot={false} name="Displacement" />
                <Line yAxisId="right" type="monotone" dataKey="tilt" stroke="#f59e0b" strokeWidth={2} dot={false} name="Tilt" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-800 text-xs">
            <div className="flex justify-between items-center text-gray-400">
              <span>Mesh Packet Delivery: <strong className="text-gray-200">{node.packetDelivery}%</strong></span>
              <span>Crack Detected: <strong className={node.crackDetected ? "text-red-400" : "text-green-400"}>{node.crackDetected ? 'YES' : 'NO'}</strong></span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
