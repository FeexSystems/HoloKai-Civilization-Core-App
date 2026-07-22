import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Unit } from "@/data/units";

type ProceduralUnitProps = {
  unit: Unit;
  autoRotate?: boolean;
};

/** Unit-specific silhouette knobs derived from id. */
function silhouetteFor(id: string) {
  const n = Number.parseInt(id, 10) || 1;
  return {
    height: 1 + (n % 3) * 0.08,
    shoulder: 0.42 + (n % 2) * 0.08,
    headScale: n === 1 ? 0.9 : n === 7 ? 1.15 : 1,
    corePulse: 0.8 + (n % 4) * 0.1,
    armSpan: 0.55 + (n % 3) * 0.05,
  };
}

/**
 * Stylized humanoid stand-in for the 3D Lab when a glTF asset is not available.
 * Distinct proportions per unit; materials tinted with the unit accent.
 */
export function ProceduralUnit({ unit, autoRotate = true }: ProceduralUnitProps) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const accent = unit.accent ?? "#f59e0b";
  const sil = useMemo(() => silhouetteFor(unit.id), [unit.id]);

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a1a1c",
        metalness: 0.85,
        roughness: 0.28,
        envMapIntensity: 1.2,
      }),
    [],
  );

  const accentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.65,
        metalness: 0.4,
        roughness: 0.35,
      }),
    [accent],
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.35,
        metalness: 0.1,
        roughness: 0.15,
        transmission: 0.35,
        thickness: 0.4,
        transparent: true,
        opacity: 0.92,
      }),
    [accent],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current && autoRotate) {
      group.current.rotation.y = t * 0.28;
    }
    if (group.current) {
      group.current.position.y = Math.sin(t * 1.1) * 0.04;
    }
    if (core.current) {
      const s = sil.corePulse + Math.sin(t * 2.4) * 0.08;
      core.current.scale.setScalar(s);
      const mat = core.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.25;
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.4;
      ring.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.08;
    }
  });

  const y0 = -1.05;

  return (
    <group ref={group} scale={sil.height} position={[0, 0.15, 0]}>
      {/* Floor marker ring */}
      <mesh ref={ring} position={[0, y0 + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.012, 12, 64]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.9}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.14, y0 + 0.35, 0]} material={bodyMat} castShadow>
        <capsuleGeometry args={[0.08, 0.45, 6, 12]} />
      </mesh>
      <mesh position={[0.14, y0 + 0.35, 0]} material={bodyMat} castShadow>
        <capsuleGeometry args={[0.08, 0.45, 6, 12]} />
      </mesh>

      {/* Pelvis */}
      <mesh position={[0, y0 + 0.68, 0]} material={bodyMat} castShadow>
        <boxGeometry args={[0.38, 0.14, 0.22]} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, y0 + 1.05, 0]} material={bodyMat} castShadow>
        <boxGeometry args={[sil.shoulder * 1.15, 0.55, 0.28]} />
      </mesh>

      {/* Chest core */}
      <mesh ref={core} position={[0, y0 + 1.08, 0.12]} material={accentMat}>
        <icosahedronGeometry args={[0.11, 1]} />
      </mesh>

      {/* Shoulders */}
      <mesh position={[-sil.shoulder * 0.72, y0 + 1.28, 0]} material={bodyMat} castShadow>
        <sphereGeometry args={[0.1, 16, 16]} />
      </mesh>
      <mesh position={[sil.shoulder * 0.72, y0 + 1.28, 0]} material={bodyMat} castShadow>
        <sphereGeometry args={[0.1, 16, 16]} />
      </mesh>

      {/* Arms */}
      <mesh
        position={[-sil.armSpan, y0 + 0.95, 0]}
        rotation={[0, 0, 0.18]}
        material={bodyMat}
        castShadow
      >
        <capsuleGeometry args={[0.055, 0.5, 6, 12]} />
      </mesh>
      <mesh
        position={[sil.armSpan, y0 + 0.95, 0]}
        rotation={[0, 0, -0.18]}
        material={bodyMat}
        castShadow
      >
        <capsuleGeometry args={[0.055, 0.5, 6, 12]} />
      </mesh>

      {/* Neck + head */}
      <mesh position={[0, y0 + 1.42, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.12, 12]} />
      </mesh>
      <mesh
        position={[0, y0 + 1.62, 0]}
        scale={sil.headScale}
        material={glassMat}
        castShadow
      >
        <boxGeometry args={[0.28, 0.32, 0.26]} />
      </mesh>

      {/* Face plate glow */}
      <mesh position={[0, y0 + 1.62, 0.14]} scale={sil.headScale}>
        <planeGeometry args={[0.18, 0.12]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.4}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Crown halo for oracle / weaver variants */}
      {(unit.id === "07" || unit.id === "08") && (
        <mesh position={[0, y0 + 1.95, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[0.22, 0.015, 8, 32]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} />
        </mesh>
      )}

      {/* Back pack / mesh node for nexus */}
      {unit.id === "08" && (
        <mesh position={[0, y0 + 1.05, -0.2]} material={accentMat}>
          <octahedronGeometry args={[0.14, 0]} />
        </mesh>
      )}
    </group>
  );
}
