import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import OrbitalScene from '@/components/orbital-lab/OrbitalScene';
import SplineOrbitalStage from '@/components/orbital-lab/SplineOrbitalStage';
import GuardianCarousel from '@/components/orbital-lab/GuardianCarousel';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { DEFAULT_GUARDIAN, getGuardianById } from '@/lib/guardians';

/**
 * Orbital Lab stack (locked):
 * 1. OrbitalScene — CSS ambient background (always on / fallback)
 * 2. SplineOrbitalStage — primary interactive 3D when VITE_SPLINE_SCENE_URL is set
 * 3. Vanguard <video> — guardian media from /public/videos/vanguard/
 */
export default function OrbitalLab() {
  const [selectedId, setSelectedId] = useState(DEFAULT_GUARDIAN.id);
  const [phase, setPhase] = useState('intro'); // intro -> explore -> portal
  const { selectGuardian, setPortalActive } = useHoloKai();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const guardian = getGuardianById(selectedId);

  // Intro sequence — logo fades, then scene reveals
  useEffect(() => {
    const t = setTimeout(() => setPhase('explore'), 3000);
    return () => clearTimeout(t);
  }, []);

  // Keep selected guardian video looping while exploring
  useEffect(() => {
    if (phase !== 'explore' || !videoRef.current) return undefined;
    const el = videoRef.current;
    el.currentTime = 0;
    el.play().catch(() => {});
    return () => {
      el.pause();
    };
  }, [selectedId, phase]);

  const handleBeginJourney = () => {
    setPhase('portal');
    selectGuardian(selectedId);
    setPortalActive(true);
    setTimeout(() => {
      navigate('/core');
    }, 2200);
  };

  return (
    <div className="fixed inset-0 bg-holokai-abyss overflow-hidden select-none">
      {/* 1. Ambient CSS layer — always on; sole visual when Spline is absent */}
      <OrbitalScene accentColor={guardian.accentColor} />

      {/* 2. Spline primary interactive layer (progressive enhancement) */}
      <SplineOrbitalStage />

      {/* Intro overlay — local logo asset */}
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-holokai-abyss"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              <img
                src="/logos/holokai-logo-vertical.png"
                alt="HoloKai"
                className="w-40 md:w-56 animate-pulse-glow"
              />
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="text-[10px] tracking-[0.5em] uppercase text-holokai-gold/50 font-mono mt-4"
              >
                Initializing Orbital Lab
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portal transition */}
      <AnimatePresence>
        {phase === 'portal' && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="w-32 h-32 rounded-full animate-portal"
              style={{
                background: `radial-gradient(circle, ${guardian.accentColor} 0%, transparent 70%)`,
              }}
            />
            <div className="absolute text-[10px] tracking-[0.5em] uppercase text-white/40 font-mono">
              Entering Civilization Core
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main explore phase */}
      {phase === 'explore' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-10 flex flex-col"
        >
          {/* Top — local wordmark */}
          <div className="flex items-center justify-between p-6 md:p-8">
            <img
              src="/logos/holokai-logo-horizontal.png"
              alt="HoloKai"
              className="h-6 md:h-8 opacity-80"
            />
            <span className="text-[9px] tracking-[0.3em] uppercase text-white/30 font-mono hidden md:block">
              Where Civilization Remembers
            </span>
          </div>

          {/* Center — Guardian video display */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                {/* Glow halo behind guardian */}
                <div
                  className="absolute inset-0 rounded-full blur-3xl"
                  style={{ background: guardian.accentGlow }}
                />
                <div className="relative h-[40vh] md:h-[55vh] max-h-[500px] aspect-[3/4] animate-float-gentle overflow-hidden rounded-lg">
                  {guardian.video ? (
                    <video
                      ref={videoRef}
                      key={guardian.video}
                      src={guardian.video}
                      poster={guardian.image}
                      muted
                      loop
                      playsInline
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={guardian.image}
                      alt={guardian.name}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Guardian info */}
                <div className="text-center mt-6">
                  <p
                    className="text-[10px] tracking-[0.4em] uppercase font-mono mb-1"
                    style={{ color: guardian.accentColor }}
                  >
                    {guardian.role}
                  </p>
                  <h1 className="text-2xl md:text-3xl font-display font-bold tracking-[0.1em] text-white mb-2">
                    {guardian.name}
                  </h1>
                  <p className="text-xs text-white/50 max-w-md mx-auto font-light">
                    {guardian.domain}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom — carousel + CTA */}
          <div className="relative z-20 pb-6 md:pb-8 px-4">
            <div className="max-w-6xl mx-auto">
              <GuardianCarousel selectedId={selectedId} onSelect={setSelectedId} />

              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={handleBeginJourney}
                  className="group relative flex items-center gap-3 px-8 py-3.5 rounded-full transition-all duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${guardian.accentColor}22, ${guardian.accentColor}11)`,
                    border: `1px solid ${guardian.accentColor}44`,
                  }}
                >
                  <span
                    className="text-xs tracking-[0.3em] uppercase font-mono font-medium"
                    style={{ color: guardian.accentColor }}
                  >
                    Begin Journey
                  </span>
                  <ChevronRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    style={{ color: guardian.accentColor }}
                  />
                  <div
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ boxShadow: `0 0 30px -5px ${guardian.accentGlow}` }}
                  />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
