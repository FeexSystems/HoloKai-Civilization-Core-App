import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  DoubleSide,
  LinearFilter,
  SRGBColorSpace,
  VideoTexture,
  type Group,
  type Mesh,
} from "three";
import type { Unit } from "@/data/units";

type VideoPortraitProps = {
  unit: Unit;
  autoRotate?: boolean;
  muted?: boolean;
};

/**
 * Floating holographic plate that streams each unit's showcase MP4
 * via THREE.VideoTexture inside the 3D Lab.
 */
export function VideoPortrait({
  unit,
  autoRotate = true,
  muted = true,
}: VideoPortraitProps) {
  const group = useRef<Group>(null);
  const plate = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const accent = unit.accent ?? "#f59e0b";

  const [texture, setTexture] = useState<VideoTexture | null>(null);
  const [aspect, setAspect] = useState(9 / 16);

  const src = unit.video;

  useEffect(() => {
    if (!src) return;

    const video = document.createElement("video");
    video.src = src;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = muted;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    videoRef.current = video;

    const tex = new VideoTexture(video);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.generateMipmaps = false;

    const onMeta = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setAspect(video.videoWidth / video.videoHeight);
      }
    };
    video.addEventListener("loadedmetadata", onMeta);

    const tryPlay = () => {
      video.play().catch(() => {
        // Autoplay may require mute; already muted by default
      });
    };
    video.addEventListener("canplay", tryPlay);
    video.load();
    tryPlay();

    setTexture(tex);

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("canplay", tryPlay);
      video.pause();
      video.removeAttribute("src");
      video.load();
      tex.dispose();
      videoRef.current = null;
      setTexture(null);
    };
    // muted is applied in a separate effect so we don't rebuild the video
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      if (!muted) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [muted]);

  // Portrait-friendly plate size; landscape videos widen automatically
  const height = useMemo(() => (aspect >= 1 ? 1.85 : 2.45), [aspect]);
  const width = height * aspect;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      if (autoRotate) {
        group.current.rotation.y = Math.sin(t * 0.32) * 0.4;
      }
      group.current.position.y = Math.sin(t * 1.05) * 0.04;
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.35;
    }
    if (plate.current) {
      plate.current.position.z = Math.sin(t * 1.6) * 0.01;
    }
    if (texture) {
      texture.needsUpdate = true;
    }
  });

  if (!src) {
    return null;
  }

  // Placeholder plate while the first frame decodes
  if (!texture) {
    return (
      <group position={[0, 0.2, 0]}>
        <mesh>
          <planeGeometry args={[1.4, 2.2]} />
          <meshStandardMaterial
            color="#111"
            emissive={accent}
            emissiveIntensity={0.2}
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={group} position={[0, 0.2, 0]}>
      <mesh ref={ring} position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[Math.max(width, height) * 0.42, 0.012, 12, 64]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.1}
          transparent
          opacity={0.75}
        />
      </mesh>

      <mesh position={[0, -1.23, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[Math.max(width, height) * 0.38, 48]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.7} roughness={0.4} />
      </mesh>

      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[width + 0.14, height + 0.14]} />
        <meshStandardMaterial
          color="#111111"
          metalness={0.85}
          roughness={0.35}
          emissive={accent}
          emissiveIntensity={0.08}
        />
      </mesh>

      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[width + 0.05, height + 0.05]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.4}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      <mesh ref={plate} position={[0, 0, 0.01]} castShadow>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} side={DoubleSide} toneMapped={false} transparent opacity={0.95} alphaTest={0.01} />
      </mesh>

      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[width * 0.98, height * 0.98]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.035}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
