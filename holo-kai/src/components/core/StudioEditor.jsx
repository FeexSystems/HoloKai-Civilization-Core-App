import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  PlayCircle,
  RefreshCcw,
  Upload,
  XCircle,
} from 'lucide-react'
import {
  createImportRisJob,
  listJobs,
  storageStatus,
  studioQueue,
  studioReview,
} from '@/lib/holokaiApi'

const DEFAULT_RIS_PATH = 'C:/Users/ENGR BILLI/Downloads/My Library - Jul 20, 2026.ris'

function JobStatusBadge({ status }) {
  const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]'
  if (status === 'succeeded') {
    return <span className={`${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-200`}>succeeded</span>
  }
  if (status === 'failed') {
    return <span className={`${base} border-red-500/30 bg-red-500/10 text-red-200`}>failed</span>
  }
  if (status === 'running') {
    return <span className={`${base} border-sky-500/30 bg-sky-500/10 text-sky-200`}>running</span>
  }
  return <span className={`${base} border-amber-500/30 bg-amber-500/10 text-amber-200`}>{status || 'queued'}</span>
}

function summarizeJob(job) {
  const output = job?.result?.output
  if (!output) return null

  if (job.job_type === 'ris_import') {
    const up = output.upsert || {}
    return `RIS ${output.records_deduped ?? '?'} records · inserted ${up.inserted ?? 0} · updated ${up.updated ?? 0}`
  }

  if (job.job_type === 'grounded_synthesis') {
    const count = output?.grounded?.supported_claim_count
    return `Grounded synthesis · supported claims ${count ?? 0}`
  }

  return 'Completed'
}

