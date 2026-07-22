import { forwardRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpen,
  Hexagon,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { Unit } from "@/data/units";

type UnitModalProps = {
  unit: Unit;
  onClose: () => void;
  /** Optional hook for the 3D Lab entry point (future). */
  onOpenLab?: (unit: Unit) => void;
};

const sections = [
  {
    key: "detail" as const,
    label: "Deep archive description",
    icon: BookOpen,
  },
  {
    key: "culturalResonance" as const,
    label: "Cultural resonance",
    icon: Users,
  },
  {
    key: "civilizationalImpact" as const,
    label: "Civilizational impact",
    icon: Award,
  },
  {
    key: "humanoidDesign" as const,
    label: "Humanoid design philosophy",
    icon: User,
  },
];

export const UnitModal = forwardRef<HTMLDivElement, UnitModalProps>(
  function UnitModal({ unit, onClose, onOpenLab }, ref) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unit-modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
      className="fixed inset-0 z-[90] grid place-items-center bg-black/90 p-4 backdrop-blur-xl"
    >
      <motion.div
        initial={{ y: 30, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.21, 0.92, 0.26, 1] }}
        onMouseDown={(event) => event.stopPropagation()}
        className="grid max-h-[92vh] w-full max-w-5xl overflow-hidden overflow-y-auto border border-amber-500/30 bg-[#090909] md:grid-cols-5"
      >
        {/* Image column */}
        <div className="relative min-h-[250px] md:col-span-2 md:min-h-full">
          <img
            src={unit.fullbodyImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top opacity-75 grayscale"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#090909]/80" />
          <div className="absolute bottom-7 left-7 right-7">
            <p className="text-[10px] tracking-[0.25em] text-amber-400">
              {unit.id} · {unit.role.toUpperCase()}
            </p>
            <h2
              id="unit-modal-title"
              className="mt-2 font-display text-4xl font-bold md:text-5xl"
            >
              {unit.name}
            </h2>
            {unit.modelPath && (
              <p className="mt-3 flex items-center gap-2 font-mono text-[9px] tracking-[0.2em] text-zinc-500">
                <Hexagon className="h-3 w-3 text-amber-500/70" strokeWidth={1.5} />
                3D LAB · {unit.modelPath.split("/").pop()}
              </p>
            )}
          </div>
        </div>

        {/* Content column */}
        <div className="relative p-8 md:col-span-3 md:p-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 text-zinc-400 transition hover:text-white"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>

          <p className="text-[10px] font-bold tracking-[0.25em] text-amber-500">
            PRIMARY FUNCTION
          </p>
          <p className="mt-3 text-xl font-light leading-snug text-zinc-200">
            {unit.description}
          </p>

          <div className="mt-8 space-y-7">
            {sections.map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded bg-amber-500/10 text-amber-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-500">
                    {label}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">{unit[key]}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <p className="mb-3 text-[10px] font-bold tracking-[0.25em] text-amber-500">
              CORE SPECIFICATIONS
            </p>
            <div className="flex flex-wrap gap-2">
              {unit.specs.map((spec) => (
                <span
                  key={spec}
                  className="border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] tracking-wider text-zinc-300"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
            {onOpenLab ? (
              <button
                type="button"
                onClick={() => onOpenLab(unit)}
                className="group flex flex-1 items-center justify-center gap-2 bg-amber-500 px-5 py-3 text-[10px] font-bold tracking-[0.18em] text-black transition hover:bg-amber-300"
              >
                OPEN IN 3D LAB
                <Zap className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className={`flex items-center justify-center gap-2 border border-white/20 px-5 py-3 text-[10px] font-bold tracking-[0.18em] text-zinc-200 transition hover:bg-white/5 ${
                onOpenLab ? "flex-1" : "bg-amber-500 text-black hover:bg-amber-300 border-transparent"
              }`}
            >
              RETURN TO VANGUARD
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

UnitModal.displayName = "UnitModal";
