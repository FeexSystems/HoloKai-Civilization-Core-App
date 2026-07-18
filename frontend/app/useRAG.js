'use client'

import { useState, useCallback } from 'react'
import {
  retrieveBackendContext,
  fragmentsToContextPrompt,
  normalizeFragment,
} from '../lib/holokaiApi'

/**
 * HoloKai RAG hook — multi-tier ancestral memory
 *
 * 1) Python backend Chroma (nomic-embed-text) — same store as multi-agent core
 * 2) Next.js /api/rag/retrieve — local JSON / optional Chroma
 * 3) Keyword map over /public/knowledge/*.txt
 */

const KNOWLEDGE_PATHS = [
  '/knowledge/kemet.txt',
  '/knowledge/mali-empire.txt',
  '/knowledge/great-zimbabwe.txt',
  '/knowledge/dogon-cosmology.txt',
  '/knowledge/ifa-divination.txt',
  '/knowledge/adinkra-symbols.txt',
  '/knowledge/nsibidi-writing.txt',
  '/knowledge/ubuntu-philosophy.txt',
  '/knowledge/benin-bronzes.txt',
  '/knowledge/nubia-kush.txt',
  '/knowledge/axum-empire.txt',
  '/knowledge/songhai-empire.txt',
  '/knowledge/swahili-coast.txt',
  '/knowledge/carthage.txt',
]

const KEYWORD_MAP = {
  kemet: { path: '/knowledge/kemet.txt', weight: 1 },
  egypt: { path: '/knowledge/kemet.txt', weight: 0.9 },
  pharaoh: { path: '/knowledge/kemet.txt', weight: 0.8 },
  pyramid: { path: '/knowledge/kemet.txt', weight: 0.7 },
  maat: { path: '/knowledge/kemet.txt', weight: 0.85 },
  mali: { path: '/knowledge/mali-empire.txt', weight: 1 },
  mansa: { path: '/knowledge/mali-empire.txt', weight: 1 },
  timbuktu: { path: '/knowledge/mali-empire.txt', weight: 0.9 },
  songhai: { path: '/knowledge/mali-empire.txt', weight: 0.7 },
  zimbabwe: { path: '/knowledge/great-zimbabwe.txt', weight: 1 },
  dogon: { path: '/knowledge/dogon-cosmology.txt', weight: 1 },
  nommo: { path: '/knowledge/dogon-cosmology.txt', weight: 0.9 },
  sirius: { path: '/knowledge/dogon-cosmology.txt', weight: 0.8 },
  ifa: { path: '/knowledge/ifa-divination.txt', weight: 1 },
  ifá: { path: '/knowledge/ifa-divination.txt', weight: 1 },
  orisha: { path: '/knowledge/ifa-divination.txt', weight: 0.9 },
  divination: { path: '/knowledge/ifa-divination.txt', weight: 0.7 },
  babalawo: { path: '/knowledge/ifa-divination.txt', weight: 0.8 },
  adinkra: { path: '/knowledge/adinkra-symbols.txt', weight: 1 },
  sankofa: { path: '/knowledge/adinkra-symbols.txt', weight: 0.9 },
  symbols: { path: '/knowledge/adinkra-symbols.txt', weight: 0.6 },
  nsibidi: { path: '/knowledge/nsibidi-writing.txt', weight: 1 },
  writing: { path: '/knowledge/nsibidi-writing.txt', weight: 0.5 },
  script: { path: '/knowledge/nsibidi-writing.txt', weight: 0.6 },
  ubuntu: { path: '/knowledge/ubuntu-philosophy.txt', weight: 1 },
  philosophy: { path: '/knowledge/ubuntu-philosophy.txt', weight: 0.7 },
  humanity: { path: '/knowledge/ubuntu-philosophy.txt', weight: 0.5 },
  benin: { path: '/knowledge/benin-bronzes.txt', weight: 1 },
  bronze: { path: '/knowledge/benin-bronzes.txt', weight: 0.9 },
  ivory: { path: '/knowledge/benin-bronzes.txt', weight: 0.7 },
  oba: { path: '/knowledge/benin-bronzes.txt', weight: 0.8 },
  nubia: { path: '/knowledge/nubia-kush.txt', weight: 1 },
  kush: { path: '/knowledge/nubia-kush.txt', weight: 1 },
  meroe: { path: '/knowledge/nubia-kush.txt', weight: 0.9 },
  kerma: { path: '/knowledge/nubia-kush.txt', weight: 0.8 },
  axum: { path: '/knowledge/axum-empire.txt', weight: 1 },
  aksum: { path: '/knowledge/axum-empire.txt', weight: 1 },
  ezana: { path: '/knowledge/axum-empire.txt', weight: 0.9 },
  geez: { path: '/knowledge/axum-empire.txt', weight: 0.8 },
  'geʽez': { path: '/knowledge/axum-empire.txt', weight: 0.8 },
  ethiopia: { path: '/knowledge/axum-empire.txt', weight: 0.7 },
  songhai: { path: '/knowledge/songhai-empire.txt', weight: 1 },
  askia: { path: '/knowledge/songhai-empire.txt', weight: 0.95 },
  askiya: { path: '/knowledge/songhai-empire.txt', weight: 0.95 },
  gao: { path: '/knowledge/songhai-empire.txt', weight: 0.75 },
  swahili: { path: '/knowledge/swahili-coast.txt', weight: 1 },
  kilwa: { path: '/knowledge/swahili-coast.txt', weight: 0.95 },
  mombasa: { path: '/knowledge/swahili-coast.txt', weight: 0.85 },
  zanzibar: { path: '/knowledge/swahili-coast.txt', weight: 0.85 },
  kiswahili: { path: '/knowledge/swahili-coast.txt', weight: 0.9 },
  carthage: { path: '/knowledge/carthage.txt', weight: 1 },
  hannibal: { path: '/knowledge/carthage.txt', weight: 0.95 },
  punic: { path: '/knowledge/carthage.txt', weight: 0.9 },
  tunis: { path: '/knowledge/carthage.txt', weight: 0.7 },
}

