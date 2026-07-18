import { NextResponse } from 'next/server'
import { seedKnowledgeBase } from '../../../../lib/rag/index.js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/rag/seed
 * Body: { clear?: boolean }
 * Seeds curated African civilization knowledge into the local vector store.
 */
export async function POST(request) {
  try {
    let clear = false
    try {
      const body = await request.json()
      clear = Boolean(body?.clear)
    } catch {
      // empty body is fine
    }

    const result = await seedKnowledgeBase({ clear })
    const failed = result.sources.filter((s) => !s.ok)

    return NextResponse.json({
      ok: failed.length === 0,
      message:
        failed.length === 0
          ? `Seeded ${result.totalChunks} ancestral memory chunks`
          : `Seeded with ${failed.length} source error(s)`,
      ...result,
    })
  } catch (err) {
    console.error('[RAG seed]', err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        hint: 'Run: ollama pull nomic-embed-text && ensure Ollama is listening on :11434',
      },
      { status: 503 }
    )
  }
}
