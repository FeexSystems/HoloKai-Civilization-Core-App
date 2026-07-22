import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ChevronRight,
  Globe,
  BookOpen,
  Compass,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import { GUARDIANS } from '@/lib/guardians';
import OrbitalScene from '@/components/orbital-lab/OrbitalScene';
import SplineOrbitalStage from '@/components/orbital-lab/SplineOrbitalStage';

/** Ordered Vanguard clips under /public/videos/vanguard/ */
const VANGUARD_VIDEOS = [
  '01-oluwa-core.mp4',
  '02-naja-7.mp4',
  '03-kemet-alpha.mp4',
  '04-zamani.mp4',
  '05-bantu-node.mp4',
  '06-sika-gold.mp4',
  '07-asante-v.mp4',
  '08-kush-prime.mp4',
];

const FEATURES = [
  {
    icon: Globe,
    title: 'Civilization Memory',
    description:
      'Eight Guardian AI minds, each a specialist in a thread of Pan-African history — from Kemet to Kush, Nsibidi to the Swahili Coast.',
  },
  {
    icon: BookOpen,
    title: 'Grounded Research',
    description:
      'Every answer traced to primary sources, archaeological records, oral traditions, and peer-reviewed scholarship — not speculation.',
  },
  {
    icon: Compass,
    title: 'Immersive Cartography',
    description:
      'Interactive maps of ancient trade routes, migration corridors, and kingdom boundaries — overlaid with modern geospatial data.',
  },
  {
    icon: Shield,
    title: 'Knowledge Integrity',
    description:
      'Evidence scoring, citation indexes, and confidence metrics — know exactly how each claim is supported before you use it.',
  },
  {
    icon: Layers,
    title: 'Multidimensional Tools',
    description:
      'Timeline explorer, manuscript viewer, knowledge graphs, and oral tradition explorer — all integrated into one research environment.',
  },
  {
    icon: Sparkles,
    title: 'Spline 3D Orbital Lab',
    description:
      'Enter a real-time 3D orbital laboratory where data, history, and human intelligence converge in an immersive spatial interface.',
  },
];

