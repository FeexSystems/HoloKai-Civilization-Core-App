/**
 * Optional Chroma HTTP backend for HoloKai RAG (no chromadb npm package).
 *
 * Why REST? The official `chromadb` JS client pulls
 * `https://unpkg.com/chromadb-default-embed@…` which Next/webpack cannot bundle
 * (UnhandledSchemeError) and takes down the entire frontend including /api/rag.
 *
 * Requires a running Chroma server:
 *   docker compose --profile chroma up -d
 *   HOLAKAI_VECTOR_BACKEND=chroma
 *   CHROMA_URL=http://localhost:8001
 */

const CHROMA_URL = (process.env.CHROMA_URL || 'http://localhost:8001').replace(/\/$/, '')
const COLLECTION = process.env.HOLAKAI_COLLECTION || 'holokai-knowledge'

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
export async function createChromaStore() {
  if (process.env.HOLAKAI_VECTOR_BACKEND === 'local') {
    return null
  }
  // Only probe Chroma when explicitly requested or auto + CHROMA_URL set
  const prefer = (process.env.HOLAKAI_VECTOR_BACKEND || 'local').toLowerCase()
  if (prefer === 'auto' && !process.env.CHROMA_URL) {
    return null
  }
  if (prefer !== 'chroma' && prefer !== 'auto') {
    return null
  }

  try {
    const hb = await fetch(`${CHROMA_URL}/api/v1/heartbeat`, { method: 'GET' })
    if (!hb.ok) {
      // Some images expose /api/v2/heartbeat
      const hb2 = await fetch(`${CHROMA_URL}/api/v2/heartbeat`, { method: 'GET' })
      if (!hb2.ok) return null
    }
  } catch (err) {
    console.warn('[HoloKai RAG] Chroma unreachable:', err?.message || err)
    return null
  }

  let collectionId = null

  async function ensureCollection() {
    if (collectionId) return collectionId

    // Try get-or-create by name (v1)
    const createRes = await fetch(`${CHROMA_URL}/api/v1/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: COLLECTION,
        metadata: { 'hnsw:space': 'cosine', project: 'holokai' },
        get_or_create: true,
      }),
    })

    if (createRes.ok) {
      const data = await createRes.json()
      collectionId = data.id || data.uuid || data.name || COLLECTION
      return collectionId
    }

    // Fallback: list and find
    const listRes = await fetch(`${CHROMA_URL}/api/v1/collections`)
    if (listRes.ok) {
      const list = await listRes.json()
      const found = (Array.isArray(list) ? list : []).find(
        (c) => c.name === COLLECTION || c.id === COLLECTION
      )
      if (found) {
        collectionId = found.id || found.uuid || found.name
        return collectionId
      }
    }

    const body = await createRes.text().catch(() => '')
    throw new Error(`Chroma get_or_create failed (${createRes.status}): ${body}`)
  }

  async function collectionPath(suffix = '') {
    const id = await ensureCollection()
    // Prefer id path; name path also works on some versions
    return `${CHROMA_URL}/api/v1/collections/${encodeURIComponent(id)}${suffix}`
  }

  return {
    backend: 'chroma',

    async add({ ids, documents, embeddings, metadatas }) {
      if (!documents?.length) return { added: 0 }
      const safeMeta = (metadatas || []).map(flattenMetadata)
      const url = await collectionPath('/add')
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          documents,
          embeddings,
          metadatas: safeMeta,
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Chroma add failed (${res.status}): ${body}`)
      }
      return { added: documents.length }
    },

    async query({ queryEmbedding, nResults = 5, where = null }) {
      const total = await this.count()
      if (!total) {
        return {
          ids: [[]],
          documents: [[]],
          metadatas: [[]],
          distances: [[]],
          scores: [[]],
        }
      }
      const k = Math.max(1, Math.min(nResults ?? 5, total))
      const url = await collectionPath('/query')
      const payload = {
        query_embeddings: [queryEmbedding],
        n_results: k,
        include: ['documents', 'metadatas', 'distances'],
      }
      const chromaWhere = toChromaWhere(where)
      if (chromaWhere) payload.where = chromaWhere

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Chroma query failed (${res.status}): ${body}`)
      }
      const results = await res.json()
      const distances = results.distances?.[0] || []
      const metas = (results.metadatas || [[]]).map((row) =>
        (row || []).map((m) => expandMetadata(m || {}))
      )
      return {
        ids: results.ids || [[]],
        documents: results.documents || [[]],
        metadatas: metas,
        distances: [distances],
        scores: [distances.map((d) => (typeof d === 'number' ? 1 - d : 0))],
      }
    },

    async count() {
      try {
        // v1 count endpoint
        const url = await collectionPath('/count')
        const res = await fetch(url, { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          if (typeof data === 'number') return data
          if (typeof data?.count === 'number') return data.count
        }
      } catch {
        /* fall through */
      }
      // Fallback: get with limit 0 not supported — use empty query not possible.
      // Return 0 if unknown so callers can degrade gracefully.
      try {
        const id = await ensureCollection()
        const res = await fetch(`${CHROMA_URL}/api/v1/collections/${encodeURIComponent(id)}`)
        if (res.ok) {
          const info = await res.json()
          if (typeof info?.count === 'number') return info.count
        }
      } catch {
        /* ignore */
      }
      return 0
    },

    async clear() {
      // Delete by name then recreate
      collectionId = null
      try {
        await fetch(`${CHROMA_URL}/api/v1/collections/${encodeURIComponent(COLLECTION)}`, {
          method: 'DELETE',
        })
      } catch {
        /* ignore */
      }
      // Also try by prior id path if name delete fails on some versions
      await ensureCollection()
    },

    async status() {
      return {
        backend: 'chroma',
        collection: COLLECTION,
        url: CHROMA_URL,
        count: await this.count(),
      }
    },
  }
}

function flattenMetadata(meta = {}) {
  const out = {}
  for (const [k, v] of Object.entries(meta)) {
    if (v == null) continue
    if (Array.isArray(v)) {
      out[k] = v.join('|')
    } else if (typeof v === 'object') {
      out[k] = JSON.stringify(v)
    } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v
    } else {
      out[k] = String(v)
    }
  }
  return out
}

function expandMetadata(meta = {}) {
  const out = { ...meta }
  for (const key of ['themes', 'domains', 'archetypes']) {
    if (typeof out[key] === 'string' && out[key].includes('|')) {
      out[key] = out[key].split('|').filter(Boolean)
    }
  }
  return out
}

function toChromaWhere(where) {
  if (!where || !Object.keys(where).length) return undefined
  const simple = {}
  for (const [k, v] of Object.entries(where)) {
    if (k.startsWith('$')) continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      simple[k] = v
    }
  }
  return Object.keys(simple).length ? simple : undefined
}
