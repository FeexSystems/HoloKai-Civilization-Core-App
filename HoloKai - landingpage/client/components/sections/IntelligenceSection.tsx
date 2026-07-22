import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Fingerprint,
  Globe2,
  Network,
  ShieldCheck,
  Volume2,
  Zap,
} from "lucide-react";
import { intelligenceAgents, intelligencePipeline } from "@/data/marketing";
import { units } from "@/data/units";

const agentIcons = [Brain, BookOpen, Volume2, Globe2, Fingerprint, ShieldCheck] as const;

type IntelligenceSectionProps = {
  onAccessCore: () => void;
  onOpenUnitFeed: () => void;
};

export function IntelligenceSection({
  onAccessCore,
  onOpenUnitFeed,
}: IntelligenceSectionProps) {
  const [activeAgent, setActiveAgent] = useState<string>(intelligenceAgents[0].id);
  const agent =
    intelligenceAgents.find((a) => a.id === activeAgent) ?? intelligenceAgents[0];
  const agentIndex = intelligenceAgents.findIndex((a) => a.id === activeAgent);
  const Icon = agentIcons[agentIndex >= 0 ? agentIndex : 0] ?? Brain;

  return (
    <section id="intelligence" className="relative z-10 bg-[#020202] py-24 md:py-32">
      <div className="mx-auto max-w-[1600px] px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold tracking-[0.35em] text-amber-500">
            THE MIND OF MANY
          </p>
          <h2 className="mt-5 font-display text-5xl font-light sm:text-7xl">
            Multi-Agent{" "}
            <span className="font-bold italic text-amber-500">Architecture</span>
          </h2>
          <p className="mt-5 text-base font-light leading-relaxed text-zinc-400 sm:text-lg">
            Six specialized intelligences in continuous dialogue under a unified
            ethical sovereign—embodied across eight humanoid vessels and one
            mesh consciousness.
          </p>
        </div>

        <div className="mt-14 overflow-x-auto pb-2">
          <div className="flex min-w-[720px] gap-0 md:min-w-0 md:grid md:grid-cols-6">
            {intelligencePipeline.map((item, i) => (
              <div
                key={item.step}
                className="relative flex-1 border border-white/10 bg-white/[0.02] p-4 md:border-l-0 md:first:border-l"
              >
                <p className="font-mono text-[10px] tracking-[0.2em] text-amber-500">
                  {item.step}
                </p>
                <h3 className="mt-2 font-display text-xl text-white">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">{item.body}</p>
                {i < intelligencePipeline.length - 1 && (
                  <span className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rotate-45 border-r border-t border-amber-500/30 bg-[#020202] md:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-12">
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
            {intelligenceAgents.map((a, index) => {
              const AIcon = agentIcons[index];
              const selected = a.id === activeAgent;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActiveAgent(a.id)}
                  className={`flex items-center gap-4 border px-4 py-4 text-left transition ${
                    selected
                      ? "border-amber-500/45 bg-amber-500/10"
                      : "border-white/10 hover:border-amber-500/30"
                  }`}
                >
                  <AIcon
                    className={`h-6 w-6 shrink-0 ${selected ? "text-amber-400" : "text-amber-500/70"}`}
                  />
                  <span>
                    <span className="block font-display text-lg text-white">{a.title}</span>
                    <span className="text-[10px] tracking-[0.16em] text-zinc-500">
                      {a.role}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] to-transparent p-8 lg:col-span-7 lg:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.28em] text-amber-500">
                  ACTIVE AGENT
                </p>
                <h3 className="mt-2 font-display text-4xl text-white">{agent.title}</h3>
                <p className="mt-1 text-sm tracking-[0.12em] text-zinc-500">{agent.role}</p>
              </div>
              <Icon className="h-12 w-12 text-amber-500/80" />
            </div>
            <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-zinc-300">
              {agent.body}
            </p>
            <div className="mt-8">
              <p className="text-[9px] font-bold tracking-[0.25em] text-zinc-500">
                CAPABILITY MESH
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <li
                    key={cap}
                    className="border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] tracking-wider text-zinc-300"
                  >
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 border-t border-white/10 pt-6">
              <p className="text-[9px] tracking-[0.22em] text-zinc-600">
                EMBODIED BY VANGUARD UNITS
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {units.slice(0, 6).map((u) => (
                  <div
                    key={u.id}
                    className="relative h-14 w-14 shrink-0 overflow-hidden border border-white/10"
                  >
                    <img
                      src={u.image}
                      alt={u.name}
                      className="h-full w-full object-cover opacity-80"
                    />
                  </div>
                ))}
                <div className="grid h-14 w-14 shrink-0 place-items-center border border-amber-500/30 text-[9px] tracking-wider text-amber-400">
                  +2
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-4 border border-white/10 bg-black p-8 md:grid-cols-3 md:p-10">
          <div>
            <Zap className="h-6 w-6 text-amber-500" />
            <h4 className="mt-4 font-display text-2xl text-white">Sovereign by design</h4>
            <p className="mt-2 text-sm text-zinc-400">
              No agent acts outside the ethical governor. Consent is not a
              feature—it is the kernel.
            </p>
          </div>
          <div>
            <Brain className="h-6 w-6 text-amber-500" />
            <h4 className="mt-4 font-display text-2xl text-white">Specialist depth</h4>
            <p className="mt-2 text-sm text-zinc-400">
              Archaeologist, Historian, Linguist, Anthropologist, Storyteller,
              Ethicist—each trained for cultural precision.
            </p>
          </div>
          <div>
            <Network className="h-6 w-6 text-amber-500" />
            <h4 className="mt-4 font-display text-2xl text-white">Mesh coherence</h4>
            <p className="mt-2 text-sm text-zinc-400">
              Kush-Prime keeps every unit synchronized so insight never fragments
              into isolated extraction.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onAccessCore}
            className="group flex items-center justify-center gap-2 bg-amber-500 px-8 py-4 text-[10px] font-bold tracking-[0.2em] text-black transition hover:bg-amber-300"
          >
            ACCESS CORE
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            type="button"
            onClick={onOpenUnitFeed}
            className="border border-white/20 px-8 py-4 text-[10px] font-bold tracking-[0.2em] text-white transition hover:bg-white/5"
          >
            WITNESS A UNIT FEED
          </button>
        </div>
      </div>
    </section>
  );
}
