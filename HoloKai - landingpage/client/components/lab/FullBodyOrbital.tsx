import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { DoubleSide, SRGBColorSpace, TextureLoader } from "three";
import type { Group, Mesh } from "three";
import type { Unit } from "@/data/units";

type FullBodyOrbitalProps = {
  unit: Unit;
  autoRotate?: boolean;
};

/**
 * Photoreal full-body key art displayed in a premium orbital rig.
 * Drag the viewport (OrbitControls) or enable auto-orbit to inspect the unit.
 */
export function FullBodyOrbital({ unit, autoRotate = true }: FullBodyOrbitalProps) {
  const group = useRef<Group>(null);
  const plate = useRef<Mesh>(null);
  const innerRing = useRef<Mesh>(null);
  const outerRing = useRef<Mesh>(null);
  const accent = unit.accent ?? "#f59e0b";

  const imageSrc = unit.fullbodyImage ?? unit.image;
  const texture = useLoader(TextureLoader, imageSrc);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 16;

  const aspect = useMemo(() => {
    const img = texture.image as { width?: number; height?: number } | undefined;
    if (img?.width && img?.height) return img.width / img.height;
    return 687 / 1024;
  }, [texture]);

  const height = 3.4;
  const width = height * aspect;
  const footprint = Math.max(width, height) * 0.38;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      if (autoRotate) {
        group.current.rotation.y += delta * 0.42;
      }
      group.current.position.y = Math.sin(t * 0.85) * 0.045;
    }
    if (innerRing.current) {
      innerRing.current.rotation.z = t * 0.32;
    }
    if (outerRing.current) {
      outerRing.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.08;
      outerRing.current.rotation.y = t * 0.18;
    }
    if (plate.current) {
      plate.current.position.z = Math.sin(t * 1.4) * 0.015;
    }
  });

  return (
    <group ref={group} position={[0, 0.08, 0]}>
      {/* Floor orbit ring */}
      <mesh ref={innerRing} position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[footprint, 0.014, 16, 96]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.25}
          transparent
          opacity={0.82}
        />
      </mesh>

      {/* Tilted halo ring */}
      <mesh ref={outerRing} position={[0, 0.45, 0]}>
        <torusGeometry args={[footprint * 0.92, 0.006, 12, 80]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive={accent}
          emissiveIntensity={0.65}
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Pedestal */}
      <mesh position={[0, -1.58, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[footprint * 0.72, 64]} />
        <meshStandardMaterial color="#080808" metalness={0.82} roughness={0.38} />
      </mesh>

      {/* Outer chassis frame */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[width + 0.16, height + 0.16]} />
        <meshStandardMaterial
          color="#0c0c0e"
          metalness={0.9}
          roughness={0.28}
          emissive={accent}
          emissiveIntensity={0.06}
        />
      </mesh>

      {/* Accent bezel */}
      <mesh position={[0, 0, -0.025]}>
        <planeGeometry args={[width + 0.05, height + 0.05]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.42}
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>

      {/* Full-body key art */}
      <mesh ref={plate} position={[0, 0, 0.01]} castShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={texture}
          side={DoubleSide}
          metalness={0.08}
          roughness={0.48}
          emissive="#ffffff"
          emissiveIntensity={0.04}
          emissiveMap={texture}
          transparent
          opacity={0.95}
          alphaTest={0.01}
        />
      </mesh>

      {/* Front volumetric wash */}
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[width * 0.99, height * 0.99]} />
        <meshBasicMaterial color={accent} transparent opacity={0.035} depthWrite={false} />
      </mesh>

      {/* Scan line accent */}
      <mesh position={[0, -height * 0.42, 0.04]}>
        <planeGeometry args={[width * 0.88, 0.004]} />
        <meshBasicMaterial color={accent} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}