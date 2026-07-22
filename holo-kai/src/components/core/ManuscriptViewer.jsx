import React, { useState } from 'react';
import { ZoomIn, ZoomOut, MessageSquare, FileText, Languages } from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { MOCK_MANUSCRIPTS } from '@/lib/mockData';

export default function ManuscriptViewer() {
  const { activeGuardian } = useHoloKai();
  const [selected, setSelected] = useState(MOCK_MANUSCRIPTS[0]);
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState('transcription');

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <h2 className="text-lg font-display font-semibold tracking-wide text-white">Manuscript Viewer</h2>
        <p className="text-xs text-white/40 mt-0.5">Digitized manuscripts with transcription and translation</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Manuscript list */}
        <div className="w-64 flex-shrink-0 border-r overflow-y-auto scrollbar-thin" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
          {MOCK_MANUSCRIPTS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="w-full text-left px-4 py-3 border-b transition-all"
              style={{
                borderColor: 'rgba(200,149,42,0.05)',
                background: selected.id === m.id ? `${activeGuardian.accentColor}10` : 'transparent',
                borderLeft: `2px solid ${selected.id === m.id ? activeGuardian.accentColor : 'transparent'}`,
              }}
            >
              <p className="text-xs font-medium text-white/80 line-clamp-2">{m.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[9px] text-white/30 font-mono">{m.civilization}</span>
                <span className="text-[9px] text-white/20">·</span>
                <span className="text-[9px] text-white/30 font-mono">{m.pages}pp</span>
              </div>
            </button>
          ))}
        </div>

        {/* Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Viewer header */}
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-white/90 truncate">{selected.title}</h3>
              <p className="text-[10px] text-white/30 font-mono mt-0.5">
                {selected.date} · {selected.language}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="p-1.5 rounded-lg glass-panel-light">
                <ZoomOut className="w-4 h-4 text-white/50" />
              </button>
              <span className="text-[10px] font-mono text-white/40 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="p-1.5 rounded-lg glass-panel-light">
                <ZoomIn className="w-4 h-4 text-white/50" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Page view */}
            <div className="flex-1 overflow-auto scrollbar-thin p-6 flex items-center justify-center" style={{ background: '#080810' }}>
              <div
                className="aspect-[3/4] w-full max-w-md rounded-lg p-8 shadow-2xl transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, #1a1810 0%, #252015 100%)`,
                  transform: `scale(${zoom})`,
                  border: `1px solid ${activeGuardian.accentColor}22`,
                }}
              >
                <div className="h-full flex flex-col">
                  <div className="text-center pb-4 border-b" style={{ borderColor: `${activeGuardian.accentColor}33` }}>
                    <p className="text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: activeGuardian.accentColor }}>
                      {selected.civilization}
                    </p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="space-y-3 opacity-70">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-px"
                          style={{
                            width: `${60 + Math.random() * 30}%`,
                            background: `${activeGuardian.accentColor}40`,
                          }}
                        />
                      ))}
                      <div className="my-3 flex justify-center">
                        <div
                          className="w-12 h-12 rounded opacity-30"
                          style={{ border: `1px solid ${activeGuardian.accentColor}` }}
                        />
                      </div>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-px"
                          style={{
                            width: `${50 + Math.random() * 35}%`,
                            background: `${activeGuardian.accentColor}40`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-center pt-4 border-t" style={{ borderColor: `${activeGuardian.accentColor}22` }}>
                    <p className="text-[9px] font-mono text-white/30">Page 1 of {selected.pages}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Side panel */}
            <div className="w-72 flex-shrink-0 border-l glass-panel flex flex-col" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
              <div className="flex">
                <button
                  onClick={() => setActiveTab('transcription')}
                  className="flex-1 py-2.5 text-[10px] tracking-wider uppercase font-mono transition-colors flex items-center justify-center gap-1.5"
                  style={{
                    color: activeTab === 'transcription' ? activeGuardian.accentColor : 'rgba(255,255,255,0.4)',
                    borderBottom: `2px solid ${activeTab === 'transcription' ? activeGuardian.accentColor : 'transparent'}`,
                  }}
                >
                  <FileText className="w-3 h-3" /> Transcription
                </button>
                <button
                  onClick={() => setActiveTab('translation')}
                  disabled={!selected.hasTranslation}
                  className="flex-1 py-2.5 text-[10px] tracking-wider uppercase font-mono transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30"
                  style={{
                    color: activeTab === 'translation' ? activeGuardian.accentColor : 'rgba(255,255,255,0.4)',
                    borderBottom: `2px solid ${activeTab === 'translation' ? activeGuardian.accentColor : 'transparent'}`,
                  }}
                >
                  <Languages className="w-3 h-3" /> Translation
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                {activeTab === 'transcription' ? (
                  <p className="text-xs text-white/60 leading-relaxed font-mono">
                    {selected.hasTranscription
                      ? `[Fragment 1] The kingdom was founded in the time of the ancestors, when the river flowed north and the stars marked the seasons of planting. The queen mother sat at the right hand of the king, and her word was law in matters of succession...`
                      : 'Transcription not yet available. Contribute to help transcribe this manuscript.'}
                  </p>
                ) : (
                  <p className="text-xs text-white/60 leading-relaxed">
                    {selected.hasTranslation
                      ? 'The kingdom was established during the era of the ancestors, when celestial movements guided agricultural cycles. The queen mother held a position of authority alongside the king, with decisive influence over succession matters.'
                      : 'Translation not yet available for undeciphered scripts.'}
                  </p>
                )}
              </div>

              <div className="p-4 border-t" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
                <button
                  className="w-full py-2.5 rounded-lg text-[10px] tracking-wider uppercase font-mono transition-all flex items-center justify-center gap-2"
                  style={{
                    background: `${activeGuardian.accentColor}15`,
                    border: `1px solid ${activeGuardian.accentColor}44`,
                    color: activeGuardian.accentColor,
                  }}
                >
                  <MessageSquare className="w-3 h-3" /> Send to Research Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}