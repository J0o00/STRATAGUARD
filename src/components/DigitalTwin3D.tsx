import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { SimState } from '../store/simulation';

// ─── Risk colours (professional GIS palette) ─────────────────────────────────
const RISK_HEX: Record<string, string> = {
  NORMAL: '#4C9A5A', WATCH: '#C9A227',
  WARNING: '#D9822B', CRITICAL: '#C43D3D', OFFLINE: '#8A939B',
};

// ─── Canvas-based heatmap texture (GIS-style, no neon) ───────────────────────
function useHeatmapTexture(intensity: number) {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    if (intensity > 0.01) {
      const cx = size * 0.52, cy = size * 0.48;
      const r = size * 0.40 * Math.min(intensity * 1.3, 1);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      // Professional GIS gradient – muted, no neon
      g.addColorStop(0,    `rgba(196, 61, 61, ${0.75 * intensity})`);   // #C43D3D
      g.addColorStop(0.25, `rgba(217,130, 43, ${0.60 * intensity})`);   // #D9822B
      g.addColorStop(0.50, `rgba(201,162, 39, ${0.44 * intensity})`);   // #C9A227
      g.addColorStop(0.75, `rgba( 76,154, 90, ${0.28 * intensity})`);   // #4C9A5A
      g.addColorStop(1,    `rgba( 76,154, 90, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [intensity]);
}

// ─── Geological side wall ─────────────────────────────────────────────────────
function GeologyWall({ position, rotation, width, layers }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  layers: { color: string; height: number; y: number }[];
}) {
  return (
    <group position={position} rotation={rotation ? new THREE.Euler(...rotation) : undefined}>
      {layers.map((l, i) => (
        <mesh key={i} position={[0, l.y, 0]}>
          <boxGeometry args={[width, l.height, 0.18]} />
          <meshStandardMaterial color={l.color} roughness={0.88} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Realistic terrain ────────────────────────────────────────────────────────
function SurfaceTerrain({ deformLevel }: { deformLevel: number }) {
  const ref = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(22, 18, 64, 52);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = Math.sin(x * 0.3 + 0.4) * 0.35
              + Math.cos(z * 0.25) * 0.22
              + Math.sin(x * 0.7 + z * 0.5) * 0.12
              + (Math.random() - 0.5) * 0.04;
      pos.setY(i, y);
      // Realistic muted green/brown terrain
      const moisture = 0.35 + Math.max(y * 0.12 + 0.1, 0);
      const c = new THREE.Color().setHSL(0.29, 0.22, 0.28 + moisture * 0.18);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current || deformLevel < 0.01) return;
    const t = clock.getElapsedTime();
    const pos = ref.current.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const base = Math.sin(x * 0.3 + 0.4) * 0.35 + Math.cos(z * 0.25) * 0.22 + Math.sin(x * 0.7 + z * 0.5) * 0.12;
      const dist = Math.sqrt(x * x + z * z);
      const deform = -Math.max(0, 1 - dist / 5) * deformLevel * 0.45 * (0.93 + 0.07 * Math.sin(t * 1.1));
      pos.setY(i, base + deform);
    }
    pos.needsUpdate = true;
    ref.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={ref} geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.9} metalness={0} />
    </mesh>
  );
}

// ─── GIS Heatmap overlay ──────────────────────────────────────────────────────
function HeatmapOverlay({ intensity }: { intensity: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useHeatmapTexture(intensity);

  useFrame(() => {
    if (ref.current) {
      // No pulsing — professional GIS maps are static
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.min(intensity * 0.72, 0.7);
    }
  });

  if (intensity < 0.01) return null;
  return (
    <mesh ref={ref} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 16]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Underground mine panel ───────────────────────────────────────────────────
function MinePanel({ panelId, x, z, highlighted, deformLevel }: {
  panelId: string; x: number; z: number; highlighted: boolean; deformLevel: number;
}) {
  const glowing = highlighted && deformLevel > 0;
  return (
    <group position={[x, -7.2, z]}>
      <mesh>
        <boxGeometry args={[4.2, 2.4, 3.6]} />
        <meshStandardMaterial
          color={glowing ? '#2d1010' : '#1e1612'}
          emissive={glowing ? '#8B2020' : '#000'}
          emissiveIntensity={glowing ? 0.25 + deformLevel * 0.15 : 0}
          roughness={0.95}
        />
      </mesh>
      {/* Thin structural outline */}
      <mesh>
        <boxGeometry args={[4.25, 2.45, 3.65]} />
        <meshBasicMaterial color={glowing ? '#C43D3D' : '#2a3040'} wireframe />
      </mesh>
      <Html position={[0, 1.8, 0]} center zIndexRange={[1, 0]} distanceFactor={22}>
        <div style={{
          color: glowing ? '#C43D3D' : 'rgba(255,255,255,0.65)',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
          background: glowing ? 'rgba(40,0,0,0.7)' : 'rgba(20,28,40,0.7)',
          border: `1px solid ${glowing ? 'rgba(196,61,61,0.5)' : 'rgba(255,255,255,0.12)'}`,
          padding: '2px 8px', borderRadius: '5px', whiteSpace: 'nowrap',
          backdropFilter: 'blur(8px)', pointerEvents: 'none',
        }}>
          {panelId}{glowing ? ' ⚠' : ''}
        </div>
      </Html>
      {glowing && <pointLight color="#C43D3D" intensity={0.8 + deformLevel} distance={8} />}
    </group>
  );
}

// ─── Support pillar ───────────────────────────────────────────────────────────
function Pillar({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, -6.5, z]} castShadow>
      <cylinderGeometry args={[0.16, 0.20, 2.8, 8]} />
      <meshStandardMaterial color="#4a5060" roughness={0.85} metalness={0.3} />
    </mesh>
  );
}

// ─── Data packet (mesh traffic) ───────────────────────────────────────────────
function DataPacket({ from, to, speed = 1 }: {
  from: [number, number, number]; to: [number, number, number]; speed?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const startVec = useMemo(() => new THREE.Vector3(...from), [from]);
  const endVec   = useMemo(() => new THREE.Vector3(...to),   [to]);
  const offset   = useMemo(() => Math.random(), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.getElapsedTime() * speed * 0.35 + offset) % 1);
    ref.current.position.lerpVectors(startVec, endVec, t);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.8 + 0.1;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 5, 5]} />
      <meshBasicMaterial color="rgba(255,255,255,0.8)" transparent />
    </mesh>
  );
}

// ─── Surface sensor node (realistic, small) ───────────────────────────────────
function SensorNode({ id, px, pz, status, selected, deformY, onClick }: {
  id: string; px: number; pz: number; status: string;
  selected: boolean; deformY: number; onClick: () => void;
}) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const color = RISK_HEX[status] ?? '#4C9A5A';
  const isCritical = status === 'CRITICAL';

  useFrame(({ clock }) => {
    if (!bodyRef.current) return;
    const t = clock.getElapsedTime();
    const mat = bodyRef.current.material as THREE.MeshStandardMaterial;
    // Subtle pulse for critical
    mat.emissiveIntensity = isCritical ? 0.35 + Math.abs(Math.sin(t * 2)) * 0.25 : 0.18;
  });

  const py = 0.55 - deformY * 0.5;

  return (
    <group position={[px, py, pz]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Slim mounting post */}
      <mesh position={[0, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.065, 1.5, 8]} />
        <meshStandardMaterial color="#7a8090" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Sensor box */}
      <mesh ref={bodyRef} position={[0, -0.14, 0]} castShadow>
        <boxGeometry args={[0.28, 0.24, 0.20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.18} roughness={0.45} metalness={0.25} />
      </mesh>
      {/* Solar panel — realistic dark blue */}
      <mesh position={[0, 0.26, 0.05]} rotation={[-0.38, 0, 0]} castShadow>
        <boxGeometry args={[0.44, 0.035, 0.32]} />
        <meshStandardMaterial color="#1a2d4a" emissive="#0a1f3a" emissiveIntensity={0.3} roughness={0.25} metalness={0.7} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0.12, 0.16, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.32, 6]} />
        <meshStandardMaterial color="#c0c8d0" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Selection ring — subtle white */}
      {selected && (
        <mesh position={[0, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.46, 32]} />
          <meshBasicMaterial color="white" side={THREE.DoubleSide} transparent opacity={0.7} />
        </mesh>
      )}
      {/* Minimal point light */}
      <pointLight color={color} intensity={isCritical ? 0.5 : 0.2} distance={3} />
      {/* HTML label */}
      <Html position={[0, 0.82, 0]} center zIndexRange={[10, 0]} distanceFactor={14}>
        <div onClick={onClick} style={{
          padding: '2px 7px', borderRadius: '5px', fontSize: '9px',
          fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
          background: selected ? color : 'rgba(255,255,255,0.80)',
          color: selected ? '#fff' : color,
          border: `1px solid ${color}`,
          backdropFilter: 'blur(8px)',
          boxShadow: selected ? `0 2px 8px ${color}60` : '0 1px 4px rgba(0,0,0,0.12)',
          transition: 'all 0.2s', userSelect: 'none',
        }}>{id}</div>
      </Html>
    </group>
  );
}

// ─── Gateway tower ────────────────────────────────────────────────────────────
function GatewayTower() {
  return (
    <group position={[10.5, 0.4, -2]}>
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[1.1, 0.9, 0.85]} />
        <meshStandardMaterial color="#2a3040" roughness={0.7} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[0.5, 2.6, 0.40]} />
        <meshStandardMaterial color="#2a3a50" emissive="#203040" emissiveIntensity={0.4} roughness={0.5} metalness={0.55} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 1.2, 8]} />
        <meshStandardMaterial color="#8090a0" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Signal beacon — subtle warm white */}
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.10, 10, 10]} />
        <meshStandardMaterial color="#e0e8f0" emissive="#c0d0e0" emissiveIntensity={1.0} />
      </mesh>
      <pointLight position={[0, 3.1, 0]} color="#c0d8f0" intensity={0.8} distance={5} />
      <Html position={[0, 4.0, 0]} center zIndexRange={[5, 0]} distanceFactor={14}>
        <div style={{
          padding: '2px 9px', borderRadius: '5px', fontSize: '9px', fontWeight: 700,
          background: 'rgba(255,255,255,0.82)', color: '#334', border: '1px solid rgba(0,0,0,0.1)',
          backdropFilter: 'blur(8px)', pointerEvents: 'none', letterSpacing: '0.06em',
        }}>GATEWAY</div>
      </Html>
    </group>
  );
}

// ─── Camera initialiser ───────────────────────────────────────────────────────
function CameraInit({ viewMode }: { viewMode: string }) {
  const { camera } = useThree();
  const done = useRef(false);
  if (!done.current) {
    if (viewMode === 'UNDERGROUND') {
      camera.position.set(16, 3, 22);
      (camera as THREE.PerspectiveCamera).lookAt(0, -7, 0);
    } else if (viewMode === 'SURFACE') {
      camera.position.set(0, 24, 5);
      (camera as THREE.PerspectiveCamera).lookAt(0, 0, 0);
    } else {
      camera.position.set(20, 14, 20);
      (camera as THREE.PerspectiveCamera).lookAt(0, -3, 0);
    }
    done.current = true;
  }
  return null;
}

// ─── Full 3D mine scene ───────────────────────────────────────────────────────
function MineScene({ state, selectedNode, onSelectNode }: {
  state: SimState; selectedNode: string; onSelectNode: (id: string) => void;
}) {
  const { stage, nodeFailure, nodes, selectedPanel, viewMode = 'COMBINED' } = state;
  const deformLevel = stage / 5;
  const heatIntensity = stage / 5;

  const NODE_POS: Record<string, [number, number, number]> = {
    S1: [-6, 0, -4.5], S2: [0, 0, -4.5], S3: [6, 0, -4.5],
    S4: [-6, 0, 0],    S5: [0, 0, 0],    S6: [6, 0, 0],
    S7: [-6, 0, 4.5],  S8: [0, 0, 4.5],  S9: [6, 0, 4.5],
  };

  const EDGES: [string, string][] = [
    ['S1','S2'], ['S2','S3'], ['S4','S5'], ['S5','S6'], ['S7','S8'], ['S8','S9'],
    ['S1','S4'], ['S4','S7'], ['S2','S5'], ['S5','S8'], ['S3','S6'], ['S6','S9'],
  ];
  const activeEdges = nodeFailure ? EDGES.filter(([a, b]) => a !== 'S5' && b !== 'S5') : EDGES;
  const reroutedEdges: [string, string][] = nodeFailure ? [['S4','S8'],['S2','S8'],['S8','S6']] : [];

  const gwPos: [number, number, number] = [10.5, 1.4, -2];

  const isSurface    = viewMode !== 'UNDERGROUND';
  const isUnderground = viewMode !== 'SURFACE';

  // Geological layers — realistic earthy palette
  const geoLayers = [
    { color: '#4a3828', height: 2.2, y: -0.9 },  // topsoil
    { color: '#5a4838', height: 1.5, y: -2.5 },  // subsoil
    { color: '#484038', height: 1.4, y: -3.8 },  // rock
    { color: '#3c3830', height: 1.0, y: -5.0 },  // shale
    { color: '#282420', height: 0.8, y: -5.8 },  // coal seam
    { color: '#1c1a14', height: 2.2, y: -7.0 },  // mine level
  ];

  return (
    <>
      <CameraInit viewMode={viewMode} />

      {/* Atmospheric lighting */}
      <ambientLight intensity={0.45} color="#c8d8e8" />
      <directionalLight
        position={[16, 22, 12]} intensity={1.2} color="#fff5e8"
        castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22} shadow-camera-right={22}
        shadow-camera-top={22} shadow-camera-bottom={-22}
      />
      <directionalLight position={[-8, 8, -6]} intensity={0.28} color="#9ab0c8" />
      {/* Subtle underground warm glow from deformation */}
      <pointLight position={[0, -6, 0]} color="#C43D3D" intensity={deformLevel * 1.8} distance={14} />

      {/* ── SURFACE ── */}
      {isSurface && (
        <group>
          <SurfaceTerrain deformLevel={deformLevel} />
          {state.showHeatmap && <HeatmapOverlay intensity={heatIntensity} />}

          {/* Sensor nodes */}
          {state.showSensors && Object.values(nodes).map(n => (
            <SensorNode key={n.id} id={n.id}
              px={NODE_POS[n.id][0]} pz={NODE_POS[n.id][2]}
              status={n.status} selected={selectedNode === n.id}
              deformY={n.displacement * 0.02}
              onClick={() => onSelectNode(n.id)}
            />
          ))}

          {/* Mesh communication lines — thin, muted */}
          {state.showMesh && activeEdges.map(([a, b], i) => (
            <Line key={i} points={[NODE_POS[a], NODE_POS[b]]}
              color="rgba(180,200,220,0.7)" lineWidth={1.4} transparent opacity={0.45}
            />
          ))}
          {state.showMesh && reroutedEdges.map(([a, b], i) => (
            <Line key={`r${i}`} points={[NODE_POS[a], NODE_POS[b]]}
              color="#D9822B" lineWidth={2.8} transparent opacity={0.8}
            />
          ))}

          {/* Data packets */}
          {state.showMesh && activeEdges.slice(0, 6).map(([a, b], i) => (
            <DataPacket key={i} from={NODE_POS[a]} to={NODE_POS[b]} speed={0.7 + i * 0.12} />
          ))}

          {/* Gateway links */}
          {state.showMesh && (['S3', 'S6'] as const).map(id => (
            <Line key={`gw-${id}`} points={[NODE_POS[id], gwPos]}
              color="rgba(180,200,220,0.6)" lineWidth={1.8} transparent opacity={0.55}
            />
          ))}

          <GatewayTower />

          {/* Depth label annotations */}
          <Html position={[-11.2, 0, 0]} center zIndexRange={[1, 0]} distanceFactor={16}>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'8px', fontWeight:700, letterSpacing:'0.12em', pointerEvents:'none', whiteSpace:'nowrap' }}>SURFACE</div>
          </Html>
        </group>
      )}

      {/* ── UNDERGROUND ── */}
      {isUnderground && (
        <group>
          {/* Front wall */}
          <GeologyWall position={[0, -3.7, 8.1]} width={22.5} layers={geoLayers} />
          {/* Left wall */}
          <GeologyWall position={[-11.1, -3.7, 0]} rotation={[0, Math.PI / 2, 0]} width={18.5} layers={geoLayers} />
          {/* Right wall (semi-transparent to see inside) */}
          <GeologyWall position={[11.1, -3.7, 0]} rotation={[0, Math.PI / 2, 0]} width={18.5}
            layers={geoLayers.map(l => ({ ...l, color: l.color + '66' }))} />
          {/* Back wall */}
          <GeologyWall position={[0, -3.7, -8.1]} width={22.5}
            layers={geoLayers.map(l => ({ ...l, color: l.color + '66' }))} />

          {/* Floor */}
          <mesh position={[0, -8.28, 0]} receiveShadow>
            <boxGeometry args={[22.5, 0.22, 18.5]} />
            <meshStandardMaterial color="#161412" roughness={1} />
          </mesh>

          {/* Mine panels */}
          <MinePanel panelId="P-01" x={-7.5} z={0} highlighted={selectedPanel==='P-01'} deformLevel={deformLevel} />
          <MinePanel panelId="P-02" x={-2.5} z={0} highlighted={selectedPanel==='P-02'} deformLevel={deformLevel} />
          <MinePanel panelId="P-03" x={2.5}  z={0} highlighted={selectedPanel==='P-03' || stage >= 3} deformLevel={deformLevel} />
          <MinePanel panelId="P-04" x={7.5}  z={0} highlighted={selectedPanel==='P-04'} deformLevel={deformLevel} />

          {/* Connecting tunnels */}
          {[-1.1, 1.1].map((z, i) => (
            <mesh key={i} position={[0, -7.0, z]}>
              <boxGeometry args={[22, 1.5, 0.65]} />
              <meshStandardMaterial color="#1a1612" roughness={0.95} />
            </mesh>
          ))}

          {/* Support pillars */}
          {([-6.2, -1.2, 1.2, 6.2] as number[]).flatMap(x =>
            ([-2.8, 0, 2.8] as number[]).map(z => (
              <Pillar key={`${x}-${z}`} x={x} z={z} />
            ))
          )}

          {/* Vertical connection lines (surface → panels) */}
          {isSurface && (['S5', 'S4', 'S6'] as const).map(id => (
            <Line key={`v-${id}`}
              points={[NODE_POS[id], [NODE_POS[id][0], -7.5, NODE_POS[id][2]]]}
              color="white" lineWidth={0.6} transparent opacity={0.08}
            />
          ))}

          {/* Depth labels */}
          {[
            { y: -0.5, label: '0 m · Surface' },
            { y: -3.7, label: '-80 m · Overburden' },
            { y: -5.8, label: '-160 m · Coal Seam' },
            { y: -7.5, label: '-250 m · Mine Level' },
          ].map(({ y, label }) => (
            <Html key={label} position={[-10.5, y, 8.4]} center zIndexRange={[1, 0]} distanceFactor={18}>
              <div style={{ color:'rgba(255,255,255,0.45)', fontSize:'8px', fontWeight:700, letterSpacing:'0.06em', pointerEvents:'none', whiteSpace:'nowrap' }}>{label}</div>
            </Html>
          ))}
        </group>
      )}

      <OrbitControls
        enablePan enableZoom enableRotate
        minDistance={7} maxDistance={48}
        maxPolarAngle={Math.PI / 2 + 0.2}
        target={[0, -2.5, 0]}
        autoRotate={state.presentationMode}
        autoRotateSpeed={0.35}
      />
    </>
  );
}



// ─── Main export ──────────────────────────────────────────────────────────────
interface DigitalTwinProps {
  state: SimState;
  selectedNode: string;
  onSelectNode: (id: string) => void;

}

export default function DigitalTwin3D({ state, selectedNode, onSelectNode }: DigitalTwinProps) {

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 40, near: 0.5, far: 300 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, alpha: true }}
      >
        <MineScene state={state} selectedNode={selectedNode} onSelectNode={onSelectNode} />
      </Canvas>
    </div>
  );
}
