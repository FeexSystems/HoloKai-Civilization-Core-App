/**
 * Ollama embeddings (server-side Next.js only) — Full RAG host chain.
 *
 * Aligns with Python ollama_client.py / embeddings_ollama.py:
 *   1) local OLLAMA_URL / OLLAMA_EMBED_URL
 *   2) cloud https://ollama.com when OLLAMA_API_KEY set (HOLAKAI_FULL_RAG / auto)
 *
 * Env:
 *   OLLAMA_URL / OLLAMA_EMBED_URL / NEXT_PUBLIC_OLLAMA_URL
 *   OLLAMA_API_KEY
 *   HOLAKAI_EMBED_MODEL (default nomic-embed-text)
 *   HOLAKAI_EMBED_BACKEND  auto | local | cloud
 *   HOLAKAI_FULL_RAG       default 1
 *
 * Note: Ollama Cloud often rejects embed models (401). Local nomic-embed-text is preferred.
 * When all hosts fail, callers should surface a clear error (Python side falls back to hashing).
 */

const LOCAL_URL = (
  process.env.OLLAMA_EMBED_URL ||
  process.env.OLLAMA_URL ||
  process.env.NEXT_PUBLIC_OLLAMA_URL ||
  'http://localhost:11434'
).replace(/\/$/, '')

const CLOUD_URL = 'https://ollama.com'
const EMBED_MODEL = process.env.HOLAKAI_EMBED_MODEL || 'nomic-embed-text'
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || ''
const EMBED_BACKEND = (process.env.HOLAKAI_EMBED_BACKEND || 'auto').toLowerCase()
const FULL_RAG = !['0', 'false', 'no', 'off'].includes(
  String(process.env.HOLAKAI_FULL_RAG ?? '1').toLowerCase()
)

/** Last host that produced a successful embedding (debug / status). */
let lastHostUsed = LOCAL_URL

function ollamaHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (OLLAMA_API_KEY) {
    headers.Authorization = `Bearer ${OLLAMA_API_KEY}`
  }
  return headers
}

function embedHosts() {
  if (process.env.OLLAMA_EMBED_URL) {
    return [process.env.OLLAMA_EMBED_URL.replace(/\/$/, '')]
  }
  if (EMBED_BACKEND === 'cloud') return [CLOUD_URL]
  if (EMBED_BACKEND === 'local') return [LOCAL_URL]
  // auto / full rag: local then cloud when key present
  const chain = [LOCAL_URL]
  if (FULL_RAG && OLLAMA_API_KEY && LOCAL_URL !== CLOUD_URL) {
    chain.push(CLOUD_URL)
  }
  return chain
}

/**
 * @param {string} host
 * @param {string} prompt
 * @param {AbortSignal} signal
 */
async function embedOnHost(host, prompt, signal) {
  // Prefer modern /api/embed, fall back to legacy /api/embeddings
  const attempts = [
    {
      url: `${host}/api/embed`,
      body: { model: EMBED_MODEL, input: prompt },
      parse: (data) =>
        Array.isArray(data.embeddings?.[0])
          ? data.embeddings[0]
          : Array.isArray(data.embedding)
            ? data.embedding
            : null,
    },
    {
      url: `${host}/api/embeddings`,
      body: { model: EMBED_MODEL, prompt },
      parse: (data) => (Array.isArray(data.embedding) ? data.embedding : null),
    },
  ]

  let lastErr = null
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: 'POST',
        headers: ollamaHeaders(),
        body: JSON.stringify(attempt.body),
        signal,
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        lastErr = new Error(`HTTP ${res.status} ${body.slice(0, 120)}`)
        continue
      }
      const data = await res.json()
      const vector = attempt.parse(data)
      if (vector?.length) return vector
      lastErr = new Error('empty embedding')
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr || new Error(`embed failed at ${host}`)
}

/**
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  const prompt = (text || '').slice(0, 8000)
  if (!prompt.trim()) {
    throw new Error('Cannot embed empty text')
  }

  const hosts = embedHosts()
  const errors = []
  const timeoutMs = Number(process.env.HOLAKAI_EMBED_TIMEOUT_MS || 15000)

  for (const host of hosts) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const vector = await embedOnHost(host, prompt, controller.signal)
      lastHostUsed = host
      return vector
    } catch (err) {
      const msg =
        err?.name === 'AbortError'
          ? `timeout after ${timeoutMs}ms`
          : err instanceof Error
            ? err.message
            : String(err)
      errors.push(`${host}: ${msg}`)
    } finally {
      clearTimeout(timer)
    }
  }

  throw new Error(
    `Ollama embeddings failed on all hosts [${errors.join(' | ')}]. ` +
      `Pull nomic-embed-text on local Ollama, or use Python Full RAG hashing fallback via POST /api/rag/ask.`
  )
}

/**
 * @param {string[]} texts
 * @param {{ concurrency?: number }} [options]
 * @returns {Promise<number[][]>}
 */
export async function embedBatch(texts, options = {}) {
  const concurrency = options.concurrency ?? 3
  const results = new Array(texts.length)
  let index = 0

  async function worker() {
    while (index < texts.length) {
      const i = index++
      results[i] = await embedText(texts[i])
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, texts.length) }, () => worker())
  await Promise.all(workers)
  return results
}

/**
 * @returns {Promise<{ ok: boolean, model: string, ollamaUrl: string, hosts?: string[], error?: string, dimensions?: number }>}
 */
export async function checkEmbeddings() {
  const hosts = embedHosts()
  try {
    const vector = await embedText('HoloKai ancestral memory probe')
    return {
      ok: true,
      model: EMBED_MODEL,
      ollamaUrl: lastHostUsed,
      hosts,
      dimensions: vector.length,
      fullRag: FULL_RAG,
    }
  } catch (err) {
    return {
      ok: false,
      model: EMBED_MODEL,
      ollamaUrl: LOCAL_URL,
      hosts,
      fullRag: FULL_RAG,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export { LOCAL_URL as OLLAMA_URL, EMBED_MODEL, embedHosts, lastHostUsed }
