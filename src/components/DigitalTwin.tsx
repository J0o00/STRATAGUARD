import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line, Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import type { SensorData, SimulationState } from '../types';

interface DigitalTwinProps {
  state: SimulationState;
  selectedNode: string | null;
  onSelectNode: (id: string) => void;
  onSelectPanel: (id: string) => void;
}

const colorMap = {
  NORMAL: '#22c55e',
  WATCH: '#eab308',
  WARNING: '#f97316',
  CRITICAL: '#ef4444',
  OFFLINE: '#6b7280',
};

// --- Sub-components for the 3D Scene ---

const Terrain: React.FC<{ deformationLevel: number, showHeatmap: boolean, visible: boolean }> = ({ deformationLevel, showHeatmap, visible }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a grid for the terrain
  const gridDivisions = 30;
  const size = 20;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, gridDivisions, gridDivisions);
    geo.rotateX(-Math.PI / 2); // Lay flat
    return geo;
  }, [size, gridDivisions]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const positions = meshRef.current.geometry.attributes.position;
    const colors = meshRef.current.geometry.attributes.color;
    
    // Default color array if not exists
    if (!colors) {
      const colorArray = new Float32Array(positions.count * 3);
      meshRef.current.geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    }
    
    const colorAttr = meshRef.current.geometry.attributes.color as THREE.BufferAttribute;

    // S5 is at center (0,0) approx
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      
      // Calculate distance to epicenter (x:0, z:0 approx for S5)
      const dist = Math.sqrt(x*x + z*z);
      
      // Base terrain noise
      let y = Math.sin(x * 0.5 + time * 0.2) * 0.2 + Math.cos(z * 0.5 + time * 0.1) * 0.2;
      
      // Deformation
      let deform = 0;
      let heatColor = new THREE.Color('#1f2937'); // Default gray/blueish

      if (deformationLevel > 0) {
        const impact = Math.max(0, 1 - dist / 8); // Area of effect
        deform = -impact * (deformationLevel * 0.8);
        
        if (showHeatmap) {
          if (impact > 0.8 && deformationLevel >= 5) heatColor.set('#ef4444');
          else if (impact > 0.6 && deformationLevel >= 4) heatColor.set('#f97316');
          else if (impact > 0.4 && deformationLevel >= 2) heatColor.set('#eab308');
          else if (impact > 0) heatColor.set('#4ade80');
        }
      }

      positions.setY(i, y + deform);
      colorAttr.setXYZ(i, heatColor.r, heatColor.g, heatColor.b);
    }
    positions.needsUpdate = true;
    colorAttr.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, 0]} visible={visible}>
      <meshStandardMaterial 
        vertexColors={showHeatmap} 
        color={showHeatmap ? undefined : '#2a3b4c'} 
        wireframe={!showHeatmap}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const UndergroundMine: React.FC<{ visible: boolean, onSelectPanel: (id: string) => void }> = ({ visible, onSelectPanel }) => {
  return (
    <group position={[0, -10, 0]} visible={visible}>
      {/* Coal Seam Base */}
      <Box args={[18, 0.5, 18]} position={[0, -2, 0]}>
        <meshStandardMaterial color="#111" transparent opacity={0.5} />
      </Box>
      
      {/* Main Tunnels */}
      <Box args={[2, 2, 16]} position={[-4, -1, 0]}>
        <meshStandardMaterial color="#333" />
      </Box>
      <Box args={[2, 2, 16]} position={[4, -1, 0]}>
        <meshStandardMaterial color="#333" />
      </Box>
      <Box args={[10, 2, 2]} position={[0, -1, 0]}>
        <meshStandardMaterial color="#333" />
      </Box>
      <Box args={[10, 2, 2]} position={[0, -1, 6]}>
        <meshStandardMaterial color="#333" />
      </Box>

      {/* Panels */}
      <mesh position={[0, -1, -4]} onClick={(e) => { e.stopPropagation(); onSelectPanel('P-01'); }}>
        <boxGeometry args={[6, 1.8, 6]} />
        <meshStandardMaterial color="#444" wireframe />
        <Html position={[0, 2, 0]} center><div className="text-[10px] text-gray-400 font-bold bg-black/50 px-1 rounded cursor-pointer pointer-events-none">PANEL P-01</div></Html>
      </mesh>
      
      <mesh position={[0, -1, 3]} onClick={(e) => { e.stopPropagation(); onSelectPanel('P-03'); }}>
        <boxGeometry args={[6, 1.8, 4]} />
        <meshStandardMaterial color="#555" />
        <Html position={[0, 2, 0]} center><div className="text-xs text-white font-bold bg-blue-900/80 px-2 py-0.5 rounded cursor-pointer pointer-events-none border border-blue-500">PANEL P-03 (ACTIVE)</div></Html>
      </mesh>

      {/* Shaft */}
      <Cylinder args={[1.5, 1.5, 12]} position={[6, 5, 6]}>
        <meshStandardMaterial color="#222" wireframe />
      </Cylinder>
    </group>
  );
};

