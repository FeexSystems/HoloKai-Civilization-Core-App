import { forwardRef, lazy, Suspense, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Hexagon,
  Maximize2,
  Minimize2,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Home,
  ArrowLeft,
} from "lucide-react";
import { HoloKaiLogo } from "@/components/HoloKaiLogo";
import type { Unit } from "@/data/units";
import { units } from "@/data/units";
import type { LabDisplayMode } from "./UnitModel";

const LabCanvas = lazy(() =>
  import("./LabCanvas").then((m) => ({ default: m.LabCanvas })),
);

const DISPLAY_MODES: { id: LabDisplayMode; label: string }[] = [
  { id: "dual", label: "DUAL" },
  { id: "humanoid", label: "ORBIT" },
  { id: "video", label: "MP4" },
];

type UnitLabViewerProps = {
  unit: Unit;
  onClose: () => void;
  onChangeUnit?: (unit: Unit) => void;
  /** Optional callback to return to landing page */
  onReturnToLanding?: () => void;
};

function CanvasFallback({ accent }: { accent: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-[#020202]">
      <div className="text-center">
        <Hexagon
          className="mx-auto h-12 w-12 animate-pulse"
          style={{ color: accent }}
          strokeWidth={1}
        />
        <p className="mt-4 font-mono text-[10px] tracking-[0.3em] text-amber-500/80">
          INITIALIZING LAB VIEWPORT
        </p>
      </div>
    </div>
  );
}

export const UnitLabViewer = forwardRef<HTMLDivElement, UnitLabViewerProps>(
  function UnitLabViewer({ unit, onClose, onChangeUnit, onReturnToLanding }, ref) {
    const [autoRotate, setAutoRotate] = useState(true);
    const [panelOpen, setPanelOpen] = useState(true);
    const [muted, setMuted] = useState(true);
    const [mode, setMode] = useState<LabDisplayMode>("dual");
    const accent = unit.accent ?? "#f59e0b";

    const stepUnit = useCallback(
      (delta: number) => {
        if (!onChangeUnit) return;
        const index = units.findIndex((u) => u.id === unit.id);
        if (index < 0) return;
        const next = units[(index + delta + units.length) % units.length];
        onChangeUnit(next);
      },
      [onChangeUnit, unit.id],
    );

    useEffect(() => {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") onClose();
        if (event.key === "ArrowLeft") stepUnit(-1);
        if (event.key === "ArrowRight") stepUnit(1);
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", onKeyDown);
      };
    }, [onClose, stepUnit]);

    return (
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-viewer-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-[95] flex flex-col bg-[#020202]"
      >
        {/* Top bar */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 md:p-6">
          <div className="pointer-events-auto border border-amber-500/25 bg-black/55 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <HoloKaiLogo variant="icon" className="h-5 w-5 object-cover object-top" />
              <p className="text-[9px] font-bold tracking-[0.3em] text-amber-400">
                HOLOKAI · 3D LAB
              </p>
            </div>
            <h2
              id="lab-viewer-title"
              className="mt-1 font-display text-2xl font-bold tracking-tight text-white md:text-3xl"
            >
              {unit.name}
            </h2>
            <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">
              {unit.id} · {unit.role}
            </p>
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
            <div className="flex border border-white/15 bg-black/55 backdrop-blur-xl">
              {DISPLAY_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`px-2.5 py-2 text-[9px] font-bold tracking-[0.16em] transition ${
                    mode === m.id
                      ? "bg-amber-500/20 text-amber-300"
                      : "text-zinc-500 hover:text-zinc-200"
                  }`}
                  aria-pressed={mode === m.id}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMuted((v) => !v)}
              className={`border px-3 py-2 text-[9px] font-bold tracking-[0.18em] backdrop-blur-xl transition ${
                !muted
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                  : "border-white/15 bg-black/55 text-zinc-400 hover:text-white"
              }`}
              aria-pressed={!muted}
              aria-label={muted ? "Unmute unit video" : "Mute unit video"}
            >
              <span className="flex items-center gap-2">
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {muted ? "MUTED" : "AUDIO"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAutoRotate((v) => !v)}
              className={`border px-3 py-2 text-[9px] font-bold tracking-[0.18em] backdrop-blur-xl transition ${
                autoRotate
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                  : "border-white/15 bg-black/55 text-zinc-400 hover:text-white"
              }`}
              aria-pressed={autoRotate}
            >
              <span className="flex items-center gap-2">
                <RotateCcw className="h-3.5 w-3.5" />
                {autoRotate ? "ORBIT ON" : "ORBIT OFF"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              className="border border-white/15 bg-black/55 px-3 py-2 text-zinc-300 backdrop-blur-xl transition hover:text-white"
              aria-label={panelOpen ? "Hide dossier" : "Show dossier"}
            >
              {panelOpen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-white/15 bg-black/55 p-2 text-zinc-300 backdrop-blur-xl transition hover:border-amber-500/40 hover:text-white"
              aria-label="Close 3D Lab"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Canvas */}
        <div className="relative min-h-0 flex-1">
          <Suspense fallback={<CanvasFallback accent={accent} />}>
            <LabCanvas unit={unit} autoRotate={autoRotate} muted={muted} mode={mode} />
          </Suspense>
        </div>

        {/* Side dossier */}
        {panelOpen && (
          <aside className="pointer-events-none absolute bottom-20 right-4 top-28 z-20 hidden w-80 flex-col md:flex lg:right-6">
            <div className="pointer-events-auto flex max-h-full flex-col overflow-hidden border border-amber-500/20 bg-black/60 backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-[9px] font-bold tracking-[0.28em] text-amber-500">
                  UNIT DOSSIER
                </p>
                <p className="mt-2 text-sm font-light leading-relaxed text-zinc-300">
                  {unit.description}
                </p>
              </div>
              <div className="overflow-y-auto px-5 py-4">
                <p className="text-[9px] font-bold tracking-[0.22em] text-zinc-500">
                  HUMANOID DESIGN
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {unit.humanoidDesign}
                </p>
                <p className="mt-5 text-[9px] font-bold tracking-[0.22em] text-zinc-500">
                  SPECIFICATIONS
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {unit.specs.map((spec) => (
                    <li
                      key={spec}
                      className="border border-white/10 bg-white/5 px-2 py-1 text-[9px] tracking-wider text-zinc-300"
                    >
                      {spec}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 font-mono text-[9px] tracking-[0.16em] text-zinc-600">
                  {unit.video ? (
                    <span className="block text-amber-500/80">
                      LIVE FEED · {unit.video.split("/").pop()}
                    </span>
                  ) : null}
                  <span className="mt-1 block">
                    KEY ART · {(unit.fullbodyImage ?? unit.image).split("/").pop()}
                  </span>
                </p>
              </div>
            </div>
          </aside>
        )}

        {/* Bottom controls */}
<footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-4 md:p-6">
          <p className="pointer-events-none hidden text-[9px] tracking-[0.22em] text-zinc-600 sm:block">
            {mode === "video"
              ? "MP4 FEED"
              : mode === "humanoid"
              ? "FULL-BODY ORBITAL"
              : "DUAL · ORBIT + MP4"}{" "}
            · DRAG TO ORBIT · SCROLL TO ZOOM · ESC
          </p>

          <div className="pointer-events-auto flex items-center gap-2">
            {onChangeUnit && (
              <>
                <button
                  type="button"
                  onClick={() => stepUnit(-1)}
                  className="border border-white/15 bg-black/55 p-2.5 text-zinc-300 backdrop-blur-xl transition hover:border-amber-500/40 hover:text-white"
                  aria-label="Previous unit"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => stepUnit(1)}
                  className="border border-white/15 bg-black/55 p-2.5 text-zinc-300 backdrop-blur-xl transition hover:border-amber-500/40 hover:text-white"
                  aria-label="Next unit"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            {onReturnToLanding && (
              <button
                type="button"
                onClick={onReturnToLanding}
                className="border border-white/15 bg-black/55 px-4 py-2.5 text-[10px] font-bold tracking-[0.18em] text-zinc-300 backdrop-blur-xl transition hover:border-zinc-400/40 hover:text-white"
                aria-label="Return to landing page"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                RETURN
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-[10px] font-bold tracking-[0.2em] text-amber-200 backdrop-blur-xl transition hover:bg-amber-500 hover:text-black"
            >
              EXIT LAB
            </button>
          </div>
        </footer>

        {/* Accent glow edge */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-60"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
      </motion.div>
    );
  },
);

UnitLabViewer.displayName = "UnitLabViewer";
