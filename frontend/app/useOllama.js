'use client'

import { useState, useCallback, useRef } from 'react'

const OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434'
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'gemma4'
const PREFERRED_MODELS = [
  DEFAULT_MODEL,
  'gemma4:2b',
  'llama3.2',
  'llama3.1',
  'qwen3:4b',
  'qwen2.5',
  'mistral',
  'phi3',
  'gemma2',
]

function pickModel(availableNames, preferred) {
  if (!availableNames?.length) return preferred
  const exact = availableNames.find(
    (n) => n === preferred || n.startsWith(`${preferred.split(':')[0]}:`) || n === preferred.split(':')[0]
  )
  if (exact) return exact
  for (const cand of PREFERRED_MODELS) {
    const hit = availableNames.find(
      (n) => n === cand || n.startsWith(`${cand}:`) || n.startsWith(cand)
    )
    if (hit) return hit
  }
  const chat = availableNames.find((n) => !/embed|nomic/i.test(n))
  return chat || availableNames[0] || preferred
}

export function useOllama({ model = DEFAULT_MODEL } = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [available, setAvailable] = useState(null)
  const [resolvedModel, setResolvedModel] = useState(model)
  const abortRef = useRef(null)
  const modelRef = useRef(model)

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`, { method: 'GET' })
      if (!res.ok) {
        setAvailable(false)
        return { ok: false, models: [] }
      }
      const data = await res.json()
      const models = (data.models || []).map((m) => m.name)
      const chosen = pickModel(models, modelRef.current)
      modelRef.current = chosen
      setResolvedModel(chosen)
      setAvailable(true)
      return {
        ok: true,
        models,
        model: chosen,
        hasModel: models.some((n) => n.startsWith(chosen.split(':')[0])),
      }
    } catch {
      setAvailable(false)
      return { ok: false, models: [] }
    }
  }, [])

  const generate = useCallback(async (messages, stream = true, opts = {}) => {
    setIsLoading(true)
    setStreamingContent('')

    try {
      const health = await checkHealth()
      if (!health.ok) {
        throw new Error(`Ollama unreachable at ${OLLAMA_URL}. Start Ollama or rely on Civilization Core summary.`)
      }
      if (!health.hasModel) {
        throw new Error(`No chat model found in Ollama. Pull one: ollama pull ${DEFAULT_MODEL}`)
      }
    } catch (err) {
      setIsLoading(false)
      setAvailable(false)
      throw err
    }

    const activeModel = modelRef.current
    const controller = new AbortController()
    abortRef.current = controller

    const body = {
      model: activeModel,
      messages,
      stream,
      options: {
        temperature: opts.temperature ?? 0.7,
        top_p: opts.topP ?? 0.9,
      },
    }
    if (opts.format) body.format = opts.format
    if (opts.think) body.think = opts.think
    if (opts.tools) body.tools = opts.tools

    try {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        setAvailable(false)
        throw new Error(
          `Ollama error ${res.status}${errBody ? `: ${errBody.slice(0, 200)}` : ''}. Is model "${activeModel}" pulled?`
        )
      }

      setAvailable(true)

      if (!stream) {
        const data = await res.json()
        setIsLoading(false)
        return data.message?.content || ''
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.message?.content) {
              fullText += parsed.message.content
              setStreamingContent(fullText)
            }
            if (parsed.done) break
          } catch {
            /* partial JSON line */
          }
        }
      }

      setIsLoading(false)
      return fullText
    } catch (err) {
      if (err.name === 'AbortError') {
        setIsLoading(false)
        return streamingContent || ''
      }
      setIsLoading(false)
      setAvailable(false)
      throw err
    }
  }, [checkHealth, streamingContent])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    generate,
    stop,
    isLoading,
    streamingContent,
    available,
    checkHealth,
    ollamaUrl: OLLAMA_URL,
    model: resolvedModel,
  }
}