function VideoCard({ src, name, role, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className="group relative flex-shrink-0 w-[160px] md:w-[180px]"
    >
      <div className="relative overflow-hidden rounded-xl aspect-[3/4] border border-white/5">
        <video
          src={src}
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
          onMouseEnter={(e) => e.target.play().catch(() => {})}
          onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-[9px] tracking-[0.3em] uppercase font-mono text-holokai-gold/60">
            {role}
          </p>
          <p className="text-xs font-display font-semibold text-white mt-0.5">
            {name}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SectionHeading({ label, title, subtitle }) {
  return (
    <div className="text-center mb-16">
      <p className="text-[10px] tracking-[0.4em] uppercase font-mono text-holokai-gold/50 mb-3">
        {label}
      </p>
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-[0.05em] text-white mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-white/40 max-w-2xl mx-auto font-light leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Global ambient 3D stack — OrbitalScene fallback + Spline primary */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <OrbitalScene accentColor="#E8B84B" />
        <SplineOrbitalStage />
      </div>

      {/* ===== HERO ===== */}
      <section
        ref={heroRef}
        className="relative z-10 min-h-screen flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Soft radial wash over 3D stack */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(200,149,42,0.08),transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </motion.div>

        {/* Hero content */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative z-10 flex flex-col items-center px-4 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            <img
              src="/logos/holokai-logo-vertical.png"
              alt="HoloKai"
              className="w-32 md:w-40 mx-auto mb-8 animate-float-gentle"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-[0.08em] text-white mb-4"
          >
            Where Civilization
            <br />
            <span className="text-gold-gradient">Remembers</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 1 }}
            className="text-sm md:text-base text-white/40 max-w-xl mx-auto font-light leading-relaxed mb-10"
          >
            An immersive research platform for the study,
            preservation, and synthesis of Pan-African civilizations —
            powered by grounded AI and curated by human intelligence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <button
              onClick={() => navigate('/orbital-lab')}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full transition-all duration-500 gold-glow"
              style={{
                background: 'linear-gradient(135deg, rgba(232,184,75,0.15), rgba(232,184,75,0.05))',
                border: '1px solid rgba(232,184,75,0.3)',
              }}
            >
              <span className="text-sm tracking-[0.3em] uppercase font-mono font-medium text-holokai-gold">
                Enter Alkebulan
              </span>
              <ChevronRight className="w-4 h-4 text-holokai-gold transition-transform group-hover:translate-x-1" />
              <div
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ boxShadow: '0 0 40px -5px rgba(232,184,75,0.3)' }}
              />
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[8px] tracking-[0.4em] uppercase font-mono text-white/20">
            Scroll
          </span>
          <div className="w-4 h-7 rounded-full border border-white/10 flex justify-center pt-1.5">
            <div className="w-1 h-1.5 rounded-full bg-white/30 animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* ===== VISION ===== */}
      <section className="relative z-10 py-32 px-4 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            label="The Vision"
            title="Alkebulan — The Ancient Name"
            subtitle="Before the continent was called Africa, it was Alkebulan — 'mother of mankind' or 'garden of Eden.' HoloKai is built to recover, connect, and honor that deep memory."
          />

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                number: '01',
                title: 'Recover',
                desc: 'Surface forgotten histories from oral traditions, archaeological records, and multilingual archives — making them accessible and interconnected.',
              },
              {
                number: '02',
                title: 'Connect',
                desc: 'Link civilizations across time and space — from the Nile Valley to the Niger Basin, from Great Zimbabwe to the Swahili Coast — revealing the threads that bind them.',
              },
              {
                number: '03',
                title: 'Evolve',
                desc: 'Equip researchers, educators, and storytellers with AI-powered tools that respect the complexity and dignity of African knowledge systems.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="glass-panel rounded-2xl p-8 hover:border-holokai-gold/20 transition-colors duration-500"
              >
                <p className="text-3xl font-display font-bold text-holokai-gold/20 mb-4">
                  {item.number}
                </p>
                <h3 className="text-lg font-display font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-white/40 font-light leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="relative z-10 py-32 px-4 bg-background/90">
        <div className="absolute inset-0 orbital-radial pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <SectionHeading
            label="Capabilities"
            title="The Civilization Core"
            subtitle="A research environment built for depth — every tool designed to respect the density of the subject matter."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="glass-panel-light rounded-xl p-6 hover:bg-white/[0.06] transition-all duration-300 group"
                >
                  <Icon className="w-5 h-5 text-holokai-gold/60 mb-3 group-hover:text-holokai-gold transition-colors" />
                  <h3 className="text-sm font-display font-semibold text-white mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-white/40 font-light leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== VANGUARD HUMANOIDS ===== */}
      <section className="relative z-10 py-32 px-4 bg-background/85 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label="The Vanguard"
            title="Eight Minds. One Memory."
            subtitle="Each Guardian embodies a specialized intelligence — a researcher, an archivist, a strategist, a cipher. Together they form a distributed intelligence for civilization-scale understanding."
          />

          <div className="flex gap-4 overflow-x-auto pb-8 px-2 scrollbar-thin justify-center md:flex-wrap">
            {VANGUARD_VIDEOS.map((vid, i) => {
              const id = vid.replace(/^\d+-/, '').replace(/\.mp4$/, '');
              const guardian = GUARDIANS.find((g) => g.id === id);
              if (!guardian) return null;
              return (
                <VideoCard
                  key={vid}
                  src={`/videos/vanguard/${vid}`}
                  name={guardian.name}
                  role={guardian.role}
                  index={i}
                />
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-8"
          >
            <button
              onClick={() => navigate('/orbital-lab')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 text-xs tracking-[0.3em] uppercase font-mono text-white/50 hover:text-white hover:border-white/20 transition-all duration-300"
            >
              Meet the Guardians
              <ChevronRight className="w-3 h-3" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ===== 3D ORBITAL LAB PREVIEW ===== */}
      <section className="relative z-10 py-32 px-4 overflow-hidden bg-background/90">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(200,149,42,0.06),transparent_70%)]" />
        <div className="max-w-6xl mx-auto relative">
          <SectionHeading
            label="Experience"
            title="Orbital Lab"
            subtitle="Full-body orbital stage with Vanguard videos. Spline-powered immersion when configured; OrbitalScene CSS ambient as always-on fallback."
          />

          {/* Full-body orbital strip — autoplay muted loops */}
          <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {VANGUARD_VIDEOS.map((vid, i) => (
              <motion.div
                key={vid}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10"
              >
                <video
                  src={`/videos/vanguard/${vid}`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-2xl overflow-hidden border border-white/5 gold-glow"
            style={{ aspectRatio: '16/9', maxHeight: '420px' }}
          >
            <div className="absolute inset-0 bg-holokai-abyss" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(232,184,75,0.12),transparent_60%)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="relative w-[min(70vw,420px)] aspect-square">
                <div className="absolute inset-0 rounded-full border border-holokai-gold/10 animate-orbit" />
                <div className="absolute inset-[15%] rounded-full border border-holokai-gold/8 animate-orbit-reverse" />
                <div className="absolute inset-[30%] rounded-full border border-holokai-gold/5 animate-orbit" />
              </div>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 backdrop-blur-[2px]">
              <p className="text-sm tracking-[0.3em] uppercase font-mono text-white/40 mb-4">
                Ready to enter?
              </p>
              <button
                type="button"
                onClick={() => navigate('/orbital-lab')}
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full transition-all duration-500 hover:scale-105 gold-glow"
                style={{
                  background: 'linear-gradient(135deg, rgba(232,184,75,0.2), rgba(232,184,75,0.06))',
                  border: '1px solid rgba(232,184,75,0.35)',
                }}
              >
                <span className="text-sm tracking-[0.3em] uppercase font-mono font-medium text-holokai-gold">
                  Enter Alkebulan
                </span>
                <ChevronRight className="w-4 h-4 text-holokai-gold transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="relative z-10 py-32 px-4 bg-background/95">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <img
              src="/logos/holokai-logo-vertical.png"
              alt="HoloKai"
              className="w-20 mx-auto mb-6 opacity-60"
            />
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-[0.05em] text-white mb-4">
              The Journey Begins
            </h2>
            <p className="text-sm text-white/40 max-w-lg mx-auto font-light leading-relaxed mb-10">
              Choose your Guardian. Enter the Orbital Lab. Explore ten thousand years
              of civilization across the continent that birthed humanity.
            </p>
            <button
              onClick={() => navigate('/orbital-lab')}
              className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full transition-all duration-500 gold-glow"
              style={{
                background: 'linear-gradient(135deg, rgba(232,184,75,0.2), rgba(232,184,75,0.08))',
                border: '1px solid rgba(232,184,75,0.35)',
              }}
            >
              <span className="text-sm tracking-[0.3em] uppercase font-mono font-medium text-holokai-gold">
                Enter Alkebulan
              </span>
              <ChevronRight className="w-4 h-4 text-holokai-gold transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-4 bg-background">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logos/holokai-favicon.ico"
              alt="HoloKai"
              className="w-6 h-6 opacity-40"
            />
            <span className="text-[10px] tracking-[0.3em] uppercase font-mono text-white/20">
              HoloKai — Where Civilization Remembers
            </span>
          </div>
          <p className="text-[9px] tracking-[0.2em] uppercase font-mono text-white/10">
            Alkebulan Research Network
          </p>
        </div>
      </footer>
    </div>
  );
}
