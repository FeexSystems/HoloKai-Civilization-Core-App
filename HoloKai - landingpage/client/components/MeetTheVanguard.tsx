import { useRef, useState } from "react";
import { Film, Image as ImageIcon, Play, Users } from "lucide-react";

const COLLECTIVE_VIDEOS = [
  {
    id: "vi1",
    src: "/videos/meet-the-vanguard-1.mp4",
    title: "Meet the Vanguard · Reel I",
    caption: "The eight humanoid chassis assemble under the Lagos sun.",
  },
  {
    id: "vi2",
    src: "/videos/meet-the-vanguard-2.mp4",
    title: "Meet the Vanguard · Reel II",
    caption: "Formation, presence, and the sigil of collective memory.",
  },
] as const;

const COLLECTIVE_IMAGES = [
  {
    id: "poster",
    src: "/images/meet-the-vanguard.jpg",
    title: "The Vanguard Collective",
    caption: "Official formation portrait — HOLOKAI title plate.",
  },
  {
    id: "group",
    src: "/images/vanguard/vanguard-group.png",
    title: "Group Art",
    caption: "All eight units with the core companion sigil overhead.",
  },
] as const;

function CollectiveVideoCard({
  src,
  title,
  caption,
}: {
  src: string;
  title: string;
  caption: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <article className="group overflow-hidden border border-amber-900/40 bg-zinc-950">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={src}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          loop
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-0 z-10 flex items-center justify-center"
          aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        >
          <span
            className={`grid h-16 w-16 place-items-center rounded-full border border-amber-500/50 bg-black/55 text-amber-300 backdrop-blur-md transition ${
              playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
            }`}
          >
            <Play className="h-6 w-6 fill-current" />
          </span>
        </button>
        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-bold tracking-[0.28em] text-amber-400">
              <Film className="h-3 w-3" />
              CINEMA FEED
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">{title}</h3>
          </div>
          <span className="border border-white/15 bg-black/50 px-2 py-1 text-[9px] tracking-wider text-zinc-300">
            {playing ? "PLAYING" : "MP4"}
          </span>
        </div>
      </div>
      <p className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-zinc-400">{caption}</p>
    </article>
  );
}

/**
 * Gallery of collective Vanguard formation videos + group art,
 * placed after the Anatomy section.
 */
export function MeetTheVanguard() {
  const [lightbox, setLightbox] = useState<(typeof COLLECTIVE_IMAGES)[number] | null>(null);

  return (
    <section
      id="collective"
      className="relative z-10 border-t border-white/10 bg-[#050505] py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1600px] px-6">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 border border-amber-500/30 px-4 py-2 text-[10px] tracking-[0.28em] text-amber-400">
            <Users className="h-3.5 w-3.5" />
            THE VANGUARD COLLECTIVE
          </p>
          <h2 className="font-display text-5xl font-light leading-none tracking-tight sm:text-7xl">
            Meet the{" "}
            <span className="font-bold italic text-amber-500">Vanguard.</span>
          </h2>
          <p className="mt-7 max-w-2xl text-lg font-light leading-relaxed text-zinc-400">
            The full formation — eight humanoid masters of memory standing as one
            consciousness. Cinema reels and group art from the Lagos laboratory
            unveiling.
          </p>
        </div>

        {/* Videos */}
        <div className="mt-14">
          <p className="mb-5 flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-zinc-500">
            <Film className="h-3.5 w-3.5 text-amber-500" />
            FORMATION REELS
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            {COLLECTIVE_VIDEOS.map((video) => (
              <CollectiveVideoCard key={video.id} {...video} />
            ))}
          </div>
        </div>

        {/* Image gallery */}
        <div className="mt-16">
          <p className="mb-5 flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-zinc-500">
            <ImageIcon className="h-3.5 w-3.5 text-amber-500" />
            GROUP ART ARCHIVE
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {COLLECTIVE_IMAGES.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setLightbox(image)}
                className="group relative overflow-hidden border border-amber-900/40 bg-zinc-950 text-left"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.title}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-[9px] font-bold tracking-[0.28em] text-amber-400">
                      STILL FRAME
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                      {image.title}
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-zinc-400">{image.caption}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/92 p-4 backdrop-blur-md"
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-5 top-5 border border-white/20 px-4 py-2 text-[10px] tracking-[0.2em] text-zinc-300 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            CLOSE
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.title}
            className="max-h-[88vh] max-w-full object-contain shadow-[0_0_80px_rgba(245,158,11,0.2)]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
