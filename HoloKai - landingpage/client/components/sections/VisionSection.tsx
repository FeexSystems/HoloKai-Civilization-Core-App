import { ArrowRight, Globe2, Hexagon, Network, Sparkles } from "lucide-react";
import {
  visionLanguages,
  visionOutcomes,
  visionPillars,
} from "@/data/marketing";

type VisionSectionProps = {
  onExploreVanguard: () => void;
  onExploreIntelligence: () => void;
};

export function VisionSection({
  onExploreVanguard,
  onExploreIntelligence,
}: VisionSectionProps) {
  return (
    <section
      id="vision"
      className="relative z-10 border-y border-white/10 bg-black py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1600px] px-6">
        {/* Header */}
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="text-xs font-bold tracking-[0.35em] text-amber-500">
              AN EPISTEMOLOGY OF WHOLENESS
            </p>
            <h2 className="mt-5 font-display text-5xl font-light leading-none sm:text-6xl lg:text-7xl">
              The archive was never{" "}
              <span className="font-bold italic text-amber-500">empty.</span>
            </h2>
            <p className="mt-7 max-w-xl text-base font-light leading-relaxed text-zinc-400 sm:text-lg">
              HoloKai reconnects fragments of history separated by distance,
              extraction, and omission. It does not replace living knowledge—it
              makes space for communities to govern, extend, and embody it
              through ultra-realistic humanoid presence.
            </p>
          </div>
          <div className="lg:col-span-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {visionPillars.map((p) => (
                <div
                  key={p.id}
                  className="border border-amber-500/20 bg-amber-500/[0.04] px-4 py-5 text-center"
                >
                  <p className="font-display text-3xl font-bold text-amber-400 sm:text-4xl">
                    {p.metric}
                  </p>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    {p.metricLabel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Matrix visual + copy */}
        <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-12">
          <div className="relative min-h-[380px] overflow-hidden border border-amber-900/40 bg-[radial-gradient(circle_at_50%_40%,rgba(217,119,6,0.2),transparent_45%),linear-gradient(135deg,#121212,#030303)] lg:col-span-7">
            <Network
              className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 animate-[spin_38s_linear_infinite] text-amber-500/70 sm:h-72 sm:w-72"
              strokeWidth={0.45}
            />
            <Hexagon
              className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 text-amber-400/90"
              strokeWidth={0.8}
            />
            <div className="absolute left-6 top-6 border border-white/10 bg-black/40 px-3 py-2 text-[9px] tracking-[0.24em] text-zinc-400 backdrop-blur-sm">
              LIVE EPISTEMOLOGICAL MATRIX
            </div>
            <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-black/50 p-6 backdrop-blur-md">
              <p className="text-[10px] tracking-[0.2em] text-amber-400">
                ● LIVE KNOWLEDGE GRAPH · 4.29M NODES · LAGOS NODE
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {visionLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="border border-white/10 bg-white/5 px-2 py-1 text-[9px] tracking-wider text-zinc-400"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            {visionPillars.map((pillar) => (
              <article
                key={pillar.id}
                className="border border-white/10 bg-white/[0.02] p-6 transition hover:border-amber-500/35"
              >
                <p className="text-[9px] font-bold tracking-[0.28em] text-amber-500">
                  {pillar.kicker.toUpperCase()}
                </p>
                <h3 className="mt-2 font-display text-2xl text-white">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>

        {/* Market outcomes */}
        <div className="mt-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] text-zinc-500">
                WHO HOLOKAI SERVES
              </p>
              <h3 className="mt-2 font-display text-3xl font-light sm:text-4xl">
                Built for institutions that{" "}
                <span className="italic text-amber-500">remember.</span>
              </h3>
            </div>
            <Sparkles className="hidden h-8 w-8 text-amber-500/60 sm:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visionOutcomes.map((outcome) => (
              <article
                key={outcome.title}
                className="border border-white/10 bg-zinc-950/80 p-6"
              >
                <Globe2 className="h-5 w-5 text-amber-500" />
                <h4 className="mt-5 font-display text-xl text-white">{outcome.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{outcome.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onExploreVanguard}
            className="group flex items-center justify-center gap-2 bg-amber-500 px-7 py-4 text-[10px] font-bold tracking-[0.2em] text-black transition hover:bg-amber-300"
          >
            EXPLORE THE VANGUARD
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            type="button"
            onClick={onExploreIntelligence}
            className="border border-white/20 px-7 py-4 text-[10px] font-bold tracking-[0.2em] text-white transition hover:bg-white/5"
          >
            SEE THE INTELLIGENCE STACK
          </button>
        </div>
      </div>
    </section>
  );
}
