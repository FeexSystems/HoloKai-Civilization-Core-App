import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare, Library, Clock, Map, GitBranch, ScrollText,
  Scale, Volume2, ChevronLeft, ShieldCheck, PenTool,
} from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { GUARDIANS } from '@/lib/guardians';
import { Image } from '@/components/ui/image';

const NAV_ITEMS = [
  { id: 'chat', label: 'Research Chat', icon: MessageSquare },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'map', label: 'Interactive Map', icon: Map },
  { id: 'manuscripts', label: 'Manuscripts', icon: ScrollText },
  { id: 'knowledge-graph', label: 'Knowledge Graph', icon: GitBranch },
  { id: 'compare', label: 'Compare', icon: Scale },
  { id: 'oral-tradition', label: 'Oral Tradition', icon: Volume2 },
  { id: 'vanguard', label: 'Vanguard', icon: ShieldCheck },
  { id: 'studio', label: 'Studio', icon: PenTool },
];

export default function Sidebar({ activeView, onNavigate }) {
  const { activeGuardian, selectGuardian, session } = useHoloKai();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const location = useLocation();

  return (
    <aside
      className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col border-r"
      style={{
        background: 'rgba(10, 10, 16, 0.8)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(200, 149, 42, 0.1)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(200, 149, 42, 0.1)' }}>
        <Link to="/" className="flex items-center gap-2">
          <img
            src="https://media.base44.com/images/public/user_6a5daea3c4460fe70dc4330e/4258cfce2_holokai-logo-horizontal.png"
            alt="HoloKai"
            className="h-6 opacity-80"
          />
        </Link>
        <p className="text-[8px] tracking-[0.3em] uppercase text-white/30 font-mono mt-2">
          Civilization Core
        </p>
      </div>

      {/* Active Guardian */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'rgba(200, 149, 42, 0.1)' }}>
        <button
          onClick={() => setShowSwitcher(!showSwitcher)}
          className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ border: `1px solid ${activeGuardian.accentColor}22` }}
        >
          <div className="relative">
            <div
              className="w-10 h-10 rounded-lg overflow-hidden"
              style={{ border: `1px solid ${activeGuardian.accentColor}55` }}
            >
              <Image
                src={activeGuardian.image}
                alt={activeGuardian.name}
                fittingType="fill"
                className="w-full h-full"
              />
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-holokai-obsidian"
              style={{ background: activeGuardian.accentColor }}
            />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p
              className="text-[10px] font-mono tracking-[0.1em] font-semibold truncate"
              style={{ color: activeGuardian.accentColor }}
            >
              {activeGuardian.name}
            </p>
            <p className="text-[9px] tracking-[0.05em] uppercase text-white/40 truncate">
              {activeGuardian.role}
            </p>
          </div>
        </button>

        {/* Guardian Switcher */}
        {showSwitcher && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {GUARDIANS.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  selectGuardian(g.id);
                  setShowSwitcher(false);
                }}
                className="relative group"
                title={`${g.name} — ${g.role}`}
              >
                <div
                  className="aspect-square rounded-md overflow-hidden transition-all"
                  style={{
                    border: `1px solid ${g.id === activeGuardian.id ? g.accentColor : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: g.id === activeGuardian.id ? `0 0 12px ${g.accentGlow}` : 'none',
                  }}
                >
                  <Image src={g.image} alt={g.name} fittingType="fill" className="w-full h-full" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        <p className="text-[8px] tracking-[0.3em] uppercase text-white/20 font-mono px-3 mb-2">
          Research Tools
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all group relative"
              style={{
                background: isActive ? `${activeGuardian.accentColor}15` : 'transparent',
              }}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                  style={{ background: activeGuardian.accentColor }}
                />
              )}
              <Icon
                className="w-4 h-4 transition-colors"
                style={{
                  color: isActive ? activeGuardian.accentColor : 'rgba(255,255,255,0.4)',
                }}
              />
              <span
                className="text-xs font-medium transition-colors"
                style={{
                  color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(200, 149, 42, 0.1)' }}>
        <a
          href={import.meta.env.VITE_LANDING_URL || '/'}
          className="flex items-center gap-2 text-[10px] tracking-[0.1em] uppercase text-white/30 hover:text-white/60 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          Return to Alkebulan
        </a>
      </div>
    </aside>
  );
}