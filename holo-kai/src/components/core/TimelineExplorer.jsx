import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { searchLibrary } from '@/lib/holokaiApi';
import { MOCK_TIMELINE_EVENTS } from '@/lib/mockData';

const ERAS = [
  { id: 'ancient', label: 'Ancient (pre-1000 BCE)', filter: '1000 BCE' },
  { id: 'classical', label: 'Classical (1000 BCE–500 CE)', filter: '500 CE' },
  { id: 'medieval-early', label: 'Early Medieval (500–1000 CE)', filter: '1000 CE' },
  { id: 'medieval-late', label: 'Late Medieval (1000–1500 CE)', filter: '1500 CE' },
  { id: 'early-modern', label: 'Early Modern (1500–1800 CE)', filter: '1800 CE' },
  { id: 'modern', label: 'Modern (1800 CE–present)', filter: '' },
];

export default function TimelineExplorer() {
  const { activeGuardian } = useHoloKai();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eraFilter, setEraFilter] = useState('');
  const [apiEvents, setApiEvents] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadFromApi = useCallback(async () => {
    setLoading(true);
    try {
      const data = await searchLibrary({ era: eraFilter || undefined, limit: 100 });
      if (data?.items?.length) {
        const mapped = data.items.map((s, i) => ({
          id: `api-${s.slug || i}`,
          date: s.era || 'Unknown',
          title: s.title,
          civilization: s.civilization || '',
          region: s.region || '',
        }));
        setApiEvents(mapped);
      } else {
        setApiEvents([]);
      }
    } catch {
      setApiEvents(null);
    } finally {
      setLoading(false);
    }
  }, [eraFilter]);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  const events = useMemo(() => {
    const base = (apiEvents && apiEvents.length > 0) ? apiEvents : MOCK_TIMELINE_EVENTS;
    if (!eraFilter) return base;
    return base.filter((e) => {
      const dateStr = e.date;
      const year = parseInt(dateStr);
      if (isNaN(year)) return true;
      const isBCE = dateStr.includes('BCE');
      const yearNum = isBCE ? -year : year;
      const eraDef = ERAS.find((er) => er.id === eraFilter);
      if (!eraDef) return true;
      if (eraDef.id === 'ancient') return yearNum < -1000;
      if (eraDef.id === 'classical') return yearNum >= -1000 && yearNum < 500;
      if (eraDef.id === 'medieval-early') return yearNum >= 500 && yearNum < 1000;
      if (eraDef.id === 'medieval-late') return yearNum >= 1000 && yearNum < 1500;
      if (eraDef.id === 'early-modern') return yearNum >= 1500 && yearNum < 1800;
      if (eraDef.id === 'modern') return yearNum >= 1800;
      return true;
    });
  }, [apiEvents, eraFilter]);

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      const parseDate = (d) => {
        const num = parseInt(d);
        return d.includes('BCE') ? -num : num;
      };
      return parseDate(a.date) - parseDate(b.date);
    });
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold tracking-wide text-white">Timeline Explorer</h2>
            <p className="text-xs text-white/40 mt-0.5">Chronological journey through African civilizations</p>
          </div>
          <div className="flex gap-1">
            {ERAS.map((era) => (
              <button
                key={era.id}
                onClick={() => setEraFilter(eraFilter === era.id ? '' : era.id)}
                className="px-2.5 py-1.5 rounded-lg text-[9px] tracking-wider uppercase font-mono transition-all whitespace-nowrap"
                style={{
                  background: eraFilter === era.id ? `${activeGuardian.accentColor}15` : 'transparent',
                  border: `1px solid ${eraFilter === era.id ? activeGuardian.accentColor + '44' : 'rgba(255,255,255,0.08)'}`,
                  color: eraFilter === era.id ? activeGuardian.accentColor : 'rgba(255,255,255,0.4)',
                }}
              >
                {era.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: activeGuardian.accentColor }} />
            </div>
          )}

          {!loading && (
            <div className="relative">
              <div className="absolute left-[120px] top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${activeGuardian.accentColor}44, transparent)` }} />

              <div className="space-y-1">
                {sorted.map((event, i) => {
                  const isSelected = selectedEvent?.id === event.id;
                  const isGuardianRelevant = activeGuardian.focus.some((f) =>
                    (event.civilization || '').toLowerCase().includes(f.toLowerCase()) ||
                    event.title.toLowerCase().includes(f.toLowerCase())
                  );

                  return (
                    <button
                      key={event.id || i}
                      onClick={() => setSelectedEvent(event)}
                      className="relative flex items-center w-full text-left group"
                      style={{ minHeight: '60px' }}
                    >
                      <div className="w-[110px] flex-shrink-0 pr-4 text-right">
                        <span className="text-[11px] font-mono tracking-wider text-white/50 group-hover:text-white/80 transition-colors">
                          {event.date}
                        </span>
                      </div>

                      <div className="relative z-10 flex-shrink-0" style={{ width: '20px' }}>
                        <div
                          className="w-3 h-3 rounded-full transition-all"
                          style={{
                            background: isSelected ? activeGuardian.accentColor : isGuardianRelevant ? `${activeGuardian.accentColor}88` : 'rgba(255,255,255,0.15)',
                            boxShadow: isSelected ? `0 0 16px ${activeGuardian.accentColor}` : isGuardianRelevant ? `0 0 8px ${activeGuardian.accentGlow}` : 'none',
                            transform: isSelected ? 'scale(1.3)' : 'group-hover:scale(1.2)',
                          }}
                        />
                      </div>

                      <div className="flex-1 pl-4 py-1">
                        <p className="text-sm transition-colors" style={{
                          color: isSelected ? activeGuardian.accentColor : isGuardianRelevant ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
                          fontWeight: isSelected ? 600 : 400,
                        }}>
                          {event.title}
                        </p>
                        <p className="text-[10px] text-white/30 mt-0.5 font-mono tracking-wide">
                          {event.civilization} · {event.region}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {selectedEvent && (
          <div className="w-80 flex-shrink-0 border-l glass-panel" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
            <div className="p-5">
              <p className="text-[10px] tracking-[0.2em] uppercase font-mono mb-2" style={{ color: activeGuardian.accentColor }}>
                {selectedEvent.date}
              </p>
              <h3 className="text-base font-display font-semibold text-white mb-3">
                {selectedEvent.title}
              </h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Civilization</span>
                  <span className="text-white/70">{selectedEvent.civilization}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Region</span>
                  <span className="text-white/70">{selectedEvent.region}</span>
                </div>
              </div>
              <button
                className="w-full py-2.5 rounded-lg text-xs tracking-wider uppercase font-mono transition-all"
                style={{
                  background: `${activeGuardian.accentColor}15`,
                  border: `1px solid ${activeGuardian.accentColor}44`,
                  color: activeGuardian.accentColor,
                }}
              >
                Ask HoloKai about this
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
