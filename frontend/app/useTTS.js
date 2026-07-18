'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const EDGE_TTS_VOICES = [
  { label: 'Guy (US Male)', uri: 'en-US-GuyNeural' },
  { label: 'Jenny (US Female)', uri: 'en-US-JennyNeural' },
  { label: 'Sonia (GB Female)', uri: 'en-GB-SoniaNeural' },
  { label: 'Ryan (GB Male)', uri: 'en-GB-RyanNeural' },
  { label: 'Leah (ZA Female)', uri: 'en-ZA-LeahNeural' },
  { label: 'Liam (ZA Male)', uri: 'en-ZA-LiamNeural' },
  { label: 'Neema (KE Female)', uri: 'en-KE-NeemaNeural' },
  { label: 'Chinua (NG Male)', uri: 'en-NG-ChinuaNeural' },
  { label: 'Ezinne (NG Female)', uri: 'en-NG-EzinneNeural' },
  { label: 'Sam (US Female)', uri: 'en-US-SamNeural' },
]

/**
 * Browser Speech Synthesis (TTS) for HoloKai Voice tab.
 * Cleans markdown-ish assistant text for natural speech.
 * Supports backend edge-tts when useBackendVoice is true.
 */

function cleanForSpeech(text) {
  if (!text) return ''
  return String(text)
    .replace(/\*\*?|__|`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function chunkText(text, maxLen = 220) {
  const cleaned = cleanForSpeech(text)
  if (cleaned.length <= maxLen) return cleaned ? [cleaned] : []
  const parts = []
  let rest = cleaned
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf('. ', maxLen)
    if (cut < maxLen * 0.4) cut = rest.lastIndexOf(' ', maxLen)
    if (cut < 1) cut = maxLen
    parts.push(rest.slice(0, cut + 1).trim())
    rest = rest.slice(cut + 1).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

export function useTTS() {
  const [supported, setSupported] = useState(false)
  const [voices, setVoices] = useState([])
  const [voiceURI, setVoiceURI] = useState('')
  const [rate, setRate] = useState(0.95)
  const [pitch, setPitch] = useState(1)
  const [volume, setVolume] = useState(1)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [status, setStatus] = useState('')
  const [useBackendVoice, setUseBackendVoice] = useState(false)
  const [backendVoiceURI, setBackendVoiceURI] = useState('en-US-GuyNeural')
  const audioRef = useRef(null)
  const queueRef = useRef([])
  const speakingRef = useRef(false)

  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setSupported(false)
      return
    }
    setSupported(true)
    const list = window.speechSynthesis.getVoices() || []
    setVoices(list)
    if (!voiceURI && list.length) {
      const preferred =
        list.find((v) => /en(-|_)?(US|GB|NG|ZA|KE|GH)/i.test(v.lang) && /female|samantha|google/i.test(v.name)) ||
        list.find((v) => /^en/i.test(v.lang)) ||
        list[0]
      if (preferred) setVoiceURI(preferred.voiceURI)
    }
  }, [voiceURI])

  useEffect(() => {
    loadVoices()
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null
    }
  }, [loadVoices])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      queueRef.current = []
      speakingRef.current = false
      window.speechSynthesis.cancel()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setSpeaking(false)
    setPaused(false)
    setStatus('Stopped.')
  }, [])

  const speakNext = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const next = queueRef.current.shift()
    if (!next) {
      speakingRef.current = false
      setSpeaking(false)
      setPaused(false)
      setStatus('Finished speaking.')
      return
    }

    const utter = new SpeechSynthesisUtterance(next)
    utter.rate = rate
    utter.pitch = pitch
    utter.volume = volume
    const match = voices.find((v) => v.voiceURI === voiceURI)
    if (match) utter.voice = match

    utter.onstart = () => {
      speakingRef.current = true
      setSpeaking(true)
      setPaused(false)
      setStatus('Speaking…')
    }
    utter.onend = () => speakNext()
    utter.onerror = () => {
      setStatus('Speech error — try another voice.')
      speakNext()
    }

    window.speechSynthesis.speak(utter)
  }, [rate, pitch, volume, voiceURI, voices])

  const speakBackend = useCallback(
    async (text, { interrupt = true } = {}) => {
      if (interrupt) stop()
      setStatus('Generating neural speech…')
      setSpeaking(true)
      try {
        const res = await fetch(`${API_BASE}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanForSpeech(text).slice(0, 3000),
            voice: backendVoiceURI,
            rate: rate * 1.1,
            pitch: pitch,
          }),
        })
        if (!res.ok) throw new Error(`TTS backend error (${res.status})`)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.volume = volume
        audio.onended = () => {
          URL.revokeObjectURL(url)
          setSpeaking(false)
          setStatus('Finished speaking.')
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          setSpeaking(false)
          setStatus('Backend TTS error — try a different voice.')
        }
        await audio.play()
        setStatus('Speaking (edge-tts)…')
      } catch (err) {
        setSpeaking(false)
        setStatus(`Backend TTS failed: ${err.message}. Falling back to browser TTS.`)
        setTimeout(() => setStatus(''), 3000)
      }
    },
    [stop, backendVoiceURI, rate, pitch, volume]
  )

  const speak = useCallback(
    (text, opts) => {
      if (useBackendVoice) {
        speakBackend(text, opts)
        return true
      }
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setStatus('Text-to-speech is not supported in this browser.')
        return false
      }
      const chunks = chunkText(text)
      if (!chunks.length) return false
      const { interrupt = true } = opts || {}
      if (interrupt) {
        window.speechSynthesis.cancel()
        queueRef.current = []
      }
      queueRef.current.push(...chunks)
      if (!speakingRef.current || interrupt) {
        speakNext()
      }
      return true
    },
    [speakNext, useBackendVoice, speakBackend]
  )

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setPaused(true)
      setStatus('Paused.')
    }
  }, [])

  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setPaused(false)
      setSpeaking(true)
      setStatus('Speaking…')
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return {
    supported,
    voices,
    voiceURI,
    setVoiceURI,
    rate,
    setRate,
    pitch,
    setPitch,
    volume,
    setVolume,
    autoSpeak,
    setAutoSpeak,
    speaking,
    paused,
    status,
    setStatus,
    speak,
    stop,
    pause,
    resume,
    cleanForSpeech,
    useBackendVoice,
    setUseBackendVoice,
    backendVoiceURI,
    setBackendVoiceURI,
    EDGE_TTS_VOICES,
  }
}
