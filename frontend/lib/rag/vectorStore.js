/**
 * Pure TypeScript-friendly local vector store for HoloKai RAG.
 * - Cosine similarity search
 * - JSON file persistence (single-file, sovereign, zero extra services)
 * - Optional in-memory operation for serverless/ephemeral runs
 *
 * Upgrade path: swap backend to Chroma/Qdrant via rag/index.js
 */

import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const DEFAULT_STORE_PATH = path.join(process.cwd(), '.data', 'holokai-vectors.json')

/**
 * @typedef {{ id: string, document: string, embedding: number[], metadata: Record<string, any> }} VectorRecord
 * @typedef {{ version: number, collection: string, updatedAt: string, records: VectorRecord[] }} VectorStoreFile
 */

/** @type {Map<string, VectorRecord[]>} */
const memory = new Map()

/**
 * @param {string} [storePath]
 */
export function createLocalVectorStore(storePath = process.env.HOLAKAI_VECTOR_PATH || DEFAULT_STORE_PATH) {
  const collectionName = process.env.HOLAKAI_COLLECTION || 'holokai-knowledge'

  async function ensureLoaded() {
    if (memory.has(collectionName)) return
    try {
      const raw = await fs.readFile(storePath, 'utf8')
      /** @type {VectorStoreFile} */
      const parsed = JSON.parse(raw)
      memory.set(collectionName, Array.isArray(parsed.records) ? parsed.records : [])
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        memory.set(collectionName, [])
        return
      }
      // corrupt file → start clean but do not silently wipe on disk until next save
      memory.set(collectionName, [])
    }
  }

  async function persist() {
    const records = memory.get(collectionName) || []
    await fs.mkdir(path.dirname(storePath), { recursive: true })
    /** @type {VectorStoreFile} */
    const payload = {
      version: 1,
      collection: collectionName,
      updatedAt: new Date().toISOString(),
      records,
    }
    await fs.writeFile(storePath, JSON.stringify(payload), 'utf8')
  }

  /**
   * @param {{ ids?: string[], documents: string[], embeddings: number[][], metadatas?: Record<string, any>[] }} batch
   */
  async function add(batch) {
    await ensureLoaded()
    const records = memory.get(collectionName) || []
    const { documents, embeddings, metadatas = [] } = batch
    const ids = batch.ids || documents.map(() => randomUUID())

    for (let i = 0; i < documents.length; i++) {
      records.push({
        id: ids[i],
        document: documents[i],
        embedding: embeddings[i],
        metadata: metadatas[i] || {},
      })
    }
    memory.set(collectionName, records)
    await persist()
    return { added: documents.length, total: records.length }
  }

  /**
   * @param {{ queryEmbedding: number[], nResults?: number, where?: Record<string, any> }} params
   */
  async function query({ queryEmbedding, nResults = 5, where = null }) {
    await ensureLoaded()
    let records = memory.get(collectionName) || []

    if (where && Object.keys(where).length) {
      records = records.filter((r) => matchesWhere(r.metadata || {}, where))
    }

    if (!records.length) {
      return {
        ids: [[]],
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
        scores: [[]],
      }
    }

    const k = Math.max(1, Math.min(nResults ?? 5, records.length))
    const scored = records
      .map((r) => ({
        id: r.id,
        document: r.document,
        metadata: r.metadata,
        score: cosineSimilarity(queryEmbedding, r.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)

    return {
      ids: [scored.map((s) => s.id)],
      documents: [scored.map((s) => s.document)],
      metadatas: [scored.map((s) => s.metadata)],
      distances: [scored.map((s) => 1 - s.score)],
      scores: [scored.map((s) => s.score)],
    }
  }

  async function count() {
    await ensureLoaded()
    return (memory.get(collectionName) || []).length
  }

  async function clear() {
    memory.set(collectionName, [])
    await persist()
  }

  async function status() {
    await ensureLoaded()
    const records = memory.get(collectionName) || []
    return {
      backend: 'local-json',
      collection: collectionName,
      path: storePath,
      count: records.length,
      dimensions: records[0]?.embedding?.length || null,
    }
  }

  return { add, query, count, clear, status, storePath, collectionName }
}

/**
 * @param {number[]} a
 * @param {number[]} b
 */
export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return -1
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return -1
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/**
 * Minimal Chroma-like where filter:
 * - equality: { empire: 'Mali' }
 * - $in: { source: { $in: ['kemet', 'mali-empire'] } }
 * - $and / $or arrays
 * @param {Record<string, any>} meta
 * @param {Record<string, any>} where
 */
export function matchesWhere(meta, where) {
  if (!where || !Object.keys(where).length) return true

  if (Array.isArray(where.$and)) {
    return where.$and.every((clause) => matchesWhere(meta, clause))
  }
  if (Array.isArray(where.$or)) {
    return where.$or.some((clause) => matchesWhere(meta, clause))
  }

  return Object.entries(where).every(([key, expected]) => {
    if (key === '$and' || key === '$or') return true
    const actual = meta[key]

    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if (Array.isArray(expected.$in)) {
        if (Array.isArray(actual)) {
          return actual.some((v) => expected.$in.includes(v))
        }
        return expected.$in.includes(actual)
      }
      if (expected.$eq !== undefined) return actual === expected.$eq
      if (expected.$ne !== undefined) return actual !== expected.$ne
    }

    if (Array.isArray(actual)) return actual.includes(expected)
    return actual === expected
  })
}
