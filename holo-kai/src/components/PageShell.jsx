import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';

/**
 * Shared chrome for secondary HoloKai pages (outside Orbital Lab / Core).
 */
export default function PageShell({
  title,
  subtitle,
  badge,
  children,
  backTo = '/',
  backLabel = 'Orbital Lab',
  wide = false,
}) {
  const { activeGuardian } = useHoloKai();
  const accent = activeGuardian?.accentColor || '#E8B84B';

  return (
    <div
      className="min-h-screen bg-holokai-obsidian text-white"
      style={{
        background: `radial-gradient(ellipse 70% 40% at 20% 0%, ${accent}0D 0%, transparent 55%), #0A0A0A`,
      }}
    >
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-xl"
        style={{
          borderColor: 'rgba(200,149,42,0.1)',
          background: 'rgba(10,10,16,0.75)',
        }}
      >
        <div className={`mx-auto flex items-center justify-between gap-4 px-6 py-4 ${wide ? 'max-w-7xl' : 'max-w-5xl'}`}>
          <div className="flex items-center gap-4 min-w-0">
            <Link to={backTo} className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-white/40 hover:text-white/70 transition-colors font-mono shrink-0">
              <ChevronLeft className="w-3.5 h-3.5" />
              {backLabel}
            </Link>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-display font-semibold tracking-wide truncate">
                  {title}
                </h1>
                {badge && (
                  <span
                    className="text-[9px] font-mono tracking-[0.12em] uppercase px-2 py-0.5 rounded"
                    style={{
                      color: accent,
                      background: `${accent}18`,
                      border: `1px solid ${accent}33`,
                    }}
                  >
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-[11px] text-white/40 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <Link to="/" className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
            <img
              src="https://media.base44.com/images/public/user_6a5daea3c4460fe70dc4330e/4258cfce2_holokai-logo-horizontal.png"
              alt="HoloKai"
              className="h-5 md:h-6"
            />
          </Link>
        </div>
      </header>

      <main className={`mx-auto px-6 py-8 ${wide ? 'max-w-7xl' : 'max-w-5xl'}`}>
        {children}
      </main>
    </div>
  );
}
