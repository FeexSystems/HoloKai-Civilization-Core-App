/**
 * Optional Qdrant backend for HoloKai RAG (REST, no SDK required).
 * Same store contract as local-json / chroma so index.js can swap freely.
 *
 * Requires:
 *   docker compose --profile qdrant-ollama up -d
 *   HOLAKAI_VECTOR_BACKEND=qdrant
 *   QDRANT_URL=http://localhost:6333
 */

const QDRANT_URL = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/$/, '')
const COLLECTION = process.env.HOLAKAI_COLLECTION || 'holokai-knowledge'
const VECTOR_SIZE_DEFAULT = Number(process.env.HOLAKAI_EMBED_DIMS || 768) // nomic-embed-text

/**
 * @returns {Promise<null | {
 *   backend: string,
 *   add: Function,
 *   query: Function,
 *   count: Function,
 *   clear: Function,
 *   status: Function,
 * }>}
 */
export async function createQdrantStore() {
  if (process.env.HOLAKAI_VECTOR_BACKEND === 'local') {
    return null
  }
  const prefer = (process.env.HOLAKAI_VECTOR_BACKEND || 'local').toLowerCase()
  // In auto mode only probe when QDRANT_URL is explicitly configured
  if (prefer === 'auto' && !process.env.QDRANT_URL) {
    return null
  }
  if (prefer !== 'qdrant' && prefer !== 'auto') {
    return null
  }

  try {
    const health = await fetch(`${QDRANT_URL}/readyz`, { method: 'GET' })
    if (!health.ok) {
      // older images expose / only
      const root = await fetch(`${QDRANT_URL}/`, { method: 'GET' })
      if (!root.ok) return null
    }
  } catch (err) {
    console.warn('[HoloKai RAG] Qdrant unreachable:', err?.message || err)
    return null
  }

  await ensureCollection(VECTOR_SIZE_DEFAULT)

  return {
    backend: 'qdrant',

    async add({ ids, documents, embeddings, metadatas }) {
      if (!documents?.length) return { added: 0 }

      // Ensure collection vector size matches first embedding
      const dims = embeddings?.[0]?.length || VECTOR_SIZE_DEFAULT
      await ensureCollection(dims)

      const points = documents.map((document, i) => ({
        id: toPointId(ids?.[i]),
        vector: embeddings[i],
        payload: {
          document,
          ...flattenPayload(metadatas?.[i] || {}),
        },
      }))

      // Qdrant batch limit is large; chunk for safety
      const BATCH = 64
      for (let offset = 0; offset < points.length; offset += BATCH) {
        const slice = points.slice(offset, offset + BATCH)
        const res = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}/points?wait=true`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: slice }),
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`Qdrant upsert failed (${res.status}): ${body}`)
        }
      }

      return { added: documents.length }
    },

    async query({ queryEmbedding, nResults = 5, where = null }) {
      const total = await countPoints()
      if (!total) {
        return emptyResult()
      }

      const k = Math.max(1, Math.min(nResults ?? 5, total))
      const filter = toQdrantFilter(where)

      const res = await fetch(
        `${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}/points/search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vector: queryEmbedding,
            limit: k,
            with_payload: true,
            with_vector: false,
            ...(filter ? { filter } : {}),
          }),
        }
      )

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Qdrant search failed (${res.status}): ${body}`)
      }

      const data = await res.json()
      const hits = data.result || []

      return {
        ids: [hits.map((h) => String(h.id))],
        documents: [hits.map((h) => h.payload?.document || '')],
        metadatas: [hits.map((h) => expandPayload(h.payload || {}))],
        distances: [hits.map((h) => (typeof h.score === 'number' ? 1 - h.score : 1))],
        // Cosine similarity when collection distance is Cosine
        scores: [hits.map((h) => (typeof h.score === 'number' ? h.score : 0))],
      }
    },

    async count() {
      return countPoints()
    },

    async clear() {
      // Drop + recreate with last known size
      const info = await collectionInfo()
      const size =
        info?.result?.config?.params?.vectors?.size ||
        VECTOR_SIZE_DEFAULT
      await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}`, {
        method: 'DELETE',
      })
      await ensureCollection(size, true)
    },

    async status() {
      const info = await collectionInfo()
      const count = await countPoints()
      const size = info?.result?.config?.params?.vectors?.size || null
      return {
        backend: 'qdrant',
        collection: COLLECTION,
        url: QDRANT_URL,
        count,
        dimensions: size,
      }
    },
  }
}

function emptyResult() {
  return {
    ids: [[]],
    documents: [[]],
    metadatas: [[]],
    distances: [[]],
    scores: [[]],
  }
}

/** Qdrant point ids: UUID string or unsigned int */
function toPointId(id) {
  if (id == null) return cryptoRandomUuid()
  const s = String(id)
  // Prefer UUID-shaped ids as strings; otherwise hash to uint
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return s
  }
  if (/^\d+$/.test(s)) return Number(s)
  return cryptoRandomUuid()
}

function cryptoRandomUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Node < 19 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function collectionInfo() {
  const res = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}`)
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Qdrant collection info failed (${res.status}): ${body}`)
  }
  return res.json()
}

async function ensureCollection(vectorSize, forceCreate = false) {
  const info = forceCreate ? null : await collectionInfo()
  if (info?.result) return

  const res = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
    }),
  })

  // 200 ok, 409 already exists
  if (!res.ok && res.status !== 409) {
    const body = await res.text().catch(() => '')
    throw new Error(`Qdrant create collection failed (${res.status}): ${body}`)
  }
}

async function countPoints() {
  const res = await fetch(
    `${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}/points/count`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exact: true }),
    }
  )
  if (!res.ok) {
    // Collection may not exist yet
    if (res.status === 404) return 0
    const body = await res.text().catch(() => '')
    throw new Error(`Qdrant count failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return data?.result?.count ?? 0
}

function flattenPayload(meta = {}) {
  const out = {}
  for (const [k, v] of Object.entries(meta)) {
    if (v == null) continue
    if (Array.isArray(v)) {
      // Keep arrays in payload (Qdrant supports them) AND pipe form for filters
      out[k] = v
      out[`${k}_csv`] = v.map(String).join('|')
    } else if (typeof v === 'object') {
      out[k] = JSON.stringify(v)
    } else {
      out[k] = v
    }
  }
  return out
}

function expandPayload(payload = {}) {
  const { document, ...rest } = payload
  const out = { ...rest }
  for (const key of ['themes', 'domains', 'archetypes']) {
    if (Array.isArray(out[key])) continue
    if (typeof out[`${key}_csv`] === 'string') {
      out[key] = out[`${key}_csv`].split('|').filter(Boolean)
    } else if (typeof out[key] === 'string' && out[key].includes('|')) {
      out[key] = out[key].split('|').filter(Boolean)
    }
  }
  return out
}

/**
 * Convert simple equality where → Qdrant filter.
 * Advanced archetype re-rank still happens in index.js.
 */
function toQdrantFilter(where) {
  if (!where || !Object.keys(where).length) return null

  const must = []
  for (const [k, v] of Object.entries(where)) {
    if (k.startsWith('$')) continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      must.push({ key: k, match: { value: v } })
    } else if (v && typeof v === 'object' && Array.isArray(v.$in)) {
      must.push({ key: k, match: { any: v.$in } })
    }
  }

  if (!must.length) return null
  return { must }
}
