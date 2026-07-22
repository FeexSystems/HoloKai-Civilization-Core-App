import React, { useState, useMemo } from 'react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { MOCK_KNOWLEDGE_GRAPH, MOCK_GRAPH_EDGES } from '@/lib/mockData';

const TYPE_COLORS = {
  civilization: '#E8B84B',
  person: '#FFD27A',
  concept: '#C8952A',
};

// Compute positions in a circular layout
function useGraphLayout() {
  return useMemo(() => {
    const positions = {};
    const total = MOCK_KNOWLEDGE_GRAPH.length;
    const radius = 220;

    MOCK_KNOWLEDGE_GRAPH.forEach((node, i) => {
      const angle = (i / total) * Math.PI * 2;
      positions[node.id] = {
        x: 300 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
      };
    });

    return positions;
  }, []);
}

export default function KnowledgeGraph() {
  const { activeGuardian } = useHoloKai();
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const positions = useGraphLayout();

  const isConnected = (nodeId) => {
    if (!hovered) return true;
    return MOCK_GRAPH_EDGES.some(
      (e) => (e.from === hovered && e.to === nodeId) || (e.to === hovered && e.from === nodeId)
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <h2 className="text-lg font-display font-semibold tracking-wide text-white">Knowledge Graph</h2>
        <p className="text-xs text-white/40 mt-0.5">Network of civilizations, people, events, and concepts</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Graph canvas */}
        <div className="flex-1 relative overflow-hidden" style={{ background: '#080810' }}>
          <svg viewBox="0 0 600 600" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Edges */}
            {MOCK_GRAPH_EDGES.map((edge, i) => {
              const from = positions[edge.from];
              const to = positions[edge.to];
              if (!from || !to) return null;
              const isHighlight = hovered && (edge.from === hovered || edge.to === hovered);

              return (
                <g key={i}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isHighlight ? activeGuardian.accentColor : 'rgba(255,255,255,0.08)'}
                    strokeWidth={isHighlight ? 1.5 : 0.5}
                    strokeDasharray={isHighlight ? '0' : '3,3'}
                  />
                  {isHighlight && (
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 4}
                      fill={activeGuardian.accentColor}
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="fill-current"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {MOCK_KNOWLEDGE_GRAPH.map((node) => {
              const pos = positions[node.id];
              const color = TYPE_COLORS[node.type] || activeGuardian.accentColor;
              const isHovered = hovered === node.id;
              const isSelected = selected === node.id;
              const dim = hovered && !isHovered && !isConnected(node.id);

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(node.id)}
                  style={{ cursor: 'pointer', opacity: dim ? 0.2 : 1 }}
                  className="transition-opacity"
                >
                  {(isHovered || isSelected) && (
                    <circle cx={pos.x} cy={pos.y} r="22" fill={color} opacity="0.15" />
                  )}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isHovered || isSelected ? 10 : 7}
                    fill={color}
                    opacity={isHovered || isSelected ? 1 : 0.7}
                    stroke="#0A0A0A"
                    strokeWidth="2"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + (node.type === 'civilization' ? 24 : 22)}
                    fill="white"
                    fontSize={isHovered || isSelected ? "10" : "8"}
                    fontFamily="monospace"
                    textAnchor="middle"
                    opacity={isHovered || isSelected ? 0.9 : 0.5}
                    className="fill-current"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 glass-panel rounded-lg p-3">
            <p className="text-[8px] tracking-[0.2em] uppercase font-mono text-white/30 mb-2">Legend</p>
            <div className="space-y-1">
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] text-white/50 capitalize font-mono">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 flex-shrink-0 border-l glass-panel p-5" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
            {(() => {
              const node = MOCK_KNOWLEDGE_GRAPH.find((n) => n.id === selected);
              const connections = MOCK_GRAPH_EDGES.filter((e) => e.from === selected || e.to === selected);
              return (
                <>
                  <p className="text-[10px] tracking-[0.2em] uppercase font-mono mb-1" style={{ color: TYPE_COLORS[node.type] }}>
                    {node.type}
                  </p>
                  <h3 className="text-base font-display font-semibold text-white mb-3">{node.label}</h3>
                  <p className="text-[9px] tracking-[0.2em] uppercase font-mono text-white/30 mb-2">
                    Connections ({connections.length})
                  </p>
                  <div className="space-y-1.5">
                    {connections.map((c, i) => {
                      const connectedId = c.from === selected ? c.to : c.from;
                      const connectedNode = MOCK_KNOWLEDGE_GRAPH.find((n) => n.id === connectedId);
                      return (
                        <button
                          key={i}
                          onClick={() => setSelected(connectedId)}
                          className="block w-full text-left text-xs text-white/60 hover:text-white/90 transition-colors"
                        >
                          <span className="text-white/30 mr-1">→</span>
                          {connectedNode?.label}
                          <span className="block text-[9px] text-white/30 ml-3 font-mono">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}