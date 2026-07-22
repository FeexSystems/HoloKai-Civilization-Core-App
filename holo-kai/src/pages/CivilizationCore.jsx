import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/core/Sidebar';
import DockedGuardian from '@/components/core/DockedGuardian';
import ResearchChat from '@/components/core/ResearchChat';
import Library from '@/components/core/Library';
import TimelineExplorer from '@/components/core/TimelineExplorer';
import InteractiveMap from '@/components/core/InteractiveMap';
import ManuscriptViewer from '@/components/core/ManuscriptViewer';
import KnowledgeGraph from '@/components/core/KnowledgeGraph';
import CompareCivilizations from '@/components/core/CompareCivilizations';
import OralTraditionExplorer from '@/components/core/OralTraditionExplorer';
import VanguardPanel from '@/components/core/VanguardPanel';
import SourceDrawer from '@/components/core/SourceDrawer';
import StudioEditor from '@/components/core/StudioEditor';
import LogUpdateDialog from '@/components/core/LogUpdateDialog';
import { GitPullRequest } from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { DEFAULT_GUARDIAN } from '@/lib/guardians';

const PANELS = {
  chat: ResearchChat,
  library: Library,
  timeline: TimelineExplorer,
  map: InteractiveMap,
  manuscripts: ManuscriptViewer,
  'knowledge-graph': KnowledgeGraph,
  compare: CompareCivilizations,
  'oral-tradition': OralTraditionExplorer,
  vanguard: VanguardPanel,
  studio: StudioEditor,
};

export default function CivilizationCore() {
  const { activeGuardian, session, aiState } = useHoloKai();
  const [view, setView] = useState('chat');
  const [sourceToOpen, setSourceToOpen] = useState(null);
  const [showLogUpdate, setShowLogUpdate] = useState(false);
  const [sourceDrawerCitation, setSourceDrawerCitation] = useState(null);

  const handleOpenCitation = (citation) => {
    setSourceDrawerCitation(citation);
  };

  const handleCloseCitation = () => {
    setSourceDrawerCitation(null);
  };

  // Default to the first panel of the active guardian
  useEffect(() => {
    if (session && activeGuardian.panels && !activeGuardian.panels.includes(view)) {
      setView(activeGuardian.panels[0]);
    }
  }, [activeGuardian]);

  const handleNavigate = (panelId) => {
    setView(panelId);
    setSourceToOpen(null);
  };

  const handleSelectSource = (source) => {
    setSourceToOpen(source);
    setView('manuscripts');
  };

  const ActivePanel = PANELS[view] || ResearchChat;

  // Pass props to panels that need them
  const panelProps = view === 'library' ? { onSelectSource: handleSelectSource } : {};

  return (
    <div className="flex h-screen bg-holokai-obsidian overflow-hidden">
      <Sidebar activeView={view} onNavigate={handleNavigate} />

      <main
        className="flex-1 flex flex-col overflow-hidden transition-all duration-500"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 80% 20%, ${activeGuardian.accentColor}06 0%, transparent 60%), #0A0A0A`,
        }}
      >
        {/* Top bar with session context */}
        <div className="px-6 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(200,149,42,0.08)', background: 'rgba(10,10,16,0.6)' }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] tracking-[0.2em] uppercase font-mono text-white/30">JOURNEY</span>
              <span className="text-[10px] font-mono" style={{ color: activeGuardian.accentColor }}>
                {session?.journey || 'African Civilizations'}
              </span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] tracking-[0.2em] uppercase font-mono text-white/30">FOCUS</span>
              <span className="text-[10px] font-mono text-white/60">{session?.topic || activeGuardian.focus[0]}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLogUpdate(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono tracking-[0.1em] uppercase transition-all hover:scale-[1.03]"
              style={{
                background: `${activeGuardian.accentColor}14`,
                color: activeGuardian.accentColor,
                border: `1px solid ${activeGuardian.accentColor}33`,
              }}
            >
              <GitPullRequest className="w-3 h-3" />
              Log Update
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: activeGuardian.accentColor }}
              />
              <span className="text-[9px] tracking-wider uppercase font-mono text-white/30">Connected</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ActivePanel {...panelProps} />
        </div>
      </main>

      <VanguardPanel onOpenCitation={handleOpenCitation} />
      <SourceDrawer open={!!sourceDrawerCitation} onClose={handleCloseCitation} citation={sourceDrawerCitation} />
      <DockedGuardian aiState={aiState} />

      <LogUpdateDialog open={showLogUpdate} onClose={() => setShowLogUpdate(false)} />
    </div>
  );
}