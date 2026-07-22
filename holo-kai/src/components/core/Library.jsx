import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, FileText, BookOpen, Scroll, Volume2, Loader2 } from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { searchLibrary, libraryFacets } from '@/lib/holokaiApi';
import { MOCK_SOURCES, CIVILIZATIONS } from '@/lib/mockData';

const TYPE_ICONS = {
  Manuscript: FileText,
  Article: BookOpen,
  'Oral Tradition': Volume2,
  Scroll: Scroll,
};

const ERAS = ['3500 BCE – 1000 BCE', '1000 BCE – 500 CE', '500 CE – 1000 CE', '1000 CE – 1500 CE', '1500 CE – 1900 CE', '1900 CE – present'];
const REGIONS = ['Nile Valley', 'Nubia', 'West Africa', 'East Africa', 'Southern Africa', 'Horn of Africa', 'Central Africa'];

export default function Library({ onSelectSource }) {
  const { activeGuardian } = useHoloKai();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ civilization: '', type: '', era: '', region: '' });
  const [apiResults, setApiResults] = useState(null);
  const [facets, setFacets] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const debounceRef = useRef(null);

  const loadFromApi = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const [searchData, facetData] = await Promise.all([
        searchLibrary({
          q: search || undefined,
          civilization: filters.civilization || undefined,
          type: filters.type || undefined,
          era: filters.era || undefined,
          region: filters.region || undefined,
          limit: 50,
        }),
        libraryFacets(),
      ]);
      setApiResults(searchData);
      setFacets(facetData);
    } catch (err) {
      setApiError(err.message);
      setApiResults(null);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(loadFromApi, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [loadFromApi]);

  const sources = useMemo(() => {
    if (apiResults?.items?.length) return apiResults.items;
    return MOCK_SOURCES.filter((s) => {
      const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.summary.toLowerCase().includes(search.toLowerCase());
      const matchCiv = !filters.civilization || s.civilization === filters.civilization;
      const matchType = !filters.type || s.type === filters.type;
      const matchEra = !filters.era || (s.era && s.era.toLowerCase().includes(filters.era.toLowerCase().split('–')[0].trim()));
      const matchRegion = !filters.region || s.region === filters.region;
      return matchSearch && matchCiv && matchType && matchEra && matchRegion;
    });
  }, [apiResults, search, filters]);

  const types = facets?.types || [...new Set(MOCK_SOURCES.map((s) => s.type))];
  const civilizations = facets?.civilizations || CIVILIZATIONS;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <h2 className="text-lg font-display font-semibold tracking-wide text-white">Library</h2>
        <p className="text-xs text-white/40 mt-0.5">Faceted source discovery</p>
      </div>

      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sources..."
              className="w-full glass-panel-light rounded-lg pl-10 pr-4 py-2.5 text-sm text-white/90 placeholder-white/30"
            />
          </div>
          <select value={filters.civilization} onChange={(e) => setFilters({ ...filters, civilization: e.target.value })} className="glass-panel-light rounded-lg px-4 py-2.5 text-sm text-white/70">
            <option value="">All Civilizations</option>
            {civilizations.map((c) => <option key={c} value={c} className="bg-holokai-panel">{c}</option>)}
          </select>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="glass-panel-light rounded-lg px-4 py-2.5 text-sm text-white/70">
            <option value="">All Types</option>
            {types.map((t) => <option key={t} value={t} className="bg-holokai-panel">{t}</option>)}
          </select>
          <select value={filters.era} onChange={(e) => setFilters({ ...filters, era: e.target.value })} className="glass-panel-light rounded-lg px-4 py-2.5 text-sm text-white/70">
            <option value="">All Eras</option>
            {ERAS.map((era) => <option key={era} value={era} className="bg-holokai-panel">{era}</option>)}
          </select>
          <select value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })} className="glass-panel-light rounded-lg px-4 py-2.5 text-sm text-white/70">
            <option value="">All Regions</option>
            {REGIONS.map((r) => <option key={r} value={r} className="bg-holokai-panel">{r}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: activeGuardian.accentColor }} />
          </div>
        )}

        {!loading && (
          <>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-mono mb-4">
              {sources.length} Sources{apiError ? ' (cached)' : ''}
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {sources.map((source) => {
                const Icon = TYPE_ICONS[source.type] || FileText;
                return (
                  <button
                    key={source.slug || source.id}
                    onClick={() => onSelectSource?.(source)}
                    className="glass-panel-light rounded-xl p-4 text-left hover:bg-white/8 transition-all group"
                    style={{ borderLeft: `2px solid ${activeGuardian.accentColor}44` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${activeGuardian.accentColor}11` }}>
                        <Icon className="w-4 h-4" style={{ color: activeGuardian.accentColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white/90 group-hover:text-white transition-colors line-clamp-2">{source.title}</h3>
                        <p className="text-xs text-white/40 mt-1 line-clamp-2">{source.summary}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[9px] tracking-wider uppercase font-mono px-1.5 py-0.5 rounded" style={{ background: `${activeGuardian.accentColor}15`, color: activeGuardian.accentColor }}>
                            {source.civilization}
                          </span>
                          <span className="text-[9px] text-white/30 font-mono">{source.era}</span>
                          <span className="text-[9px] text-white/30 font-mono">{source.type}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-white/30 font-mono">CONF</p>
                        <p className="text-sm font-mono font-semibold" style={{ color: activeGuardian.accentColor }}>
                          {Math.round((source.confidence || 0.5) * 100)}%
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {sources.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-white/30">
                <Search className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm">No sources match your filters</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
