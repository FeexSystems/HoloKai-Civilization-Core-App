import React, { useState, useRef, useEffect } from 'react';
import { Send, Quote, Pin, AlertCircle } from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { MOCK_SOURCES } from '@/lib/mockData';
import { groundedAskWithLifecycle } from '@/lib/holokaiApi';

export default function ResearchChat() {
  const { activeGuardian, setAiState } = useHoloKai();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [localPhase, setLocalPhase] = useState('idle');
  const [pinned, setPinned] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Reset docked guardian when leaving chat
  useEffect(() => {
    return () => setAiState('idle');
  }, [setAiState]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', text: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    setLocalPhase('retrieving');
    setAiState('retrieving');

    try {
      const response = await groundedAskWithLifecycle(userMsg.text, {
        domain: activeGuardian?.focus?.[0] || null,
        onPhase: (phase) => {
          setLocalPhase(phase);
          setAiState(phase);
        },
      });

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: response.answer,
          claims: response.claims,
          citations: response.citations,
          insufficient: response.insufficientEvidence,
        },
      ]);
      setLocalPhase('speaking');
      setAiState('speaking');
      setTimeout(() => {
        setLocalPhase('idle');
        setAiState('idle');
      }, 2000);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text:
            err?.message ||
            'Unable to reach the Civilization Core. Ensure the Python backend is running (python main.py).',
          claims: [],
          citations: [],
          insufficient: true,
          error: true,
        },
      ]);
      setLocalPhase('idle');
      setAiState('idle');
    } finally {
      setLoading(false);
    }
  };

  const getSource = (slug) => MOCK_SOURCES.find((s) => s.slug === slug);

  const pinCitation = (citation) => {
    if (!pinned.find((p) => p.sourceSlug === citation.sourceSlug)) {
      setPinned((p) => [...p, citation]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <h2 className="text-lg font-display font-semibold tracking-wide text-white">
          Research Chat
        </h2>
        <p className="text-xs text-white/40 mt-0.5">
          Grounded answers with source-level citations
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden mb-4 gold-glow"
              style={{ border: `1px solid ${activeGuardian.accentColor}44` }}
            >
              <img src={activeGuardian.image} alt={activeGuardian.name} className="w-full h-full object-cover" />
            </div>
            <p className="text-sm text-white/60 italic max-w-md">
              "{activeGuardian.greeting}"
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
            {msg.role === 'user' ? (
              <div className="glass-panel-light rounded-2xl rounded-tr-sm px-4 py-3 max-w-xl">
                <p className="text-sm text-white/90">{msg.text}</p>
              </div>
            ) : (
              <div className="w-full max-w-3xl">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-md overflow-hidden"
                    style={{ border: `1px solid ${activeGuardian.accentColor}44` }}
                  >
                    <img src={activeGuardian.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span
                    className="text-[10px] font-mono tracking-[0.1em] font-semibold"
                    style={{ color: activeGuardian.accentColor }}
                  >
                    {activeGuardian.name}
                  </span>
                </div>

                <div className="glass-panel rounded-2xl rounded-tl-sm p-4">
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {msg.claims && msg.claims.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                      <p className="text-[9px] tracking-[0.2em] uppercase text-white/30 font-mono flex items-center gap-1">
                        <Quote className="w-3 h-3" /> Verified Claims
                      </p>
                      {msg.claims.map((claim, ci) => (
                        <div key={ci} className="text-xs text-white/60 pl-3 border-l-2" style={{ borderColor: activeGuardian.accentColor }}>
                          {claim.text}
                          <span className="ml-2 text-[10px] text-white/30">
                            ({Math.round((claim.confidence || 0) * 100)}% confidence)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-[9px] tracking-[0.2em] uppercase text-white/30 font-mono mb-2">
                        Citations
                      </p>
                      <div className="space-y-2">
                        {msg.citations.map((cit, ci) => {
                          const source = getSource(cit.sourceSlug);
                          return (
                            <div
                              key={ci}
                              className="flex items-center gap-3 p-2 rounded-lg bg-white/3 hover:bg-white/5 transition-colors group"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/70 truncate">{cit.sourceTitle}</p>
                                {source && (
                                  <p className="text-[10px] text-white/30 mt-0.5">
                                    {source.civilization} · {source.era} · {source.type}
                                  </p>
                                )}
                                {cit.passage && !source && (
                                  <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">
                                    {cit.passage}
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] text-white/40 font-mono">
                                {Math.round((cit.confidence || 0) * 100)}%
                              </span>
                              <button
                                onClick={() => pinCitation(cit)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Pin citation"
                              >
                                <Pin className="w-3.5 h-3.5" style={{ color: activeGuardian.accentColor }} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {msg.insufficient && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/80">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {msg.error
                        ? 'Request failed — check backend connectivity.'
                        : 'Insufficient evidence — some claims could not be verified.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md overflow-hidden" style={{ border: `1px solid ${activeGuardian.accentColor}44` }}>
              <img src={activeGuardian.image} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((d) => (
                <div
                  key={d}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: activeGuardian.accentColor, animationDelay: `${d * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono tracking-wider uppercase text-white/30">
              {localPhase}...
            </span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Pinned citations bar */}
      {pinned.length > 0 && (
        <div className="px-6 py-2 border-t" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <Pin className="w-3 h-3" style={{ color: activeGuardian.accentColor }} />
            <span className="text-[9px] tracking-wider uppercase text-white/30 font-mono">
              {pinned.length} pinned
            </span>
            {pinned.map((p, i) => (
              <span key={i} className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded">
                {p.sourceTitle}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t" style={{ borderColor: 'rgba(200,149,42,0.1)' }}>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${activeGuardian.name} about ${activeGuardian.focus[0]}...`}
            className="flex-1 glass-panel rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/30 outline-none focus:border-opacity-50 transition-all"
            style={{ outline: 'none' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 rounded-xl transition-all disabled:opacity-30"
            style={{
              background: `linear-gradient(135deg, ${activeGuardian.accentColor}22, ${activeGuardian.accentColor}11)`,
              border: `1px solid ${activeGuardian.accentColor}44`,
            }}
          >
            <Send className="w-4 h-4" style={{ color: activeGuardian.accentColor }} />
          </button>
        </form>
      </div>
    </div>
  );
}
