'use client'

import { useState, useCallback, useRef } from 'react'

const OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434'
// Prefer a small local default; override with NEXT_PUBLIC_OLLAMA_MODEL
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama3.2'
const PREFERRED_MODELS = [
  DEFAULT_MODEL,
  'llama3.2',
  'llama3.1',
  'llama3',
  'qwen2.5',
  'qwen2',
  'mistral',
  'phi3',
  'gemma2',
  'gemma',
]

function pickModel(availableNames, preferred) {
  if (!availableNames?.length) return preferred
  // Exact or tag-prefix match for preferred
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
  // Last resort: first non-embed model
  const chat = availableNames.find((n) => !/embed|nomic/i.test(n))
  return chat || availableNames[0] || preferred
}

export function useOllama({ model = DEFAULT_MODEL } = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [available, setAvailable] = useState(null) // null unknown | true | false
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

  const generate = useCallback(async (messages, stream = true) => {
    setIsLoading(true)
    setStreamingContent('')

    // Resolve a real installed model before generating
    try {
      const health = await checkHealth()
      if (!health.ok) {
        throw new Error(
          `Ollama unreachable at ${OLLAMA_URL}. Start Ollama or rely on Civilization Core summary.`
        )
      }
      if (!health.hasModel) {
        throw new Error(
          `No chat model found in Ollama. Pull one: ollama pull ${DEFAULT_MODEL}`
        )
      }
    } catch (err) {
      setIsLoading(false)
      setAvailable(false)
      throw err
    }

    const activeModel = modelRef.current

    const systemMsg = messages.find((m) => m.role === 'system')
    const chatMessages = messages.filter((m) => m.role !== 'system')
    const prompt =
      chatMessages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n') +
      '\n' +
      (chatMessages[chatMessages.length - 1]?.role === 'user' ? 'Assistant:' : '')

    const fullPrompt = systemMsg
      ? `[System Instructions]\n${systemMsg.content}\n\n[Conversation]\n${prompt}`
      : prompt

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          prompt: fullPrompt,
          stream,
          options: { temperature: 0.7, top_p: 0.9 },
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        setAvailable(false)
        throw new Error(
          `Ollama error ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}. Is model "${activeModel}" pulled?`
        )
      }

      setAvailable(true)

      if (!stream) {
        const data = await res.json()
        setIsLoading(false)
        return data.response
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
            if (parsed.response) {
              fullText += parsed.response
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
