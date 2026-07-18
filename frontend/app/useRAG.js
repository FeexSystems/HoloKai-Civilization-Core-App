'use client'

import { useState, useCallback } from 'react'

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
]

const KEYWORD_MAP = {
  kemet: { path: '/knowledge/kemet.txt', weight: 1 },
  egypt: { path: '/knowledge/kemet.txt', weight: 0.9 },
  pharaoh: { path: '/knowledge/kemet.txt', weight: 0.8 },
  pyramid: { path: '/knowledge/kemet.txt', weight: 0.7 },
  mali: { path: '/knowledge/mali-empire.txt', weight: 1 },
  mansa: { path: '/knowledge/mali-empire.txt', weight: 1 },
  timbuktu: { path: '/knowledge/mali-empire.txt', weight: 0.9 },
  songhai: { path: '/knowledge/mali-empire.txt', weight: 0.7 },
  zimbabwe: { path: '/knowledge/great-zimbabwe.txt', weight: 1 },
  great: { path: '/knowledge/great-zimbabwe.txt', weight: 0.7 },
  stone: { path: '/knowledge/great-zimbabwe.txt', weight: 0.5 },
  dogon: { path: '/knowledge/dogon-cosmology.txt', weight: 1 },
  nommo: { path: '/knowledge/dogon-cosmology.txt', weight: 0.9 },
  sirius: { path: '/knowledge/dogon-cosmology.txt', weight: 0.8 },
  ifa: { path: '/knowledge/ifa-divination.txt', weight: 1 },
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
}

const cache = {}

async function fetchKnowledgeFile(path) {
  if (cache[path]) return cache[path]
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    const text = await res.text()
    cache[path] = text
    return text
  } catch {
    return null
  }
}

export function useRAG() {
  const [isLoading, setIsLoading] = useState(false)
  const [contexts, setContexts] = useState([])

  const retrieve = useCallback(async (query) => {
    setIsLoading(true)
    const q = query.toLowerCase()
    const matched = new Set()

    for (const [keyword, info] of Object.entries(KEYWORD_MAP)) {
      if (q.includes(keyword)) {
        matched.add(info.path)
      }
    }

    const results = []
    for (const path of matched) {
      const content = await fetchKnowledgeFile(path)
      if (content) {
        const title = path.split('/').pop().replace('.txt', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        results.push({ title, path, content, relevance: matched.size })
      }
    }

    setContexts(results)
    setIsLoading(false)
    return results
  }, [])

  const buildContextPrompt = useCallback((contexts) => {
    if (!contexts.length) return ''
    return contexts.map(ctx =>
      `[${ctx.title}]\n${ctx.content.slice(0, 2000)}`
    ).join('\n\n---\n\n')
  }, [])

  return { retrieve, buildContextPrompt, contexts, isLoading }
}
