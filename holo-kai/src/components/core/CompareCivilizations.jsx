import React, { useState } from 'react';
import { Plus, X, Sparkles } from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { COMPARE_DIMENSIONS, COMPARE_DATA, CIVILIZATIONS } from '@/lib/mockData';

export default function CompareCivilizations() {
  const { activeGuardian } = useHoloKai();
  const [selected, setSelected] = useState(['Kush', 'Kemet']);
  const [showPicker, setShowPicker] = useState(false);

  const toggle = (civ) => {
    if (selected.includes(civ)) {
      setSelected(selected.filter((c) => c !== civ));
    } else if (selected.length < 4) {
      setSelected([...selected, civ]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <h2 className="text-lg font-display font-semibold tracking-wide text-white">Compare Civilizations</h2>
        <p className="text-xs text-white/40 mt-0.5">Side-by-side analysis across dimensions</p>
      </div>

      {/* Selected civilizations chips */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.map((civ) => (
            <div key={civ} className="flex items-center gap-2 glass-panel-light rounded-full px-3 py-1.5">
              <span className="text-xs text-white/80 font-medium">{civ}</span>
              <button onClick={() => toggle(civ)}>
                <X className="w-3 h-3 text-white/30 hover:text-white/70" />
              </button>
            </div>
          ))}
          {selected.length < 4 && (
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all"
              style={{ border: `1px dashed ${activeGuardian.accentColor}44`, color: activeGuardian.accentColor }}
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>

        {showPicker && (
          <div className="mt-3 flex flex-wrap gap-2 p-3 glass-panel-light rounded-lg">
            {CIVILIZATIONS.filter((c) => !selected.includes(c) && COMPARE_DATA[c]).map((civ) => (
              <button
                key={civ}
                onClick={() => toggle(civ)}
                className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors"
              >
                {civ}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comparison grid */}
      <div className="flex-1 overflow-auto scrollbar-thin px-6 py-4">
        {selected.length >= 2 ? (
          <div className="space-y-4">
            {/* AI Synthesis */}
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: activeGuardian.accentColor }} />
                <span className="text-[10px] tracking-[0.2em] uppercase font-mono" style={{ color: activeGuardian.accentColor }}>
                  {activeGuardian.name} Synthesis
                </span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                {selected.join(' and ')} share deep connections through Nile Valley exchange networks, yet diverge in
                governance structures and linguistic traditions. The evidence suggests sustained cultural contact
                across centuries, with matrilineal systems appearing prominently in both.
              </p>
            </div>

            {/* Comparison table */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `140px repeat(${selected.length}, 1fr)` }}>
              {/* Header row */}
              <div />
              {selected.map((civ) => (
                <div key={civ} className="glass-panel-light rounded-lg p-3 text-center">
                  <p className="text-sm font-display font-semibold" style={{ color: activeGuardian.accentColor }}>
                    {civ}
                  </p>
                </div>
              ))}

              {/* Dimension rows */}
              {COMPARE_DIMENSIONS.map((dim) => (
                <React.Fragment key={dim.key}>
                  <div className="flex items-center">
                    <span className="text-[10px] tracking-[0.15em] uppercase font-mono text-white/40">
                      {dim.label}
                    </span>
                  </div>
                  {selected.map((civ) => (
                    <div key={civ + dim.key} className="glass-panel-light rounded-lg p-3">
                      <p className="text-xs text-white/70 leading-relaxed">
                        {COMPARE_DATA[civ]?.[dim.key] || (
                          <span className="text-white/30 italic">Data unavailable — contribute to fill this gap</span>
                        )}
                      </p>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <Plus className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">Select at least two civilizations to compare</p>
          </div>
        )}
      </div>
    </div>
  );
}