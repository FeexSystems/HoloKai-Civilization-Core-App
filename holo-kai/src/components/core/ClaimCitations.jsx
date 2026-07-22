import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

function StatusBadge({ status }) {
  if (status === 'supported') {
    return <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">supported</span>
  }
  return <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">insufficient</span>
}

export default function ClaimCitations({ grounded, onOpenCitation }) {
  const [open, setOpen] = useState({})

  const claims = grounded?.claims || []
  if (!claims.length) return null

  return (
    <section className="mt-4 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Claim-level citations</h3>
      {claims.map((claim) => {
        const expanded = Boolean(open[claim.claim_id])
        return (
          <article key={claim.claim_id} className="rounded-lg border border-white/10 bg-black/30">
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [claim.claim_id]: !prev[claim.claim_id] }))}
              className="flex w-full items-start justify-between gap-2 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-expanded={expanded}
            >
              <div>
                <p className="text-xs leading-relaxed text-zinc-100">{claim.text}</p>
                <div className="mt-2">
                  <StatusBadge status={claim.evidence_status} />
                </div>
              </div>
              {expanded ? <ChevronDown className="mt-0.5 h-4 w-4 text-zinc-400" /> : <ChevronRight className="mt-0.5 h-4 w-4 text-zinc-400" />}
            </button>

            {expanded && (
              <div className="space-y-2 border-t border-white/10 px-3 py-2">
                {(claim.citations || []).length === 0 ? (
                  <p className="text-[11px] text-amber-200">No reviewed citation attached to this claim yet.</p>
                ) : (
                  claim.citations.map((citation) => (
                    <button
                      type="button"
                      key={citation.citation_id}
                      onClick={() => onOpenCitation?.(citation)}
                      className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-left hover:border-amber-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      <p className="text-[11px] font-medium text-zinc-100">{citation.source_title}</p>
                      <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-zinc-300">{citation.passage}</p>
                      <p className="mt-1 text-[10px] text-zinc-500">{citation.citation_id} · {citation.evidence_type}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}
