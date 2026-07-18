import { NextResponse } from 'next/server'
import { getRagStatus } from '../../../../lib/rag/index.js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const status = await getRagStatus()
    return NextResponse.json(status)
  } catch (err) {
    return NextResponse.json(
      {
        service: 'HoloKai RAG',
        ready: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
