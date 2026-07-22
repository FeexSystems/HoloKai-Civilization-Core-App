import React from 'react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { Image } from '@/components/ui/image';

const STATES = {
  idle: { label: 'STANDBY', pulse: 2 },
  retrieving: { label: 'RETRIEVING', pulse: 0.8 },
  reasoning: { label: 'REASONING', pulse: 0.5 },
  speaking: { label: 'SPEAKING', pulse: 0.3 },
};

export default function DockedGuardian({ aiState: aiStateProp }) {
  const { activeGuardian, aiState: aiStateFromContext } = useHoloKai();
  // Prefer explicit prop, fall back to global context (ResearchChat drives this)
  const aiState = aiStateProp ?? aiStateFromContext ?? 'idle';
  const state = STATES[aiState] || STATES.idle;

  return (
    <div className="fixed bottom-4 right-4 z-30 pointer-events-none">
      <div className="relative flex flex-col items-center">
        {/* Floating mini panel */}
        <div className="glass-panel rounded-xl p-2 pointer-events-auto mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-lg overflow-hidden"
                style={{ border: `1px solid ${activeGuardian.accentColor}44` }}
              >
                <Image
                  src={activeGuardian.image}
                  alt={activeGuardian.name}
                  fittingType="fill"
                  className="w-full h-full"
                />
              </div>
              {/* State glow */}
              <div
                className="absolute -inset-1 rounded-lg animate-pulse-glow"
                style={{
                  background: `radial-gradient(circle, ${activeGuardian.accentGlow} 0%, transparent 70%)`,
                  animationDuration: `${state.pulse}s`,
                }}
              />
            </div>
            <div className="pr-2">
              <p
                className="text-[9px] font-mono tracking-[0.15em] font-semibold"
                style={{ color: activeGuardian.accentColor }}
              >
                {activeGuardian.name}
              </p>
              <p className="text-[8px] tracking-[0.1em] uppercase text-white/40 mt-0.5">
                {state.label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}