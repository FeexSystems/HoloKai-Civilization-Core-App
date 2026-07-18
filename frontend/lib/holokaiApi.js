/**
 * HoloKai frontend ↔ Python Civilization Core client.
 *
 * Default base: `/backend` (Next.js rewrite → FastAPI :8000)
 * Override: NEXT_PUBLIC_API_URL=http://localhost:8000
 */

const DEFAULT_BASE =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || '/backend'
    : process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:8000'

export function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BASE).replace(/\/$/, '')
}

/**
 * Parse FastAPI / fetch errors into a readable message.
 */
export async function readError(res) {
  let detail = `HTTP ${res.status}`
  try {
    const data = await res.json()
    if (typeof data.detail === 'string') detail = data.detail
    else if (Array.isArray(data.detail)) {
      detail = data.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
    } else if (data.error) detail = data.error
    else if (data.message) detail = data.message
  } catch {
    try {
      detail = (await res.text()) || detail
    } catch {
      /* ignore */
    }
  }
  return detail
}

/**
 * @param {string} path
 * @param {RequestInit & { timeoutMs?: number }} [options]
 */
export async function apiFetch(path, options = {}) {
  const { timeoutMs = 60000, headers, ...rest } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const url = path.startsWith('http') ? path : `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`

  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    })
    if (!res.ok) {
      const message = await readError(res)
      const err = new Error(message)
      err.status = res.status
      throw err
    }
    if (res.status === 204) return null
    return res.json()
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out — is the HoloKai backend running?')
    }
    if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      throw new Error(
        `Cannot reach HoloKai core at ${getApiBase()}. Start it with: python main.py`
      )
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Normalize a single knowledge fragment from backend to_dict output. */
export function normalizeFragment(f = {}) {
  return {
    content: f.content || f.text || '',
    confidence: typeof f.confidence === 'number' ? f.confidence : 0.8,
    agent_origin: f.agent_origin || f.agent || f.origin || 'HoloKai',
    source_type: f.source_type || f.type || 'Knowledge',
    citation: f.citation || f.metadata?.source || f.metadata?.title || null,
    metadata: f.metadata || {},
  }
}

/** Normalize full /api/query response for UI consumption. */
export function normalizeQueryResponse(data = {}) {
  const fragments = (data.fragments || []).map(normalizeFragment)
  const emotions = {
    empathy: data.emotions?.empathy ?? 0.75,
    curiosity: data.emotions?.curiosity ?? 0.7,
    analytical: data.emotions?.analytical ?? 0.85,
    culturalResonance:
      data.emotions?.culturalResonance ??
      data.emotions?.cultural_resonance ??
      0.8,
  }

  return {
    title: data.title || 'Civilization Synthesis',
    query: data.query || '',
    summary: data.summary || fragments.map((f) => f.content).join('\n\n') || 'No synthesis available.',
    confidence: typeof data.confidence === 'number' ? data.confidence : 0,
    trace_id: data.trace_id || data.traceId || null,
    active_agents: data.active_agents || data.activeAgents || [],
    safety_notes: data.safety_notes || data.safetyNotes || [],
    emotions,
    fragments,
    greeting_animation: data.greeting_animation || data.greetingAnimation || null,
    raw: data,
  }
}

// ─── Backend endpoints ──────────────────────────────────────────────

export async function healthCheck() {
  try {
    const data = await apiFetch('/health', { timeoutMs: 5000 })
    return {
      online: true,
      ...data,
      vectorReady: Boolean(data?.vector_rag?.ready),
      vectorEnabled: Boolean(data?.vector_rag?.enabled),
      vectorCount: data?.vector_rag?.count ?? null,
      vectorModel: data?.vector_rag?.model ?? null,
      vectorError: data?.vector_rag?.error ?? null,
    }
  } catch (err) {
    return {
      online: false,
      status: 'offline',
      error: err.message,
      vectorReady: false,
      vectorEnabled: false,
    }
  }
}

export async function queryCore(query, { timeoutMs = 120000 } = {}) {
  const data = await apiFetch('/api/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
    timeoutMs,
  })
  return normalizeQueryResponse(data)
}

export async function getBackendRagStatus() {
  return apiFetch('/api/rag/status', { timeoutMs: 8000 })
}

export async function seedBackendRag({ force = false } = {}) {
  return apiFetch(`/api/rag/seed?force=${force ? 'true' : 'false'}`, {
    method: 'POST',
    timeoutMs: 300000,
  })
}

/**
 * Semantic retrieve against Python Chroma (nomic-embed-text).
 * Falls back gracefully if endpoint missing.
 */
export async function retrieveBackendContext(query, options = {}) {
  const { k = 5, domain = null, minScore = 0.28 } = options
  return apiFetch('/api/rag/retrieve', {
    method: 'POST',
    body: JSON.stringify({ query, k, domain, min_score: minScore }),
    timeoutMs: 60000,
  })
}

export async function getHistory() {
  return apiFetch('/api/history', { timeoutMs: 8000 })
}

export async function clearHistory() {
  return apiFetch('/api/history', { method: 'DELETE', timeoutMs: 8000 })
}

/**
 * Build prompt block from multi-agent fragments (for Vanguard / Ollama).
 */
export function fragmentsToContextPrompt(fragments, { maxChars = 3500 } = {}) {
  if (!fragments?.length) return ''
  const parts = []
  let used = 0
  for (const f of fragments) {
    const title = f.agent_origin || 'Agent'
    const type = f.source_type ? ` · ${f.source_type}` : ''
    const conf =
      typeof f.confidence === 'number' ? ` · ${Math.round(f.confidence * 100)}%` : ''
    const block = `[${title}${type}${conf}]\n${(f.content || '').trim()}`
    if (used + block.length > maxChars && parts.length) break
    parts.push(block)
    used += block.length + 8
  }
  return parts.join('\n\n---\n\n')
}
