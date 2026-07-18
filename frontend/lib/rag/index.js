/**
 * HoloKai RAG — African Civilizations Knowledge Base
 *
 * Default: pure local JSON vector store + Ollama nomic-embed-text (no Docker).
 * Optional: Chroma / Qdrant when configured and reachable.
 *
 * Used by Next.js API routes and seed script.
 *
 * Backends (HOLAKAI_VECTOR_BACKEND):
 *   local   — pure-TS cosine store → frontend/.data/holokai-vectors.json
 *   chroma  — Chroma server (CHROMA_URL)
 *   qdrant  — Qdrant REST (QDRANT_URL)
 *   auto    — chroma → qdrant → local
 */

import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { embedText, embedBatch, checkEmbeddings, EMBED_MODEL } from './embeddings.js'
import { splitText } from './textSplit.js'
import { createLocalVectorStore } from './vectorStore.js'
import { createChromaStore } from './chromaStore.js'
import { createQdrantStore } from './qdrantStore.js'
import { KNOWLEDGE_SOURCES, ARCHETYPE_FILTERS, getSourceById } from './knowledgeCatalog.js'

/** @type {Awaited<ReturnType<typeof resolveStore>> | null} */
let storePromise = null

async function resolveStore() {
  // Default local — pure-TS JSON. Avoid probing optional servers unless asked.
  const prefer = (process.env.HOLAKAI_VECTOR_BACKEND || 'local').toLowerCase()

  if (prefer === 'local') {
    return createLocalVectorStore()
  }

  if (prefer === 'chroma') {
    const chroma = await createChromaStore()
    if (!chroma) throw new Error('Chroma backend requested but unavailable at CHROMA_URL')
    return chroma
  }

  if (prefer === 'qdrant') {
    const qdrant = await createQdrantStore()
    if (!qdrant) throw new Error('Qdrant backend requested but unavailable at QDRANT_URL')
    return qdrant
  }

  // auto: only probe backends that have explicit URLs, else local
  if (process.env.CHROMA_URL) {
    const chroma = await createChromaStore()
    if (chroma) return chroma
  }
  if (process.env.QDRANT_URL) {
    const qdrant = await createQdrantStore()
    if (qdrant) return qdrant
  }
  return createLocalVectorStore()
}

export async function getStore() {
  if (!storePromise) storePromise = resolveStore()
  return storePromise
}

/** Force re-resolve (e.g. after env change in long-lived process) */
export function resetStoreCache() {
  storePromise = null
}

/**
 * Ingest a single document with metadata.
 * @param {string} text
 * @param {Record<string, any>} metadata
 * @param {{ chunkSize?: number, chunkOverlap?: number }} [options]
 */
export async function ingestDocument(text, metadata = {}, options = {}) {
  const store = await getStore()
  const chunks = splitText(text, {
    chunkSize: options.chunkSize ?? 800,
    chunkOverlap: options.chunkOverlap ?? 150,
  })
  if (!chunks.length) return { chunks: 0 }

  const embeddings = await embedBatch(chunks)
  const ids = chunks.map(() => randomUUID())
  const metadatas = chunks.map((chunk, i) => ({
    ...metadata,
    chunkIndex: i,
    chunkCount: chunks.length,
    charCount: chunk.length,
  }))

  await store.add({ ids, documents: chunks, embeddings, metadatas })
  return { chunks: chunks.length, ids }
}

/**
 * Retrieve top-k context chunks for a query.
 * @param {string} query
 * @param {{
 *   k?: number,
 *   archetypeId?: string | null,
 *   empire?: string | null,
 *   source?: string | null,
 *   minScore?: number,
 * }} [options]
 */
