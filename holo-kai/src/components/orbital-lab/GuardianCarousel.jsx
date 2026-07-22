import React, { useState } from 'react';
import { GUARDIANS } from '@/lib/guardians';

/**
 * Vanguard guardian picker for Orbital Lab.
 * Primary media: /public/videos/vanguard/*.mp4
 * Poster / fallback: static full-body image.
 */
export default function GuardianCarousel({ selectedId, onSelect }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="relative z-20 w-full">
      <div className="text-center mb-6">
        <p className="text-[10px] tracking-[0.4em] uppercase text-holokai-gold/50 font-mono mb-2">
          Choose Your Guardian
        </p>
        <h2 className="text-xs tracking-[0.2em] uppercase text-white/60 font-light">
          Eight minds. One memory.
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4 px-4 justify-center md:justify-start md:flex-wrap max-w-6xl mx-auto">
        {GUARDIANS.map((g) => {
          const isActive = selectedId === g.id;
          const isHovered = hovered === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelect(g.id)}
              onMouseEnter={() => setHovered(g.id)}
              onMouseLeave={() => setHovered(null)}
              className="group relative flex-shrink-0 w-[110px] md:w-[120px] text-left transition-all duration-500"
              style={{
                transform: isActive ? 'translateY(-8px)' : isHovered ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              <div
                className="relative overflow-hidden rounded-lg transition-all duration-500"
                style={{
                  border: `1px solid ${isActive ? g.accentColor : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isActive ? `0 0 30px -5px ${g.accentGlow}` : 'none',
                }}
              >
                <div className="aspect-[3/4] relative bg-black/40">
                  {g.video ? (
                    <video
                      src={g.video}
                      poster={g.image}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                  ) : (
                    <img
                      src={g.image}
                      alt={g.name}
                      className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                    />
                  )}
                  <div
                    className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `linear-gradient(to top, ${g.accentColor}40 0%, transparent 50%)`,
                      opacity: isActive ? 0.8 : 0.3,
                    }}
                  />
                </div>
              </div>

              <div className="mt-2 px-1">
                <p
                  className="text-[10px] font-mono tracking-[0.15em] font-semibold truncate"
                  style={{ color: isActive ? g.accentColor : 'rgba(255,255,255,0.6)' }}
                >
                  {g.name}
                </p>
                <p className="text-[9px] tracking-[0.1em] uppercase text-white/30 mt-0.5 truncate">
                  {g.role}
                </p>
              </div>

              {isActive && (
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: g.accentColor, boxShadow: `0 0 12px ${g.accentColor}` }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
