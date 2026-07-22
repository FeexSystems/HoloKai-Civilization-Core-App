import {
  Component,
  Suspense,
  useMemo,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Center, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Unit } from "@/data/units";
import { FullBodyOrbital } from "./FullBodyOrbital";
import { ImagePortrait } from "./ImagePortrait";
import { VideoPortrait } from "./VideoPortrait";

export type LabDisplayMode = "video" | "humanoid" | "dual";

type UnitModelProps = {
  unit: Unit;
  autoRotate?: boolean;
  muted?: boolean;
  mode?: LabDisplayMode;
};

class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; resetKey: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function GltfChassis({
  path,
  autoRotate,
}: {
  path: string;
  autoRotate?: boolean;
}) {
  const { scene } = useGLTF(path);
  const ref = useRef<THREE.Group>(null);
  const clone = useMemo(() => scene.clone(true), [scene]);

  useFrame((_, delta) => {
    if (ref.current && autoRotate) {
      ref.current.rotation.y += delta * 0.28;
    }
  });

  return (
    <Center>
      <group ref={ref} scale={1.4}>
        <primitive object={clone} />
      </group>
    </Center>
  );
}

function LoadingChassis({ accent }: { accent: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 1.2;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.3;
    }
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.55, 1]} />
      <meshStandardMaterial
        color={accent}
        emissive={accent}
        emissiveIntensity={0.6}
        wireframe
      />
    </mesh>
  );
}

/**
 * 3D Lab display:
 * - video: cinematic MP4 plate
 * - humanoid: photoreal full-body orbital key art
 * - dual: orbital figure front + video plate behind
 */
export function UnitModel({
  unit,
  autoRotate = true,
  muted = true,
  mode = "dual",
}: UnitModelProps) {
  const accent = unit.accent ?? "#f59e0b";

  const orbital = (
    <Suspense fallback={<LoadingChassis accent={accent} />}>
      <FullBodyOrbital unit={unit} autoRotate={autoRotate} />
    </Suspense>
  );

  const videoOrImage = unit.video ? (
    <ModelErrorBoundary
      resetKey={`vid-${unit.id}`}
      fallback={
        <Suspense fallback={<LoadingChassis accent={accent} />}>
          <ImagePortrait unit={unit} autoRotate={autoRotate} />
        </Suspense>
      }
    >
      <VideoPortrait unit={unit} autoRotate={autoRotate} muted={muted} />
    </ModelErrorBoundary>
  ) : (
    <Suspense fallback={<LoadingChassis accent={accent} />}>
      <ImagePortrait unit={unit} autoRotate={autoRotate} />
    </Suspense>
  );

  let media: ReactNode = orbital;
  if (mode === "video") {
    media = videoOrImage;
  } else if (mode === "humanoid") {
    media = orbital;
  } else {
    media = (
      <group>
        <group position={[0, 0, -1.1]} scale={0.9}>
          {videoOrImage}
        </group>
        <group position={[0, 0, 0.15]}>{orbital}</group>
      </group>
    );
  }

  const tryGltf =
    import.meta.env.VITE_LAB_LOAD_GLB === "true" && Boolean(unit.modelPath);

  if (!tryGltf || !unit.modelPath) {
    return <>{media}</>;
  }

  return (
    <ModelErrorBoundary resetKey={`glb-${unit.id}`} fallback={media}>
      <Suspense fallback={<LoadingChassis accent={accent} />}>
        <GltfChassis path={unit.modelPath} autoRotate={autoRotate} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