const fileCache = {}

async function fetchKnowledgeFile(path) {
  if (fileCache[path]) return fileCache[path]
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    const text = await res.text()
    fileCache[path] = text
    return text
  } catch {
    return null
  }
}

function titleFromPath(path) {
  return path
    .split('/')
    .pop()
    .replace('.txt', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

async function keywordRetrieve(query) {
  const q = query.toLowerCase()
  const matched = new Map()

  for (const [keyword, info] of Object.entries(KEYWORD_MAP)) {
    if (q.includes(keyword)) {
      const prev = matched.get(info.path) || 0
      matched.set(info.path, Math.max(prev, info.weight))
    }
  }

  if (matched.size === 0) {
    for (const path of KNOWLEDGE_PATHS.slice(0, 2)) {
      matched.set(path, 0.2)
    }
  }

  const results = []
  for (const [path, weight] of matched.entries()) {
    const content = await fetchKnowledgeFile(path)
    if (content) {
      results.push({
        title: titleFromPath(path),
        path,
        content: content.slice(0, 2000),
        score: weight,
        source: 'keyword',
      })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

async function localVectorRetrieve(query, { archetypeId, k = 5 } = {}) {
  const res = await fetch('/api/rag/retrieve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, k, archetypeId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Local RAG failed (${res.status})`)
  }

  const data = await res.json()
  return {
    contexts: (data.contexts || []).map((c) => ({
      title: c.title,
      content: c.content,
      path: c.metadata?.source ? `/knowledge/${c.metadata.source}.txt` : null,
      score: c.score,
      metadata: c.metadata,
      source: 'vector-local',
    })),
    prompt: data.prompt || '',
  }
}

async function backendVectorRetrieve(query, { k = 5, domain = null } = {}) {
  const data = await retrieveBackendContext(query, { k, domain })
  const contexts = (data.contexts || []).map((c) => ({
    title: c.title,
    content: c.content,
    score: c.score,
    metadata: c.metadata,
    source: 'vector-backend',
  }))
  return {
    contexts,
    prompt: data.prompt || buildContextPromptStatic(contexts),
  }
}

/** Map Vanguard archetype → preferred agent domain for backend retrieve */
const ARCHETYPE_DOMAIN = {
  'kemet-alpha': 'historian',
  'asante-v': 'anthropology',
  zamani: 'ethics',
  'naja-7': 'ethics',
  'sika-gold': 'archaeology',
  'kush-prime': 'historian',
  'bantu-node': 'linguistics',
  'oluwa-core': 'anthropology',
}

function buildContextPromptStatic(ctxs, maxChars = 3500) {
  if (!ctxs?.length) return ''
  const parts = []
  let used = 0
  for (const ctx of ctxs) {
    const title = ctx.title || 'Knowledge'
    const score =
      typeof ctx.score === 'number' ? ` · relevance ${Math.round(ctx.score * 100)}%` : ''
    const body = (ctx.content || '').slice(0, 2000)
    const block = `[${title}${score}]\n${body}`
    if (used + block.length > maxChars && parts.length) break
    parts.push(block)
    used += block.length + 8
  }
  return parts.join('\n\n---\n\n')
}

export function useRAG() {
  const [isLoading, setIsLoading] = useState(false)
  const [contexts, setContexts] = useState([])
  const [mode, setMode] = useState('idle') // idle | backend | vector | keyword
  const [error, setError] = useState(null)

  /**
   * @param {string} query
   * @param {{
   *   archetypeId?: string,
   *   k?: number,
   *   preferBackend?: boolean,
   *   domain?: string | null,
   *   coreFragments?: Array<any>,
   * }} [options]
   */
  const retrieve = useCallback(async (query, options = {}) => {
    const {
      archetypeId = null,
      k = 5,
      preferBackend = true,
      domain = null,
      coreFragments = null,
    } = options

    setIsLoading(true)
    setError(null)

    // If multi-agent fragments already provided (from /api/query), use them first
    if (coreFragments?.length) {
      const contextsFromCore = coreFragments.map((f) => {
        const n = normalizeFragment(f)
        return {
          title: n.agent_origin,
          content: n.content,
          score: n.confidence,
          metadata: n.metadata,
          source: 'core-agents',
          source_type: n.source_type,
        }
      })
      const prompt =
        fragmentsToContextPrompt(coreFragments.map(normalizeFragment)) ||
        buildContextPromptStatic(contextsFromCore)
      setContexts(contextsFromCore)
      setMode('backend')
      setIsLoading(false)
      return { contexts: contextsFromCore, prompt, mode: 'backend' }
    }

    try {
      if (preferBackend) {
        try {
          const domainHint = domain || (archetypeId && ARCHETYPE_DOMAIN[archetypeId]) || null
          const { contexts: backendContexts, prompt } = await backendVectorRetrieve(query, {
            k,
            domain: domainHint,
          })
          if (backendContexts.length) {
            setContexts(backendContexts)
            setMode('backend')
            setIsLoading(false)
            return { contexts: backendContexts, prompt, mode: 'backend' }
          }
        } catch (backendErr) {
          setError(backendErr instanceof Error ? backendErr.message : String(backendErr))
        }
      }

      try {
        const { contexts: vectorContexts, prompt } = await localVectorRetrieve(query, {
          archetypeId,
          k,
        })
        if (vectorContexts.length) {
          setContexts(vectorContexts)
          setMode('vector')
          setIsLoading(false)
          return { contexts: vectorContexts, prompt, mode: 'vector' }
        }
      } catch (vectorErr) {
        setError(vectorErr instanceof Error ? vectorErr.message : String(vectorErr))
      }

      const keywordContexts = await keywordRetrieve(query)
      setContexts(keywordContexts)
      setMode('keyword')
      setIsLoading(false)
      return {
        contexts: keywordContexts,
        prompt: buildContextPromptStatic(keywordContexts),
        mode: 'keyword',
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setContexts([])
      setMode('idle')
      setIsLoading(false)
      return { contexts: [], prompt: '', mode: 'idle' }
    }
  }, [])

  const buildContextPrompt = useCallback((ctxs, maxChars = 3500) => {
    return buildContextPromptStatic(ctxs, maxChars)
  }, [])

  const seed = useCallback(async (clear = false) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/rag/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear }),
      })
      const data = await res.json()
      setIsLoading(false)
      return data
    } catch (err) {
      setIsLoading(false)
      throw err
    }
  }, [])

  const getStatus = useCallback(async () => {
    const res = await fetch('/api/rag/status')
    return res.json()
  }, [])

  return {
    retrieve,
    buildContextPrompt,
    seed,
    getStatus,
    contexts,
    isLoading,
    mode,
    error,
  }
}
