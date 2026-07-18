import { NextResponse } from 'next/server'
import { ingestDocument } from '../../../../lib/rag/index.js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/rag/ingest
 * Body: { text: string, metadata?: object }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const text = (body.text || '').trim()
    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const metadata = body.metadata || {}
    const result = await ingestDocument(text, metadata)

    return NextResponse.json({
      ok: true,
      ...result,
      metadata,
    })
  } catch (err) {
    console.error('[RAG ingest]', err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    )
  }
}
