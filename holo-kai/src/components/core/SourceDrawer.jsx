import { useEffect, useState } from 'react'
import { X, ExternalLink, ShieldCheck, FileText } from 'lucide-react'
import { getLibrarySource } from '@/lib/holokaiApi'

export default function SourceDrawer({ open, onClose, citation }) {
  const [source, setSource] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let done = false
    const load = async () => {
      const slug = citation?.source_slug
      if (!open || !slug) {
        setSource(null)
        return
      }
      setLoading(true)
      setError('')
      try {
        const data = await getLibrarySource(slug)
        if (!done) setSource(data)
      } catch (err) {
        if (!done) setError(err.message || 'Unable to load source')
      } finally {
        if (!done) setLoading(false)
      }
    }
    load()
    return () => {
      done = true
    }
  }, [open, citation?.source_slug])

  if (!open) return null

  return (
    <aside
      className="fixed inset-y-0 right-0 z-[120] w-full max-w-xl border-l border-white/10 bg-zinc-950/95 p-4 backdrop-blur-xl"
      role="dialog"
      aria-label="Source details"
      aria-modal="true"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Evidence Record</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-white/10 p-1 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label="Close source drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto pb-10">
        {loading && <p className="text-xs text-zinc-400">Loading source…</p>}
        {error && <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</p>}

        {citation && (
          <section className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-400">
              <FileText className="h-3.5 w-3.5" /> Citation {citation.citation_id}
            </div>
            <p className="text-xs text-zinc-100">{citation.source_title}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-300">{citation.passage}</p>
            <p className="mt-2 text-[11px] text-zinc-500">Evidence type: {citation.evidence_type}</p>
          </section>
        )}

        {source && (
          <section className="rounded-lg border border-white/10 bg-black/30 p-3">
            <h3 className="text-sm font-medium text-zinc-100">{source.title}</h3>
            <p className="mt-1 text-xs text-zinc-400">{(source.authors || []).join(', ') || 'Unknown author'}</p>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <dt className="text-zinc-500">Region</dt>
                <dd className="text-zinc-200">{source.region || '—'}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Era</dt>
                <dd className="text-zinc-200">{source.era || '—'}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Evidence</dt>
                <dd className="text-zinc-200">{source.evidence_type || '—'}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Rights</dt>
                <dd className="text-zinc-200">{source.rights_status || '—'}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                <ShieldCheck className="h-3 w-3" /> {source.editorial_status || 'staged'}
              </span>
              {source.peer_reviewed ? (
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-200">peer reviewed</span>
              ) : (
                <span className="rounded-full border border-zinc-600 px-2 py-1 text-zinc-300">peer review unknown</span>
              )}
            </div>

            {source.canonical_url && (
              <a
                href={source.canonical_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200"
              >
                Open canonical source <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </section>
        )}
      </div>
    </aside>
  )
}