export default function StudioEditor() {
  const [items, setItems] = useState([])
  const [jobs, setJobs] = useState([])
  const [storage, setStorage] = useState(null)

  const [error, setError] = useState('')
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [loadingStorage, setLoadingStorage] = useState(false)
  const [submittingImport, setSubmittingImport] = useState(false)

  const [importPath, setImportPath] = useState(DEFAULT_RIS_PATH)
  const [verifyDoi, setVerifyDoi] = useState(true)
  const [lastJobId, setLastJobId] = useState('')

  const [autoPoll, setAutoPoll] = useState(true)

  const runningJobs = useMemo(
    () => jobs.filter((j) => ['queued', 'running'].includes(String(j.status || '').toLowerCase())).length,
    [jobs]
  )

  const refreshQueue = async () => {
    setLoadingQueue(true)
    setError('')
    try {
      const data = await studioQueue({ limit: 100, offset: 0 })
      setItems(data.items || [])
    } catch (err) {
      setError(err.message || 'Unable to load editorial queue')
    } finally {
      setLoadingQueue(false)
    }
  }

  const refreshJobs = async () => {
    setLoadingJobs(true)
    setError('')
    try {
      const data = await listJobs({ limit: 80, offset: 0 })
      setJobs(data.items || [])
    } catch (err) {
      setError(err.message || 'Unable to load jobs')
    } finally {
      setLoadingJobs(false)
    }
  }

  const refreshStorage = async () => {
    setLoadingStorage(true)
    try {
      const data = await storageStatus()
      setStorage(data)
    } catch (err) {
      setError(err.message || 'Unable to load storage status')
    } finally {
      setLoadingStorage(false)
    }
  }

  const refreshAll = async () => {
    await Promise.all([refreshQueue(), refreshJobs(), refreshStorage()])
  }

  const review = async (slug, decision) => {
    try {
      await studioReview({ slug, decision, notes: `Set by studio quick action: ${decision}` }, 'editor')
      await refreshQueue()
    } catch (err) {
      setError(err.message || 'Review update failed')
    }
  }

  const submitImport = async (e) => {
    e.preventDefault()
    const path = importPath.trim()
    if (!path || submittingImport) return

    setSubmittingImport(true)
    setError('')
    try {
      const job = await createImportRisJob(path, { verifyDoi, role: 'editor' })
      setLastJobId(String(job.job_id || ''))
      await refreshJobs()
    } catch (err) {
      setError(err.message || 'Failed to queue RIS import')
    } finally {
      setSubmittingImport(false)
    }
  }

  useEffect(() => {
    refreshAll()
  }, [])

  useEffect(() => {
    if (!autoPoll) return undefined
    if (runningJobs <= 0) return undefined

    const id = setInterval(() => {
      refreshJobs()
    }, 2500)
    return () => clearInterval(id)
  }, [autoPoll, runningJobs])

  return (
    <div className="h-full overflow-y-auto px-4 py-6 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Editorial Studio</h1>
            <p className="mt-1 text-sm text-zinc-400">Review staged records and run tracked background ingestion jobs</p>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:border-white/20"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {error && <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</p>}

        <section className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <Database className="h-4 w-4" />
            Storage backend: <span className="font-medium text-zinc-100">{storage?.backend || 'unknown'}</span>
            {loadingStorage && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
          </div>
          {storage?.error && <p className="mt-1 text-[11px] text-zinc-500">{storage.error}</p>}
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">Queue RIS import job</h2>
          <p className="mt-1 text-xs text-zinc-400">Imports bibliography into candidate-source staging (not public canon text).</p>

          <form onSubmit={submitImport} className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block">
              <span className="mb-1 block text-[11px] text-zinc-500">RIS file path</span>
              <input
                value={importPath}
                onChange={(e) => setImportPath(e.target.value)}
                placeholder="C:/path/to/file.ris"
                className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              />
            </label>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={verifyDoi}
                  onChange={(e) => setVerifyDoi(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                />
                Verify DOI
              </label>
              <button
                type="submit"
                disabled={submittingImport || !importPath.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black disabled:opacity-60"
              >
                {submittingImport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Queue import
              </button>
            </div>
          </form>

          {lastJobId && (
            <p className="mt-2 text-xs text-zinc-400">
              Last queued job: <span className="font-mono text-zinc-200">{lastJobId}</span>
            </p>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-100">Background jobs</h2>
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoPoll}
                  onChange={(e) => setAutoPoll(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                />
                Auto-poll
              </label>
              <span>Running: {runningJobs}</span>
              <button
                type="button"
                onClick={refreshJobs}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 hover:border-white/20"
              >
                {loadingJobs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                Refresh jobs
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {jobs.length === 0 && !loadingJobs && (
              <p className="text-sm text-zinc-500">No jobs found.</p>
            )}
            {jobs.map((job) => {
              const summary = summarizeJob(job)
              return (
                <article key={`${job.backend || 'x'}-${job.id}`} className="rounded-md border border-white/10 bg-black/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-100">
                        {job.job_type || 'job'} · <span className="font-mono">{job.id}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        backend: {job.backend || 'unknown'} · updated: {job.updated_at || '—'}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>

                  {summary && <p className="mt-2 text-xs text-zinc-300">{summary}</p>}
                  {job.result?.error && (
                    <p className="mt-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
                      {job.result.error}
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-100">Editorial queue</h2>
          <div className="space-y-2">
            {loadingQueue && <p className="text-sm text-zinc-400">Loading queue…</p>}

            {!loadingQueue && items.length === 0 && (
              <p className="text-sm text-zinc-500">No records in queue.</p>
            )}

            {items.map((item) => (
              <article key={item.slug} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-100">{item.title}</h3>
                    <p className="text-xs text-zinc-400">
                      {item.slug} · {item.editorial_status || 'staged'} · rights: {item.rights_status || 'unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => review(item.slug, 'approved')}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => review(item.slug, 'needs_changes')}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200"
                    >
                      <Clock3 className="h-3.5 w-3.5" /> Needs changes
                    </button>
                    <button
                      type="button"
                      onClick={() => review(item.slug, 'rejected')}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-200"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
