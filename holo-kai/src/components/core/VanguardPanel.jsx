import { useState } from 'react'
import { Loader2, PanelRightOpen, Send, X } from 'lucide-react'
import ClaimCitations from './ClaimCitations'
import { createGroundedAskJob, getJob, groundedAsk } from '@/lib/holokaiApi'

export default function VanguardPanel({ onOpenCitation }) {
  const [open, setOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q || loading) return

    setLoading(true)
    setError('')
    try {
      const job = await createGroundedAskJob(q, {
        requireCitations: true,
        preferHosted: true,
        useWeb: true,
      })

      let done = null
      for (let i = 0; i < 60; i += 1) {
        const status = await getJob(job.job_id)
        if (status.status === 'succeeded') {
          done = status.result?.output || null
          break
        }
        if (status.status === 'failed') {
          throw new Error(status.result?.error || 'Grounded synthesis job failed')
        }
        await new Promise((r) => setTimeout(r, 1000))
      }

      if (!done) {
        throw new Error('Grounded synthesis job timed out')
      }

      setResult(done)
    } catch (jobErr) {
      try {
        const res = await groundedAsk(q, {
          requireCitations: true,
          preferHosted: true,
          useWeb: true,
        })
        setResult(res)
      } catch (err) {
        setError(err.message || jobErr.message || 'Unable to retrieve grounded answer')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[110] inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-black/70 px-4 py-2 text-xs text-amber-200 backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        {open ? <X className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
        Vanguard
      </button>

      {open && (
        <aside
          className="fixed inset-y-0 right-0 z-[105] w-full max-w-md border-l border-white/10 bg-black/75 p-4 backdrop-blur-xl"
          aria-label="Vanguard assistant"
        >
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-zinc-100">Vanguard Research Assistant</h2>
            <p className="mt-1 text-xs text-zinc-400">Claim-level grounded answers with traceable citations</p>
          </div>

          <form onSubmit={submit} className="space-y-2">
            <label htmlFor="vanguard-query" className="sr-only">Ask a research question</label>
            <textarea
              id="vanguard-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about a civilization, source, era, or contested claim…"
              className="h-24 w-full rounded-lg border border-white/10 bg-zinc-950/70 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Grounded answer
            </button>
          </form>

          {error && <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">{error}</p>}

          {result && (
            <div className="mt-4 h-[calc(100%-220px)] overflow-y-auto pr-1">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs leading-relaxed text-zinc-100">{result.answer}</p>
                <p className="mt-2 text-[11px] text-zinc-500">
                  {result.gateway?.provider ? `${result.gateway.provider}` : 'gateway unknown'}
                  {result.gateway?.model ? ` · ${result.gateway.model}` : ''}
                </p>
              </div>

              <ClaimCitations grounded={result.grounded} onOpenCitation={onOpenCitation} />
            </div>
          )}
        </aside>
      )}
    </>
  )
}
