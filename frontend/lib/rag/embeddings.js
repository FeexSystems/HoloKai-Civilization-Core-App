/**
 * Ollama embeddings (local or cloud).
 * Model default: nomic-embed-text (768-d)
 *
 * Env:
 *   OLLAMA_URL / NEXT_PUBLIC_OLLAMA_URL  default http://localhost:11434
 *   OLLAMA_API_KEY                       optional Bearer token (Ollama Cloud)
 *   HOLAKAI_EMBED_MODEL                  default nomic-embed-text
 */

const OLLAMA_URL = process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434'
const EMBED_MODEL = process.env.HOLAKAI_EMBED_MODEL || 'nomic-embed-text'
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || ''

function ollamaHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra }
  if (OLLAMA_API_KEY) {
    headers.Authorization = `Bearer ${OLLAMA_API_KEY}`
  }
  return headers
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

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number(process.env.HOLAKAI_EMBED_TIMEOUT_MS || 15000))
  let res
  try {
    res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: ollamaHeaders(),
      body: JSON.stringify({ model: EMBED_MODEL, prompt }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Ollama embeddings timed out after 15s (${OLLAMA_URL}). Is Ollama running?`)
    }
    throw new Error(
      `Ollama embeddings fetch failed. Is Ollama running at ${OLLAMA_URL}? ${err instanceof Error ? err.message : err}`
    )
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `Ollama embeddings failed (${res.status}). Is Ollama running and is "${EMBED_MODEL}" pulled? ${body}`
    )
  }

  const data = await res.json()
  if (!Array.isArray(data.embedding) || !data.embedding.length) {
    throw new Error('Ollama returned an empty embedding')
  }
  return data.embedding
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
 * @returns {Promise<{ ok: boolean, model: string, ollamaUrl: string, error?: string }>}
 */
export async function checkEmbeddings() {
  try {
    const vector = await embedText('HoloKai ancestral memory probe')
    return {
      ok: true,
      model: EMBED_MODEL,
      ollamaUrl: OLLAMA_URL,
      dimensions: vector.length,
    }
  } catch (err) {
    return {
      ok: false,
      model: EMBED_MODEL,
      ollamaUrl: OLLAMA_URL,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export { OLLAMA_URL, EMBED_MODEL }
