import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, Clock } from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { MOCK_ORAL_TRADITIONS } from '@/lib/mockData';

export default function OralTraditionExplorer() {
  const { activeGuardian } = useHoloKai();
  const [selected, setSelected] = useState(MOCK_ORAL_TRADITIONS[0]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulate playback
  useEffect(() => {
    if (playing) {
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            setPlaying(false);
            return 0;
          }
          return p + 1;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [playing]);

  const selectTradition = (t) => {
    setSelected(t);
    setProgress(0);
    setPlaying(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <h2 className="text-lg font-display font-semibold tracking-wide text-white">Oral Tradition Explorer</h2>
        <p className="text-xs text-white/40 mt-0.5">Oral histories with synchronized transcripts</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className="w-72 flex-shrink-0 border-r overflow-y-auto scrollbar-thin" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
          {MOCK_ORAL_TRADITIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTradition(t)}
              className="w-full text-left px-4 py-3 border-b transition-all"
              style={{
                borderColor: 'rgba(200,149,42,0.05)',
                background: selected.id === t.id ? `${activeGuardian.accentColor}10` : 'transparent',
                borderLeft: `2px solid ${selected.id === t.id ? activeGuardian.accentColor : 'transparent'}`,
              }}
            >
              <p className="text-sm font-medium text-white/80 line-clamp-2">{t.title}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[9px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ background: `${activeGuardian.accentColor}12`, color: activeGuardian.accentColor }}>
                  {t.theme}
                </span>
                <span className="text-[9px] text-white/30 font-mono flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {t.duration}
                </span>
              </div>
              <p className="text-[10px] text-white/30 mt-1">{t.region} · {t.language}</p>
            </button>
          ))}
        </div>

        {/* Player + transcript */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4">
            <h3 className="text-base font-display font-semibold text-white">{selected.title}</h3>
            <p className="text-xs text-white/40 mt-1">
              {selected.region} · {selected.language} · Narrated by {selected.narrator}
            </p>
          </div>

          {/* Player */}
          <div className="mx-6 mb-4 glass-panel rounded-xl p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPlaying(!playing)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: `linear-gradient(135deg, ${activeGuardian.accentColor}, ${activeGuardian.accentColor}88)`,
                  boxShadow: `0 0 20px ${activeGuardian.accentGlow}`,
                }}
              >
                {playing ? (
                  <Pause className="w-5 h-5 text-holokai-obsidian" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 text-holokai-obsidian ml-0.5" fill="currentColor" />
                )}
              </button>

              <div className="flex-1">
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${activeGuardian.accentColor}, ${activeGuardian.accentColor}88)`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] font-mono text-white/40">
                    {Math.floor((progress / 100) * 45)}:00
                  </span>
                  <span className="text-[10px] font-mono text-white/40">{selected.duration}</span>
                </div>
              </div>

              <Volume2 className="w-5 h-5 text-white/30" />
            </div>
          </div>

          {/* Synchronized transcript */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6">
            <p className="text-[10px] tracking-[0.2em] uppercase font-mono text-white/30 mb-3">Transcript</p>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => {
                const isActive = Math.floor((progress / 100) * 8) === i;
                return (
                  <p
                    key={i}
                    className="text-sm leading-relaxed transition-all"
                    style={{
                      color: isActive ? activeGuardian.accentColor : 'rgba(255,255,255,0.5)',
                      fontWeight: isActive ? 500 : 400,
                      paddingLeft: isActive ? '12px' : '0',
                      borderLeft: isActive ? `2px solid ${activeGuardian.accentColor}` : '2px solid transparent',
                    }}
                  >
                    {isActive && '[▶] '}
                    {[
                      'In the time before memory, when the rivers ran differently...',
                      'The ancestors gathered beneath the great baobab tree.',
                      'They spoke of the kingdom that stretched from the mountains to the sea.',
                      'The queen mother arose, and she said: I am the keeper of the line.',
                      'And the people answered: Your word is the path.',
                      'So began the dynasty that would last a hundred seasons.',
                      'The griots carry this memory still, from mouth to ear to mouth.',
                      'This is how we remember. This is how civilization endures.',
                    ][i]}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}