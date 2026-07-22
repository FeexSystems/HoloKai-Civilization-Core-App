import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader, DoubleSide, SRGBColorSpace } from "three";
import type { Group, Mesh } from "three";
import type { Unit } from "@/data/units";

type ImagePortraitProps = {
  unit: Unit;
  autoRotate?: boolean;
};

/**
 * Displays a unit's humanoid portrait as a floating holographic plate
 * in the 3D Lab (used until real GLB chassis assets ship).
 */
export function ImagePortrait({ unit, autoRotate = true }: ImagePortraitProps) {
  const group = useRef<Group>(null);
  const plate = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const accent = unit.accent ?? "#f59e0b";

  const texture = useLoader(TextureLoader, unit.fullbodyImage ?? unit.image);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;

  const aspect = useMemo(() => {
    const img = texture.image as { width?: number; height?: number } | undefined;
    if (img?.width && img?.height) return img.width / img.height;
    return 784 / 1168;
  }, [texture]);

  // Portrait plate: height ~2.4 units in scene space
  const height = 2.45;
  const width = height * aspect;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      if (autoRotate) {
        group.current.rotation.y = Math.sin(t * 0.35) * 0.45;
      }
      group.current.position.y = Math.sin(t * 1.05) * 0.05;
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.35;
    }
    if (plate.current) {
      plate.current.position.z = Math.sin(t * 1.8) * 0.012;
    }
  });

  return (
    <group ref={group} position={[0, 0.15, 0]}>
      {/* Floor ring */}
      <mesh ref={ring} position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[Math.max(width, height) * 0.42, 0.012, 12, 64]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.1}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Soft pedestal disc */}
      <mesh position={[0, -1.18, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[Math.max(width, height) * 0.38, 48]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Outer frame */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[width + 0.12, height + 0.12]} />
        <meshStandardMaterial
          color="#111111"
          metalness={0.85}
          roughness={0.35}
          emissive={accent}
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Accent bezel */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[width + 0.04, height + 0.04]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.35}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Portrait image */}
      <mesh ref={plate} position={[0, 0, 0.01]} castShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={texture}
          side={DoubleSide}
          metalness={0.15}
          roughness={0.55}
          emissive={accent}
          emissiveIntensity={0.06}
          transparent
          opacity={0.95}
          alphaTest={0.01}
        />
      </mesh>

      {/* Subtle front glow plane */}
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[width * 0.98, height * 0.98]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
