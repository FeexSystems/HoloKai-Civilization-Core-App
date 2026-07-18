'use client'

import { useState, useRef, useCallback } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function useWhisper() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  const startListening = useCallback(async () => {
    setError('')
    setTranscript('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setProcessing(true)
        try {
          const form = new FormData()
          form.append('file', blob, 'recording.webm')
          const res = await fetch(`${API_BASE}/api/stt`, {
            method: 'POST',
            body: form,
          })
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}))
            throw new Error(errBody.detail || `STT failed (${res.status})`)
          }
          const data = await res.json()
          setTranscript(data.text)
          return data.text
        } catch (err) {
          setError(err.message)
          return ''
        } finally {
          setProcessing(false)
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop())
            streamRef.current = null
          }
        }
      }

      mr.start()
      setIsListening(true)
    } catch (err) {
      setError('Microphone access denied or unavailable.')
    }
  }, [])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setError('')
    setProcessing(false)
  }, [])

  return { isListening, processing, transcript, error, startListening, stopListening, reset }
}
