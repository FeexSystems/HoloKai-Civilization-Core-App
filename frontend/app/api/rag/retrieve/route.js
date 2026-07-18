import { NextResponse } from 'next/server'
import { retrieveContext, buildContextPrompt } from '../../../../lib/rag/index.js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/rag/retrieve
 * Body: { query, k?, archetypeId?, empire?, source?, minScore? }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const query = (body.query || '').trim()
    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const contexts = await retrieveContext(query, {
      k: body.k ?? 5,
      archetypeId: body.archetypeId || null,
      empire: body.empire || null,
      source: body.source || null,
      minScore: body.minScore ?? 0.22,
    })

    const prompt = buildContextPrompt(contexts)

    return NextResponse.json({
      query,
      count: contexts.length,
      contexts: contexts.map((c) => ({
        id: c.id,
        content: c.document,
        title: c.metadata?.title || c.metadata?.source || 'Knowledge',
        metadata: c.metadata,
        score: c.score,
        baseScore: c.baseScore,
      })),
      prompt,
    })
  } catch (err) {
    console.error('[RAG retrieve]', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        hint: 'Ensure Ollama is running and nomic-embed-text is pulled. Seed the knowledge base via POST /api/rag/seed.',
      },
      { status: 503 }
    )
  }
}
