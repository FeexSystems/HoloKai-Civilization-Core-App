import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitPullRequest, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useHoloKai } from '@/lib/HoloKaiContext';
import { base44 } from '@/api/base44Client';

const CATEGORIES = [
  'General',
  'Research Chat',
  'Library',
  'Timeline',
  'Interactive Map',
  'Manuscripts',
  'Knowledge Graph',
  'Compare Civilizations',
  'Oral Tradition',
];

const STORAGE_KEY = 'holokai-github-repo-config';

export default function LogUpdateDialog({ open, onClose }) {
  const { activeGuardian } = useHoloKai();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const cfg = JSON.parse(saved);
          if (cfg.repoOwner) setRepoOwner(cfg.repoOwner);
          if (cfg.repoName) setRepoName(cfg.repoName);
        } catch {}
      }
      setResult(null);
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !repoOwner.trim() || !repoName.trim()) {
      setError('Title, description, repo owner, and repo name are all required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ repoOwner: repoOwner.trim(), repoName: repoName.trim() }));
      const res = await base44.functions.invoke('logCoreUpdate', {
        title: title.trim(),
        description: description.trim(),
        category,
        repoOwner: repoOwner.trim(),
        repoName: repoName.trim(),
        guardianName: activeGuardian.name,
      });
      setResult(res.data);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to log update.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-lg glass-panel rounded-2xl shadow-2xl overflow-hidden"
            style={{ borderColor: `${activeGuardian.accentColor}33` }}
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: `${activeGuardian.accentColor}22` }}
            >
              <div className="flex items-center gap-2.5">
                <GitPullRequest className="w-4 h-4" style={{ color: activeGuardian.accentColor }} />
                <h2 className="text-sm font-heading font-semibold tracking-wide text-white/90">
                  Log Core Update
                </h2>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {result ? (
              <div className="px-5 py-10 flex flex-col items-center text-center">
                <CheckCircle2 className="w-12 h-12 mb-4" style={{ color: activeGuardian.accentColor }} />
                <p className="text-sm font-medium text-white/90 mb-1">Pull request opened</p>
                <p className="text-xs text-white/40 mb-5 font-mono">
                  PR #{result.pullRequestNumber} · {result.branch}
                </p>
                <a
                  href={result.pullRequestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: `${activeGuardian.accentColor}1a`, color: activeGuardian.accentColor, border: `1px solid ${activeGuardian.accentColor}44` }}
                >
                  View on GitHub <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={onClose}
                  className="mt-4 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-mono mb-1.5 block">
                    Update Title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Added Nubian dynasty sources to Library"
                    className="w-full bg-black/40 border rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                    onFocus={(e) => (e.target.style.borderColor = activeGuardian.accentColor + '88')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-mono mb-1.5 block">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what changed, what was added, or what was researched..."
                    rows={4}
                    className="w-full bg-black/40 border rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none transition-colors resize-none scrollbar-thin"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                    onFocus={(e) => (e.target.style.borderColor = activeGuardian.accentColor + '88')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <div>
                  <label className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-mono mb-1.5 block">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/40 border rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-holokai-panel">{c}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-mono mb-1.5 block">
                      Repo Owner
                    </label>
                    <input
                      value={repoOwner}
                      onChange={(e) => setRepoOwner(e.target.value)}
                      placeholder="e.g. your-github-user"
                      className="w-full bg-black/40 border rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                      onFocus={(e) => (e.target.style.borderColor = activeGuardian.accentColor + '88')}
                      onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-mono mb-1.5 block">
                      Repo Name
                    </label>
                    <input
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="e.g. holokai-logs"
                      className="w-full bg-black/40 border rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                      onFocus={(e) => (e.target.style.borderColor = activeGuardian.accentColor + '88')}
                      onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400/80 px-1">{error}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-white/30 font-mono">
                    Guardian: <span style={{ color: activeGuardian.accentColor }}>{activeGuardian.name}</span>
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: activeGuardian.accentColor, color: '#0A0A0A' }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Opening PR…
                      </>
                    ) : (
                      <>
                        <GitPullRequest className="w-3.5 h-3.5" />
                        Log Update
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}