'use client'

import { useState, useCallback, useRef } from 'react'

const LOCAL_URL = 'http://localhost:11434'
const CLOUD_URL = 'https://ollama.com'
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'gemma4'

const CLOUD_MODELS = [
  { id: 'gemma4:31b', label: 'Gemma 4 (31B)', desc: 'Best overall quality' },
  { id: 'gemma4:2b', label: 'Gemma 4 (2B)', desc: 'Fastest cloud' },
  { id: 'llama4:109b', label: 'Llama 4 (109B)', desc: 'Largest, most capable' },
  { id: 'llama4:17b', label: 'Llama 4 (17B)', desc: 'Good balanced' },
  { id: 'qwen3:32b', label: 'Qwen 3 (32B)', desc: 'Great tool calling' },
  { id: 'qwen3:8b', label: 'Qwen 3 (8B)', desc: 'Fast, strong reasoning' },
  { id: 'qwen3:4b', label: 'Qwen 3 (4B)', desc: 'Lightning fast' },
  { id: 'mistral-small3.2:24b', label: 'Mistral Small 3.2 (24B)', desc: 'Efficient, high quality' },
]

const LOCAL_PREFERRED = [
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
  for (const cand of LOCAL_PREFERRED) {
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
  const [useCloud, setUseCloud] = useState(false)
  const [cloudApiKey, _setCloudApiKey] = useState(
    process.env.NEXT_PUBLIC_OLLAMA_API_KEY || ''
  )
  const abortRef = useRef(null)
  const modelRef = useRef(model)

  const baseUrl = useCallback(() => {
    return useCloud ? CLOUD_URL : LOCAL_URL
  }, [useCloud])

  const headers = useCallback(() => {
    const h = { 'Content-Type': 'application/json' }
    if (useCloud && cloudApiKey) {
      h['Authorization'] = `Bearer ${cloudApiKey}`
    }
    return h
  }, [useCloud, cloudApiKey])

  const checkHealth = useCallback(async () => {
    try {
      const url = `${baseUrl()}/api/tags`
      const res = await fetch(url, { method: 'GET', headers: headers() })
      if (!res.ok) {
        setAvailable(false)
        return { ok: false, models: [] }
      }
      const data = await res.json()
      const models = (data.models || []).map((m) => m.name || m.model).filter(Boolean)
      const chosen = pickModel(models, modelRef.current)
      modelRef.current = chosen
      setResolvedModel(chosen)
      setAvailable(true)
      return {
        ok: true,
        models,
        model: chosen,
        hasModel: models.length > 0 || useCloud,
        host: useCloud ? 'ollama.com' : baseUrl(),
      }
    } catch {
      setAvailable(false)
      return { ok: false, models: [] }
    }
  }, [baseUrl, headers, useCloud])

  const generate = useCallback(async (messages, stream = true, opts = {}) => {
    setIsLoading(true)
    setStreamingContent('')

    if (useCloud && !cloudApiKey) {
      setIsLoading(false)
      setAvailable(false)
      throw new Error('Ollama Cloud requires an API key. Set NEXT_PUBLIC_OLLAMA_API_KEY in frontend/.env.local')
    }

    try {
      const health = await checkHealth()
      if (!health.ok) {
        throw new Error(
          useCloud
            ? 'Ollama Cloud unreachable. Check your API key and internet connection.'
            : `Ollama unreachable at ${LOCAL_URL}. Start it: ollama serve`
        )
      }
      if (!health.hasModel && !useCloud) {
        throw new Error(
          `No chat model found locally. Pull one: ollama pull ${DEFAULT_MODEL}`
        )
      }
    } catch (err) {
      setIsLoading(false)
      setAvailable(false)
      throw err
    }

    const activeModel = useCloud ? modelRef.current : modelRef.current
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
      const url = `${baseUrl()}/api/chat`
      const res = await fetch(url, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        setAvailable(false)
        throw new Error(
          `Ollama error ${res.status}${errBody ? `: ${errBody.slice(0, 200)}` : ''}. Is model "${activeModel}" available?`
        )
      }

      setAvailable(true)

      if (!stream) {
        const data = await res.json()
        setIsLoading(false)
        const content = data.message?.content || ''
        const toolCalls = data.message?.tool_calls || null
        return toolCalls && toolCalls.length ? { content, toolCalls } : content
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let toolCalls = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.message?.content) {
              fullText += parsed.message.content
              setStreamingContent(fullText)
            }
            if (parsed.message?.tool_calls?.length) {
              toolCalls = parsed.message.tool_calls
            }
            if (parsed.done) break
          } catch (e) {
            if (e instanceof Error && e.message && !e.message.includes('JSON')) throw e
          }
        }
      }

      setIsLoading(false)
      if (toolCalls?.length) return { content: fullText, toolCalls }
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
  }, [checkHealth, streamingContent, baseUrl, headers, useCloud, cloudApiKey])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const setCloudMode = useCallback((cloud) => {
    setUseCloud(cloud)
    setAvailable(null)
  }, [])

  const setModel = useCallback((m) => {
    modelRef.current = m
    setResolvedModel(m)
  }, [])

  return {
    generate,
    stop,
    isLoading,
    streamingContent,
    available,
    checkHealth,
    model: resolvedModel,
    setModel,
    useCloud,
    setCloudMode,
    cloudApiKey,
    CLOUD_MODELS,
    LOCAL_PREFERRED,
  }
}