export async function retrieveContext(query, options = {}) {
  const {
    k = 5,
    archetypeId = null,
    empire = null,
    source = null,
    minScore = 0.25,
  } = options

  const store = await getStore()
  const queryEmbedding = await embedText(query)

  // Wider pool for archetype re-rank, then slice to k
  // Clamp to store size so Chroma never sees nResults > count
  let poolSize = Math.min(Math.max(k * 4, 12), 40)
  try {
    if (typeof store.count === 'function') {
      const total = await store.count()
      if (!total) return []
      poolSize = Math.min(poolSize, total)
    }
  } catch {
    // count optional — stores without it still accept nResults
  }

  const hardWhere = {}
  if (empire) hardWhere.empire = empire
  if (source) hardWhere.source = source

  const results = await store.query({
    queryEmbedding,
    nResults: poolSize, // intermediate pool; final return is still top-k
    where: Object.keys(hardWhere).length ? hardWhere : null,
  })

  const docs = results.documents?.[0] || []
  const metas = results.metadatas?.[0] || []
  const scores = results.scores?.[0] || (results.distances?.[0] || []).map((d) => 1 - d)
  const ids = results.ids?.[0] || []

  const filter = archetypeId ? ARCHETYPE_FILTERS[archetypeId] : null
  const preferred = new Set(filter?.preferredSources || [])
  const preferredThemes = new Set(filter?.themes || [])

  const ranked = docs.map((document, i) => {
    const metadata = metas[i] || {}
    const base = typeof scores[i] === 'number' ? scores[i] : 0
    let boost = 0

    const src = metadata.source
    if (src && preferred.has(src)) boost += 0.08

    const themes = Array.isArray(metadata.themes)
      ? metadata.themes
      : typeof metadata.themes === 'string'
        ? metadata.themes.split('|')
        : []
    if (themes.some((t) => preferredThemes.has(t))) boost += 0.05

    const arch = Array.isArray(metadata.archetypes)
      ? metadata.archetypes
      : typeof metadata.archetypes === 'string'
        ? metadata.archetypes.split('|')
        : []
    if (archetypeId && arch.includes(archetypeId)) boost += 0.06

    return {
      id: ids[i],
      document,
      metadata,
      score: Math.min(1, base + boost),
      baseScore: base,
    }
  })

  return ranked
    .filter((r) => r.document && r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

/**
 * Seed all curated knowledge files into the vector store.
 * @param {{ knowledgeDir?: string, clear?: boolean }} [options]
 */
export async function seedKnowledgeBase(options = {}) {
  const knowledgeDir =
    options.knowledgeDir ||
    path.join(process.cwd(), 'public', 'knowledge')

  const store = await getStore()
  if (options.clear) {
    await store.clear()
    resetStoreCache()
  }

  const summary = []
  let totalChunks = 0

  for (const source of KNOWLEDGE_SOURCES) {
    const filePath = path.join(knowledgeDir, source.path)
    let text
    try {
      text = await fs.readFile(filePath, 'utf8')
    } catch (err) {
      summary.push({ source: source.id, ok: false, error: `Missing file: ${source.path}` })
      continue
    }

    const metadata = {
      source: source.id,
      title: source.title,
      empire: source.empire,
      region: source.region,
      era: source.era,
      themes: source.themes,
      domains: source.domains,
      archetypes: source.archetypes,
      ...(source.topicPack
        ? {
            topicPackLabel: source.topicPack.label,
            topicPackNodes: source.topicPack.nodes,
            topicPackEpisodes: source.topicPack.episodes,
            topicPackResponses: source.topicPack.responses,
          }
        : {}),
    }

    try {
      const result = await ingestDocument(text, metadata)
      totalChunks += result.chunks
      summary.push({ source: source.id, ok: true, chunks: result.chunks, title: source.title })
    } catch (err) {
      summary.push({
        source: source.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const status = await store.status()
  return {
    totalChunks,
    sources: summary,
    store: status,
    embedModel: EMBED_MODEL,
  }
}

/**
 * Build a system-prompt block from retrieved chunks.
 * @param {Array<{ document: string, metadata?: any, score?: number }>} contexts
 * @param {{ maxChars?: number }} [options]
 */
export function buildContextPrompt(contexts, options = {}) {
  const maxChars = options.maxChars ?? 3500
  if (!contexts?.length) return ''

  const parts = []
  let used = 0
  for (const ctx of contexts) {
    const title = ctx.metadata?.title || ctx.metadata?.source || 'Knowledge'
    const empire = ctx.metadata?.empire ? ` · ${ctx.metadata.empire}` : ''
    const score =
      typeof ctx.score === 'number' ? ` · relevance ${Math.round(ctx.score * 100)}%` : ''
    const header = `[${title}${empire}${score}]`
    const body = (ctx.document || ctx.content || '').trim()
    const block = `${header}\n${body}`
    if (used + block.length > maxChars && parts.length) break
    parts.push(block)
    used += block.length + 8
  }

  return parts.join('\n\n---\n\n')
}

export async function getRagStatus() {
  const embeddings = await checkEmbeddings()
  let storeStatus = null
  let storeError = null
  try {
    const store = await getStore()
    storeStatus = await store.status()
  } catch (err) {
    storeError = err instanceof Error ? err.message : String(err)
  }

  return {
    service: 'HoloKai RAG',
    embeddings,
    store: storeStatus,
    storeError,
    sourcesCatalogued: KNOWLEDGE_SOURCES.length,
    ready: Boolean(embeddings.ok && storeStatus && (storeStatus.count > 0)),
  }
}

export {
  KNOWLEDGE_SOURCES,
  ARCHETYPE_FILTERS,
  getSourceById,
  checkEmbeddings,
  EMBED_MODEL,
}
