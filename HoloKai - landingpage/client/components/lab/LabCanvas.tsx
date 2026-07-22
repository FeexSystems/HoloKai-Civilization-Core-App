import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Grid,
  OrbitControls,
  PerspectiveCamera,
  Sparkles,
  Stars,
} from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import type { Unit } from "@/data/units";
import { UnitModel, type LabDisplayMode } from "./UnitModel";

type LabCanvasProps = {
  unit: Unit;
  autoRotate: boolean;
  muted?: boolean;
  mode?: LabDisplayMode;
};

function LabLights({ accent }: { accent: string }) {
  return (
    <>
      <ambientLight intensity={0.28} />
      <hemisphereLight args={["#fff7ed", "#0a0a0a", 0.35]} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={20}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} color="#93c5fd" />
      <pointLight position={[-3, 2.2, -2]} intensity={0.85} color={accent} distance={12} />
      <pointLight position={[2.5, 1.8, 3]} intensity={0.45} color="#fff7ed" distance={10} />
      <spotLight
        position={[0, 7, 1]}
        angle={0.32}
        penumbra={0.7}
        intensity={1.1}
        color={accent}
        castShadow
      />
      <spotLight
        position={[0, 2, 5]}
        angle={0.4}
        penumbra={0.8}
        intensity={0.35}
        color="#fde68a"
      />
    </>
  );
}

function LabFloor({ accent }: { accent: string }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]} receiveShadow>
        <circleGeometry args={[7, 64]} />
        <meshStandardMaterial color="#060606" metalness={0.7} roughness={0.75} />
      </mesh>
      <Grid
        position={[0, -1.14, 0]}
        args={[14, 14]}
        cellSize={0.35}
        cellThickness={0.55}
        cellColor="#27272a"
        sectionSize={1.75}
        sectionThickness={1.15}
        sectionColor={accent}
        fadeDistance={10}
        fadeStrength={1.5}
        infiniteGrid
      />
      <ContactShadows
        position={[0, -1.14, 0]}
        opacity={0.65}
        scale={10}
        blur={2.6}
        far={5}
        color="#000000"
      />
    </>
  );
}

/**
 * Cinematic WebGL viewport for Vanguard units —
 * studio lighting, volumetric sparkles, dual media modes.
 */
export function LabCanvas({
  unit,
  autoRotate,
  muted = true,
  mode = "dual",
}: LabCanvasProps) {
  const accent = unit.accent ?? "#f59e0b";

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: ACESFilmicToneMapping,
      }}
      className="h-full w-full touch-none"
      onCreated={({ gl }) => {
        gl.setClearColor("#020202", 1);
        gl.toneMappingExposure = 1.05;
      }}
    >
      <PerspectiveCamera makeDefault position={[0, 0.8, 3.2]} fov={42} />
      <fog attach="fog" args={["#020202", 6, 18]} />
      <LabLights accent={accent} />
      <Stars radius={50} depth={40} count={1800} factor={2.8} saturation={0} fade speed={0.35} />
      <Sparkles
        count={40}
        scale={[6, 4, 6]}
        size={1.5}
        speed={0.25}
        opacity={0.35}
        color={accent}
      />
      <Environment preset="city" environmentIntensity={0.45} />

      <Float speed={1.1} rotationIntensity={0.08} floatIntensity={0.15}>
        <UnitModel
          key={`${unit.id}-${mode}`}
          unit={unit}
          autoRotate={autoRotate}
          muted={muted}
          mode={mode}
        />
      </Float>
      <LabFloor accent={accent} />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={1.8}
        maxDistance={8}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2 - 0.02}
        target={[0, 0.25, 0]}
        enableDamping
        dampingFactor={0.055}
      />
    </Canvas>
  );
}
