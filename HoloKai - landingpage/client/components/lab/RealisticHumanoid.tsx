import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import type { Unit } from "@/data/units";

type RealisticHumanoidProps = {
  unit: Unit;
  autoRotate?: boolean;
  /** Optional still used as face / chest plate texture */
  usePortraitTexture?: boolean;
};

/**
 * High-detail procedural humanoid for the 3D Lab —
 * PBR plating, articulated limbs, glowing core, cultural light accents.
 * Uses unit.image on face/chest when available for photoreal branding.
 */
export function RealisticHumanoid({
  unit,
  autoRotate = true,
  usePortraitTexture = true,
}: RealisticHumanoidProps) {
  const root = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.Group>(null);
  const accent = unit.accent ?? "#f59e0b";
  const n = Number.parseInt(unit.id, 10) || 1;

  // Always load (hooks rule); gate usage with usePortraitTexture
  const portraitMap = useLoader(THREE.TextureLoader, unit.image);
  portraitMap.colorSpace = THREE.SRGBColorSpace;
  portraitMap.anisotropy = 8;
  const portrait = usePortraitTexture ? portraitMap : null;

  const mats = useMemo(() => {
    const chassis = new THREE.MeshStandardMaterial({
      color: "#141416",
      metalness: 0.92,
      roughness: 0.22,
      envMapIntensity: 1.4,
    });
    const plate = new THREE.MeshStandardMaterial({
      color: "#1c1c20",
      metalness: 0.88,
      roughness: 0.32,
      envMapIntensity: 1.1,
    });
    const joint = new THREE.MeshStandardMaterial({
      color: "#0a0a0c",
      metalness: 0.95,
      roughness: 0.18,
    });
    const glow = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.85,
      metalness: 0.35,
      roughness: 0.25,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#1a1a1c",
      metalness: 0.2,
      roughness: 0.08,
      transmission: 0.45,
      thickness: 0.5,
      transparent: true,
      opacity: 0.88,
      emissive: accent,
      emissiveIntensity: 0.15,
    });
    const soft = new THREE.MeshStandardMaterial({
      color: "#2a2420",
      metalness: 0.4,
      roughness: 0.55,
    });
    return { chassis, plate, joint, glow, glass, soft };
  }, [accent]);

  const scale = 1 + (n % 3) * 0.04;
  const shoulderW = 0.48 + (n % 2) * 0.06;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (root.current) {
      if (autoRotate) root.current.rotation.y = t * 0.22;
      root.current.position.y = Math.sin(t * 1.05) * 0.035;
    }
    if (core.current) {
      const s = 1 + Math.sin(t * 2.6) * 0.08;
      core.current.scale.setScalar(s);
      const m = core.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.55 + Math.sin(t * 3.2) * 0.35;
    }
    if (halo.current) {
      halo.current.rotation.z = t * 0.5;
      halo.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.4) * 0.1;
    }
    if (eyes.current) {
      eyes.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const m = mesh.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = 1.2 + Math.sin(t * 4 + i) * 0.4;
      });
    }
  });

  const y = -1.05;

  return (
    <group ref={root} scale={scale} position={[0, 0.1, 0]}>
      {/* Floor hologram ring */}
      <mesh ref={halo} position={[0, y + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.014, 16, 80]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.1}
          transparent
          opacity={0.75}
        />
      </mesh>
      <mesh position={[0, y + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.72, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Feet */}
      <mesh position={[-0.15, y + 0.06, 0.04]} material={mats.chassis} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.28]} />
      </mesh>
      <mesh position={[0.15, y + 0.06, 0.04]} material={mats.chassis} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.28]} />
      </mesh>

      {/* Lower legs */}
      <mesh position={[-0.15, y + 0.32, 0]} material={mats.plate} castShadow>
        <capsuleGeometry args={[0.07, 0.38, 8, 16]} />
      </mesh>
      <mesh position={[0.15, y + 0.32, 0]} material={mats.plate} castShadow>
        <capsuleGeometry args={[0.07, 0.38, 8, 16]} />
      </mesh>

      {/* Knees */}
      <mesh position={[-0.15, y + 0.55, 0]} material={mats.joint} castShadow>
        <sphereGeometry args={[0.075, 20, 20]} />
      </mesh>
      <mesh position={[0.15, y + 0.55, 0]} material={mats.joint} castShadow>
        <sphereGeometry args={[0.075, 20, 20]} />
      </mesh>

      {/* Thighs */}
      <mesh position={[-0.15, y + 0.78, 0]} material={mats.chassis} castShadow>
        <capsuleGeometry args={[0.085, 0.32, 8, 16]} />
      </mesh>
      <mesh position={[0.15, y + 0.78, 0]} material={mats.chassis} castShadow>
        <capsuleGeometry args={[0.085, 0.32, 8, 16]} />
      </mesh>

      {/* Pelvis armor */}
      <mesh position={[0, y + 1.0, 0]} material={mats.chassis} castShadow>
        <boxGeometry args={[0.42, 0.16, 0.24]} />
      </mesh>
      <mesh position={[0, y + 1.0, 0.12]} material={mats.glow}>
        <boxGeometry args={[0.18, 0.04, 0.02]} />
      </mesh>

      {/* Abdomen segments */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0, y + 1.14 + i * 0.1, 0]}
          material={i % 2 ? mats.plate : mats.chassis}
          castShadow
        >
          <boxGeometry args={[0.4 - i * 0.02, 0.09, 0.22]} />
        </mesh>
      ))}

      {/* Rib cage / upper torso */}
      <mesh position={[0, y + 1.52, 0]} material={mats.chassis} castShadow>
        <boxGeometry args={[shoulderW + 0.08, 0.42, 0.28]} />
      </mesh>
      {/* Chest armor plates */}
      <mesh position={[-0.12, y + 1.54, 0.15]} material={mats.plate} castShadow>
        <boxGeometry args={[0.18, 0.28, 0.04]} />
      </mesh>
      <mesh position={[0.12, y + 1.54, 0.15]} material={mats.plate} castShadow>
        <boxGeometry args={[0.18, 0.28, 0.04]} />
      </mesh>

      {/* Chest core reactor */}
      <mesh ref={core} position={[0, y + 1.5, 0.18]} material={mats.glow} castShadow>
        <icosahedronGeometry args={[0.1, 1]} />
      </mesh>
      <mesh position={[0, y + 1.5, 0.2]}>
        <ringGeometry args={[0.12, 0.15, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Portrait plate on chest (photoreal unit art) */}
      {portrait && (
        <mesh position={[0, y + 1.52, 0.22]}>
          <planeGeometry args={[0.22, 0.28]} />
          <meshBasicMaterial map={portrait} toneMapped={false} transparent opacity={0.92} />
        </mesh>
      )}

      {/* Collarbone / shoulders */}
      <mesh position={[-shoulderW * 0.55, y + 1.72, 0]} material={mats.joint} castShadow>
        <sphereGeometry args={[0.11, 24, 24]} />
      </mesh>
      <mesh position={[shoulderW * 0.55, y + 1.72, 0]} material={mats.joint} castShadow>
        <sphereGeometry args={[0.11, 24, 24]} />
      </mesh>

      {/* Upper arms */}
      <mesh
        position={[-shoulderW * 0.72, y + 1.42, 0]}
        rotation={[0, 0, 0.2]}
        material={mats.plate}
        castShadow
      >
        <capsuleGeometry args={[0.055, 0.32, 8, 14]} />
      </mesh>
      <mesh
        position={[shoulderW * 0.72, y + 1.42, 0]}
        rotation={[0, 0, -0.2]}
        material={mats.plate}
        castShadow
      >
        <capsuleGeometry args={[0.055, 0.32, 8, 14]} />
      </mesh>

      {/* Elbows */}
      <mesh position={[-shoulderW * 0.85, y + 1.18, 0.02]} material={mats.joint}>
        <sphereGeometry args={[0.055, 16, 16]} />
      </mesh>
      <mesh position={[shoulderW * 0.85, y + 1.18, 0.02]} material={mats.joint}>
        <sphereGeometry args={[0.055, 16, 16]} />
      </mesh>

      {/* Forearms */}
      <mesh
        position={[-shoulderW * 0.92, y + 0.95, 0.04]}
        rotation={[0.15, 0, 0.15]}
        material={mats.chassis}
        castShadow
      >
        <capsuleGeometry args={[0.045, 0.28, 8, 14]} />
      </mesh>
      <mesh
        position={[shoulderW * 0.92, y + 0.95, 0.04]}
        rotation={[0.15, 0, -0.15]}
        material={mats.chassis}
        castShadow
      >
        <capsuleGeometry args={[0.045, 0.28, 8, 14]} />
      </mesh>

      {/* Hands */}
      <mesh position={[-shoulderW * 0.98, y + 0.78, 0.08]} material={mats.soft} castShadow>
        <boxGeometry args={[0.08, 0.12, 0.05]} />
      </mesh>
      <mesh position={[shoulderW * 0.98, y + 0.78, 0.08]} material={mats.soft} castShadow>
        <boxGeometry args={[0.08, 0.12, 0.05]} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, y + 1.82, 0]} material={mats.joint} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.12, 16]} />
      </mesh>

      {/* Head shell */}
      <mesh position={[0, y + 2.02, 0]} material={mats.glass} castShadow>
        <boxGeometry args={[0.26, 0.3, 0.24]} />
      </mesh>
      <mesh position={[0, y + 2.02, 0]} material={mats.chassis} castShadow>
        <boxGeometry args={[0.28, 0.12, 0.26]} />
      </mesh>

      {/* Face portrait window */}
      {portrait ? (
        <mesh position={[0, y + 2.04, 0.125]}>
          <planeGeometry args={[0.18, 0.2]} />
          <meshBasicMaterial map={portrait} toneMapped={false} />
        </mesh>
      ) : (
        <mesh position={[0, y + 2.04, 0.125]} material={mats.glow}>
          <planeGeometry args={[0.16, 0.1]} />
        </mesh>
      )}

      {/* Eyes */}
      <group ref={eyes}>
        <mesh position={[-0.06, y + 2.08, 0.14]} material={mats.glow}>
          <sphereGeometry args={[0.022, 12, 12]} />
        </mesh>
        <mesh position={[0.06, y + 2.08, 0.14]} material={mats.glow}>
          <sphereGeometry args={[0.022, 12, 12]} />
        </mesh>
      </group>

      {/* Cranial antenna / sensor ridge */}
      <mesh position={[0, y + 2.2, -0.02]} material={mats.glow}>
        <boxGeometry args={[0.2, 0.02, 0.04]} />
      </mesh>

      {/* Unit-specific flair */}
      {(unit.id === "07" || unit.id === "08") && (
        <mesh position={[0, y + 2.28, 0]} rotation={[Math.PI / 2.5, 0, 0]}>
          <torusGeometry args={[0.2, 0.012, 12, 48]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} />
        </mesh>
      )}
      {unit.id === "08" && (
        <mesh position={[0, y + 1.5, -0.2]} material={mats.glow}>
          <octahedronGeometry args={[0.12, 0]} />
        </mesh>
      )}
      {unit.id === "02" && (
        <mesh position={[0, y + 1.72, -0.16]} material={mats.plate} castShadow>
          <boxGeometry args={[0.35, 0.45, 0.08]} />
        </mesh>
      )}

      {/* Spine light strip */}
      <mesh position={[0, y + 1.4, -0.15]} material={mats.glow}>
        <boxGeometry args={[0.03, 0.7, 0.02]} />
      </mesh>

      {/* Floating ID hologram */}
      <mesh position={[0.55, y + 2.0, 0]} rotation={[0, -0.4, 0]}>
        <planeGeometry args={[0.35, 0.12]} />
        <meshBasicMaterial color={accent} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
