import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, X, Loader2 } from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { searchLibrary } from '@/lib/holokaiApi';
import { MOCK_MAP_LOCATIONS } from '@/lib/mockData';

const REGION_LAYERS = [
  { id: 'all', label: 'All Sites' },
  { id: 'Nile Valley', label: 'Nile Valley' },
  { id: 'Nubia', label: 'Nubia' },
  { id: 'West Africa', label: 'West Africa' },
  { id: 'East Africa', label: 'East Africa' },
  { id: 'Southern Africa', label: 'Southern Africa' },
  { id: 'Horn of Africa', label: 'Horn of Africa' },
];

export default function InteractiveMap() {
  const { activeGuardian } = useHoloKai();
  const [selected, setSelected] = useState(null);
  const [activeLayer, setActiveLayer] = useState('all');
  const [apiLocations, setApiLocations] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadFromApi = useCallback(async () => {
    setLoading(true);
    try {
      const region = activeLayer !== 'all' ? activeLayer : undefined;
      const data = await searchLibrary({ region, limit: 100 });
      if (data?.items?.length) {
        const mapped = data.items.map((s, i) => {
          const regionCoords = MOCK_MAP_LOCATIONS.find((m) => m.region === s.region);
          return {
            id: `api-${s.slug || i}`,
            name: s.title,
            lat: s.lat ?? regionCoords?.lat ?? null,
            lng: s.lng ?? regionCoords?.lng ?? null,
            civilization: s.civilization || '',
            era: s.era || 'Unknown',
            description: s.summary || '',
            region: s.region || '',
          };
        }).filter((s) => s.lat != null && s.lng != null);
        setApiLocations(mapped.length > 0 ? mapped : null);
      } else {
        setApiLocations(null);
      }
    } catch {
      setApiLocations(null);
    } finally {
      setLoading(false);
    }
  }, [activeLayer]);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  const locations = useMemo(() => {
    if (apiLocations) return apiLocations;
    if (activeLayer === 'all') return MOCK_MAP_LOCATIONS;
    return MOCK_MAP_LOCATIONS.filter((loc) => loc.region === activeLayer);
  }, [apiLocations, activeLayer]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <div>
          <h2 className="text-lg font-display font-semibold tracking-wide text-white">Interactive Map</h2>
          <p className="text-xs text-white/40 mt-0.5">African civilizations and diaspora corridors</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: activeGuardian.accentColor }} />}
          <Layers className="w-4 h-4 text-white/40" />
          <div className="flex gap-1">
            {REGION_LAYERS.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveLayer(l.id)}
                className="px-2.5 py-1.5 rounded-lg text-[9px] tracking-wider uppercase font-mono transition-all whitespace-nowrap"
                style={{
                  background: activeLayer === l.id ? `${activeGuardian.accentColor}15` : 'transparent',
                  border: `1px solid ${activeLayer === l.id ? activeGuardian.accentColor + '44' : 'rgba(255,255,255,0.08)'}`,
                  color: activeLayer === l.id ? activeGuardian.accentColor : 'rgba(255,255,255,0.4)',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-0" style={{ background: '#0A0A0A' }}>
          <MapContainer
            center={[5, 20]}
            zoom={3}
            minZoom={2}
            style={{ width: '100%', height: '100%', background: '#0A0A0A' }}
            className="holokai-map"
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution=""
            />

            {locations.map((loc) => {
              const isGuardianRelevant = activeGuardian.focus.some((f) =>
                (loc.civilization || '').toLowerCase().includes(f.toLowerCase())
              );
              return (
                <CircleMarker
                  key={loc.id}
                  center={[loc.lat, loc.lng]}
                  radius={isGuardianRelevant ? 8 : 5}
                  pathOptions={{
                    color: activeGuardian.accentColor,
                    fillColor: activeGuardian.accentColor,
                    fillOpacity: isGuardianRelevant ? 0.7 : 0.3,
                    weight: 1,
                  }}
                  eventHandlers={{ click: () => setSelected(loc) }}
                >
                  <Popup className="holokai-popup">
                    <div style={{ color: 'white' }}>
                      <strong>{loc.name}</strong>
                      <br />
                      <small>{loc.era}</small>
                      <br />
                      <small>{loc.description}</small>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {selected && (
          <div className="absolute top-4 left-4 z-[1000] glass-panel rounded-xl p-4 w-72 pointer-events-auto">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-display font-semibold text-white">{selected.name}</h3>
              <button onClick={() => setSelected(null)}>
                <X className="w-4 h-4 text-white/40 hover:text-white/80" />
              </button>
            </div>
            <p className="text-xs text-white/50 mb-3">{selected.description}</p>
            <div className="flex justify-between text-[10px] font-mono mb-3">
              <span className="text-white/30">ERA</span>
              <span style={{ color: activeGuardian.accentColor }}>{selected.era}</span>
            </div>
            <button
              className="w-full py-2 rounded-lg text-[10px] tracking-wider uppercase font-mono transition-all"
              style={{
                background: `${activeGuardian.accentColor}15`,
                border: `1px solid ${activeGuardian.accentColor}44`,
                color: activeGuardian.accentColor,
              }}
            >
              Open in Research Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
