import React, { useMemo } from 'react';

// Particle field — warm gold dust drifting upward through the orbital lab
export default function OrbitalScene({ accentColor = '#E8B84B' }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: `${1 + Math.random() * 3}px`,
        delay: `${Math.random() * 20}s`,
        duration: `${15 + Math.random() * 15}s`,
      })),
    [accentColor]
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deep space background */}
      <div className="absolute inset-0 bg-holokai-abyss" />

      {/* Radial glow following guardian accent */}
      <div
        className="absolute inset-0 transition-all duration-[2000ms]"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${accentColor}1A 0%, transparent 60%)`,
        }}
      />

      {/* Orbit rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-[120vw] h-[120vw] max-w-[900px] max-h-[900px] -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
          <div
            className="absolute inset-0 rounded-full border animate-orbit"
            style={{ borderColor: `${accentColor}12` }}
          />
          <div
            className="absolute inset-[8%] rounded-full border animate-orbit-reverse"
            style={{ borderColor: `${accentColor}10` }}
          />
          <div
            className="absolute inset-[16%] rounded-full border animate-orbit"
            style={{ borderColor: `${accentColor}08` }}
          />
          <div
            className="absolute inset-[24%] rounded-full border animate-orbit-reverse"
            style={{ borderColor: `${accentColor}06` }}
          />
        </div>
      </div>

      {/* Floating holographic objects on orbit path */}
      {['Manuscripts', 'Star Maps', 'Benin Bronzes', 'Adinkra', 'Great Zimbabwe', 'DNA Helix', 'Nsibidi'].map(
        (label, i) => {
          const angle = (i / 7) * 360;
          return (
            <div
              key={label}
              className="absolute top-1/2 left-1/2 animate-orbit"
              style={{
                transformOrigin: 'center',
                animationDuration: `${60 + i * 5}s`,
              }}
            >
              <div
                className="absolute"
                style={{
                  transform: `rotate(${angle}deg) translateY(-280px) rotate(-${angle}deg)`,
                }}
              >
                <div className="flex flex-col items-center gap-1 animate-float-gentle" style={{ animationDelay: `${i * 0.5}s` }}>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: accentColor,
                      boxShadow: `0 0 20px ${accentColor}, 0 0 40px ${accentColor}66`,
                    }}
                  />
                  <span className="text-[8px] tracking-[0.3em] uppercase text-holokai-gold/40 font-mono whitespace-nowrap">
                    {label}
                  </span>
                </div>
              </div>
            </div>
          );
        }
      )}

      {/* Particle drift */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-0 rounded-full animate-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: accentColor,
            boxShadow: `0 0 6px ${accentColor}`,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: 0.5,
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(5,5,10,0.6) 100%)'
      }} />
    </div>
  );
}