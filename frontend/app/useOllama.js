'use client'

import { useState, useCallback, useRef } from 'react'

const OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434'

export function useOllama({ model = 'qwen3:32b' } = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const abortRef = useRef(null)

  const generate = useCallback(async (messages, stream = true) => {
    setIsLoading(true)
    setStreamingContent('')

    const systemMsg = messages.find(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')
    const prompt = chatMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') +
      '\n' + (chatMessages[chatMessages.length - 1]?.role === 'user' ? 'Assistant:' : '')

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
          model,
          prompt: fullPrompt,
          stream,
          options: { temperature: 0.7, top_p: 0.9 },
        }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error(`Ollama error ${res.status}`)

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
          } catch (e) {}
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
      throw err
    }
  }, [model])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { generate, stop, isLoading, streamingContent }
}
