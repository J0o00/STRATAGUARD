import React from 'react';
import type { SensorData } from '../types';
import { cn } from '../lib/utils';
import { RadioTower, Activity } from 'lucide-react';

interface MineMapProps {
  nodes: Record<string, SensorData>;
  failedNode: string | null;
  selectedNode: string | null;
  onSelectNode: (id: string) => void;
}

const colorMap = {
  NORMAL: 'bg-green-500 shadow-green-500/50',
  WATCH: 'bg-yellow-500 shadow-yellow-500/50',
  WARNING: 'bg-orange-500 shadow-orange-500/50',
  CRITICAL: 'bg-red-500 shadow-red-500/50 hover:animate-pulse',
  OFFLINE: 'bg-gray-500 shadow-gray-500/50',
};

const borderMap = {
  NORMAL: 'border-green-500',
  WATCH: 'border-yellow-500',
  WARNING: 'border-orange-500',
  CRITICAL: 'border-red-500',
  OFFLINE: 'border-gray-500',
};

export const MineMap: React.FC<MineMapProps> = ({ nodes, failedNode, selectedNode, onSelectNode }) => {
  // Define edges for the mesh
  const defaultEdges = [
    ['S1', 'S2'], ['S2', 'S3'],
    ['S4', 'S5'], ['S5', 'S6'],
    ['S7', 'S8'], ['S8', 'S9'],
    ['S1', 'S4'], ['S4', 'S7'],
    ['S2', 'S5'], ['S5', 'S8'],
    ['S3', 'S6'], ['S6', 'S9']
  ];

  const getActiveEdges = () => {
    if (!failedNode) return defaultEdges;
    // Remove edges connected to failed node
    const active = defaultEdges.filter(([a, b]) => a !== failedNode && b !== failedNode);
    // Add alternate routes if needed (e.g., if S2 fails, maybe S1 connects directly to S4, S4 to S5 etc - which is already there, but we can highlight alternate path)
    return active;
  };
  
  const edges = getActiveEdges();

  // Helper to get coordinates for SVG lines
  const getCoords = (id: string) => {
    const node = nodes[id];
    if (!node) return { x: 0, y: 0 };
    // Map x (0-2) and y (0-2) to SVG percentages
    return {
      x: 20 + node.x * 30, // 20%, 50%, 80%
      y: 20 + node.y * 30,
    };
  };

  return (
    <div className="relative w-full aspect-square md:aspect-[4/3] glass-panel p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-wide flex items-center gap-2">
            <Activity className="text-blue-400" />
            SURFACE SENSOR NETWORK
          </h2>
          <p className="text-sm text-gray-400">Panel P-03 Area</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-900/30 px-3 py-1.5 rounded border border-blue-800/50">
          <RadioTower className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-200">EDGE GATEWAY</span>
        </div>
      </div>

      <div className="flex-1 relative w-full h-full mt-4">
        {/* SVG for connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {/* Gateway connection lines to rightmost nodes (S3, S6, S9) */}
          {[nodes['S3'], nodes['S6'], nodes['S9']].map(node => {
            if (!node || node.id === failedNode) return null;
            const coords = getCoords(node.id);
            return (
              <line
                key={`gw-${node.id}`}
                x1={`${coords.x}%`}
                y1={`${coords.y}%`}
                x2="95%"
                y2="50%"
                stroke="#1e3a8a" // blue-900
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            );
          })}
          
          {edges.map(([a, b]) => {
            const p1 = getCoords(a);
            const p2 = getCoords(b);
            const isAlternate = failedNode && (
              (failedNode === 'S2' && ((a==='S1'&&b==='S4') || (a==='S4'&&b==='S5'))) ||
              (failedNode === 'S5' && ((a==='S4'&&b==='S7') || (a==='S7'&&b==='S8') || (a==='S8'&&b==='S9') || (a==='S6'&&b==='S9')))
            );

            return (
              <line
                key={`${a}-${b}`}
                x1={`${p1.x}%`}
                y1={`${p1.y}%`}
                x2={`${p2.x}%`}
                y2={`${p2.y}%`}
                stroke={isAlternate ? "#3b82f6" : "#4b5563"}
                strokeWidth={isAlternate ? "3" : "2"}
                strokeDasharray={isAlternate ? "none" : "none"}
                className={cn("transition-all duration-1000", isAlternate && "animate-pulse")}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {Object.values(nodes).map(node => {
          const coords = getCoords(node.id);
          const isSelected = selectedNode === node.id;
          
          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 z-10 hover:scale-110",
                colorMap[node.status],
                "shadow-lg text-white",
                isSelected && `ring-4 ring-offset-2 ring-offset-[#0b0c10] ${borderMap[node.status]}`
              )}
              style={{
                left: `${coords.x}%`,
                top: `${coords.y}%`,
              }}
            >
              {node.id}
            </button>
          );
        })}

        {/* Gateway Icon */}
        <div 
          className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-1 z-10 bg-[#0b0c10] p-2 rounded-lg border border-blue-900"
          style={{ right: '0%' }}
        >
          <RadioTower className="w-8 h-8 text-blue-500 animate-pulse" />
          <span className="text-[10px] font-bold text-blue-400">GW-01</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex justify-center gap-4 text-xs font-medium bg-black/40 py-2 rounded-lg border border-gray-800">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500"></div> NORMAL</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> WATCH</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> WARNING</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div> CRITICAL</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-500"></div> OFFLINE</div>
      </div>
    </div>
  );
};