const SensorNodes: React.FC<{ 
  nodes: Record<string, SensorData>, 
  visible: boolean, 
  selectedNode: string | null,
  onSelectNode: (id: string) => void
}> = ({ nodes, visible, selectedNode, onSelectNode }) => {
  if (!visible) return null;

  // Map nodes to 3D grid (-6 to +6)
  const getPos = (n: SensorData): [number, number, number] => {
    return [(n.x - 1) * 6, 0.5, (n.y - 1) * 6];
  };

  return (
    <group>
      {Object.values(nodes).map(node => {
        const isSelected = selectedNode === node.id;
        const color = colorMap[node.status];
        const pos = getPos(node);
        
        // Dynamic y based on displacement
        const deformY = node.displacement * 0.1;

        return (
          <group key={node.id} position={[pos[0], pos[1] - deformY, pos[2]]}>
            <mesh onClick={(e) => { e.stopPropagation(); onSelectNode(node.id); }}>
              <cylinderGeometry args={[0.5, 0.5, 1]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isSelected ? 0.8 : 0.2} />
            </mesh>
            {isSelected && (
              <mesh position={[0, 1, 0]}>
                <ringGeometry args={[0.8, 1, 32]} />
                <meshBasicMaterial color="white" side={THREE.DoubleSide} />
              </mesh>
            )}
            <Html position={[0, 1.5, 0]} center zIndexRange={[100, 0]}>
              <div className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap cursor-pointer transition-colors border shadow-lg backdrop-blur-md
                ${isSelected ? 'bg-white text-black border-white scale-110' : 'bg-black/80 text-white border-gray-700 hover:border-gray-500'}`}
                onClick={() => onSelectNode(node.id)}
              >
                {node.id}
                {node.status !== 'NORMAL' && <div className="text-[10px] uppercase opacity-80" style={{color: colorMap[node.status]}}>{node.status}</div>}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};

const MeshNetwork: React.FC<{ 
  nodes: Record<string, SensorData>, 
  visible: boolean, 
  failedNode: string | null 
}> = ({ nodes, visible, failedNode }) => {
  if (!visible) return null;

  const defaultEdges = [
    ['S1', 'S2'], ['S2', 'S3'],
    ['S4', 'S5'], ['S5', 'S6'],
    ['S7', 'S8'], ['S8', 'S9'],
    ['S1', 'S4'], ['S4', 'S7'],
    ['S2', 'S5'], ['S5', 'S8'],
    ['S3', 'S6'], ['S6', 'S9']
  ];

  const activeEdges = failedNode 
    ? defaultEdges.filter(([a, b]) => a !== failedNode && b !== failedNode)
    : defaultEdges;

  if (failedNode === 'S5') {
    activeEdges.push(['S4', 'S8'], ['S2', 'S6'], ['S8', 'S6']); // Re-routing
  } else if (failedNode === 'S2') {
    activeEdges.push(['S1', 'S5'], ['S5', 'S3']);
  }

  const getPos = (id: string) => {
    const n = nodes[id];
    if (!n) return [0,0,0] as [number, number, number];
    const deformY = n.displacement * 0.1;
    return [(n.x - 1) * 6, 0.5 - deformY, (n.y - 1) * 6] as [number, number, number];
  };

  return (
    <group>
      {activeEdges.map(([a, b], i) => (
        <Line 
          key={i}
          points={[getPos(a), getPos(b)]}
          color="#3b82f6"
          lineWidth={2}
          dashed={true}
          dashScale={2}
          dashSize={0.5}
          dashOffset={0}
        />
      ))}
      
      {/* Gateway Connection */}
      {['S3', 'S6', 'S9'].map(id => {
        if (id === failedNode) return null;
        return (
          <Line
            key={`gw-${id}`}
            points={[getPos(id), [12, 1, (nodes[id].y - 1) * 6]]}
            color="#10b981"
            lineWidth={3}
            transparent
            opacity={0.6}
          />
        );
      })}

      {/* Gateway Node */}
      <group position={[12, 1, 0]}>
        <Box args={[2, 2, 2]}>
          <meshStandardMaterial color="#1e3a8a" />
        </Box>
        <Html position={[0, 2, 0]} center>
          <div className="bg-blue-900/80 border border-blue-500 text-blue-200 text-xs font-bold px-2 py-1 rounded">
            EDGE GATEWAY
          </div>
        </Html>
      </group>
    </group>
  );
};


export const DigitalTwin: React.FC<DigitalTwinProps> = ({ state, selectedNode, onSelectNode, onSelectPanel }) => {
  const isSurface = state.viewMode === 'SURFACE' || state.viewMode === 'COMBINED';
  const isUnderground = state.viewMode === 'UNDERGROUND' || state.viewMode === 'COMBINED';
  
  // Dynamic camera positioning
  const camPos = state.viewMode === 'SURFACE' ? [0, 15, 20] : 
                 state.viewMode === 'UNDERGROUND' ? [0, -5, 25] : [20, 15, 25];

  return (
    <div className="w-full h-full relative glass-panel overflow-hidden border border-gray-800/80 bg-gradient-to-b from-[#0f172a] to-[#020617]">
      <Canvas camera={{ position: camPos as [number, number, number], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1} color="#ffffff" />
        <pointLight position={[0, -10, 0]} intensity={0.5} color="#444" />
        
        <Terrain deformationLevel={state.deformationLevel} showHeatmap={state.showHeatmap} visible={isSurface} />
        <UndergroundMine visible={isUnderground} onSelectPanel={onSelectPanel} />
        
        <SensorNodes 
          nodes={state.nodes} 
          visible={state.showSensors && isSurface} 
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
        />
        
        <MeshNetwork 
          nodes={state.nodes} 
          visible={state.showMesh && isSurface} 
          failedNode={state.failedNode}
        />

        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          maxPolarAngle={Math.PI / 2 + 0.2}
          target={[0, state.viewMode === 'UNDERGROUND' ? -10 : 0, 0]}
          autoRotate={state.isPresentationMode}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      {/* Overlay UI for Digital Twin Controls */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur border border-gray-700/50 rounded-lg p-2 flex flex-col gap-2 z-10">
        <div className="text-[10px] text-gray-400 font-bold tracking-widest px-2 pb-1 border-b border-gray-700 mb-1">DIGITAL TWIN VIEW</div>
        <div className="flex gap-1 bg-gray-900/50 p-1 rounded">
          {['SURFACE', 'UNDERGROUND', 'COMBINED'].map(mode => (
            <button key={mode} className={`text-xs px-2 py-1 rounded font-medium ${state.viewMode === mode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
              onClick={() => { /* State update needs to bubble up to App, but for now we dispatch an event or pass a prop. Let's assume we pass a prop or use global. */ window.dispatchEvent(new CustomEvent('SET_VIEW_MODE', { detail: mode }))}}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
