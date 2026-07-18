'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Send,
  Loader,
  Zap,
  Brain,
  Mic,
  Image as ImageIcon,
  Users,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Upload,
  MessageSquare,
} from 'lucide-react'
import { ARCHETYPES, getArchetypeById } from './archetypes'
import { useOllama } from './useOllama'
import { useRAG } from './useRAG'
import { useTTS } from './useTTS'
import { useWhisper } from './useWhisper'
import { VANGUARD_TOOLS, executeToolCall } from './tools'
import { queryCore, fragmentsToContextPrompt } from '../lib/holokaiApi'

function ParticleBurst({ active }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const particlesRef = useRef([])

  useEffect(() => {
    if (!active) {
      particlesRef.current = []
      if (animRef.current) cancelAnimationFrame(animRef.current)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = (canvas.width = canvas.offsetWidth)
    const h = (canvas.height = canvas.offsetHeight)

    particlesRef.current = Array.from({ length: 30 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 60,
      y: h - 40,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 6 - 2,
      size: Math.random() * 4 + 2,
      hue: Math.random() * 60 + 30,
      life: 1,
      decay: Math.random() * 0.02 + 0.01,
    }))

    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      let alive = false

      particlesRef.current.forEach((p) => {
        if (p.life <= 0) return
        alive = true
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.life -= p.decay

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.life * 0.6})`
        ctx.fill()
      })

      if (alive) animRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [active])

  if (!active) return null
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />
}

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'image', label: 'Vision', icon: ImageIcon },
]

/**
 * VanguardModal — glassmorphism multi-modal persona shell
 *
 * Props:
 *  - isOpen, onClose
 *  - archetype: archetype id (from ARCHETYPES)
 *  - onArchetypeChange?: (id) => void  — sync parent selector
 *  - onAnimationTrigger?: (id) => void
 */
export function VanguardModal({
  isOpen,
  onClose,
  archetype,
  onArchetypeChange,
  onAnimationTrigger,
}) {
  const [activeId, setActiveId] = useState(archetype)
  const [activeTab, setActiveTab] = useState('chat')
  const [showSelector, setShowSelector] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [showIntro, setShowIntro] = useState(true)
  const [particleActive, setParticleActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [imageNote, setImageNote] = useState('')
  const [lastSpoken, setLastSpoken] = useState('')
  const stayOnVoiceRef = useRef(false)

  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  const [showModelPicker, setShowModelPicker] = useState(false)
  const [model, setModelState] = useState('gemma4')
  const [healthModels, setHealthModels] = useState([])

  const {
    generate,
    isLoading: ollamaLoading,
    streamingContent,
    stop,
    useCloud,
    setCloudMode,
    setModel,
    model: resolvedModel,
    CLOUD_MODELS,
  } = useOllama()
  const { retrieve, buildContextPrompt, contexts, mode: ragMode } = useRAG()
  const tts = useTTS()
  const whisper = useWhisper()
  const isLoading = busy || ollamaLoading

  const archetypeData = getArchetypeById(activeId)

  // Sync resolved model
  useEffect(() => {
    if (resolvedModel) setModelState(resolvedModel)
  }, [resolvedModel])

  // Sync when parent changes archetype
  useEffect(() => {
    if (archetype) setActiveId(archetype)
  }, [archetype])

  const selectArchetype = useCallback(
    (id) => {
      setActiveId(id)
      setShowSelector(false)
      setMessages([])
      setShowIntro(true)
      onArchetypeChange?.(id)
    },
    [onArchetypeChange]
  )

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      setShowIntro(true)
      setMessages([])
      setActiveTab('chat')
      setShowSelector(false)
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      recognitionRef.current?.stop?.()
      setListening(false)
      stop?.()
      tts.stop()
    }
  }, [isOpen, stop]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (streamingContent) {
      setParticleActive(true)
      onAnimationTrigger?.(activeId)
      const t = setTimeout(() => setParticleActive(false), 2000)
      return () => clearTimeout(t)
    }
  }, [streamingContent, activeId, onAnimationTrigger])

  const sendMessage = async (rawText, { fromVoice = false } = {}) => {
    const text = (rawText ?? input).trim()
    if (!text || isLoading) return
    setShowIntro(false)
    setBusy(true)
    stayOnVoiceRef.current = fromVoice || activeTab === 'voice'
    if (!stayOnVoiceRef.current) setActiveTab('chat')

    const imageB64 = imagePreview ? imagePreview.replace(/^data:image\/\w+;base64,/, '') : undefined
    const userMsg = { role: 'user', content: text, images: imageB64 ? [imageB64] : undefined }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    if (imagePreview) {
      setImagePreview(null)
      setImageNote('')
    }

    try {
      let coreResult = null
      try {
        coreResult = await queryCore(text)
        if (coreResult?.active_agents?.length) {
          onAnimationTrigger?.(activeId)
        }
      } catch {
        coreResult = null
      }

      const ragResult = await retrieve(text, {
        archetypeId: archetypeData?.id || activeId,
        k: 5,
        preferBackend: true,
        coreFragments: coreResult?.fragments?.length ? coreResult.fragments : null,
      })
      const ragContexts = ragResult.contexts || []
      const corePrompt = coreResult?.fragments?.length
        ? fragmentsToContextPrompt(coreResult.fragments)
        : ''
      const localPrompt = ragResult.prompt || buildContextPrompt(ragContexts)
      const ragPrompt = [corePrompt, !corePrompt ? localPrompt : '']
        .filter(Boolean)
        .join('\n\n---\n\n')

      const hasCore = Boolean(coreResult?.fragments?.length || coreResult?.summary)
      const localMode = ragResult.mode || 'keyword'
      const activeRagMode = hasCore
        ? coreResult?.fragments?.length
          ? 'core+rag'
          : `core+${localMode}`
        : localMode

      const systemPrompt = ragPrompt
        ? `${archetypeData.systemPrompt}\n\n---\nAncestral Memory from HoloKai Civilization Core (multi-agent synthesis + curated knowledge). Ground your answer in this when relevant; cite civilizations, agents, or sources by name. Prefer accuracy over invention:\n${ragPrompt}\n---\n\nRespond as ${archetypeData.name}, the ${archetypeData.title}, using the above knowledge while maintaining your core personality.`
        : archetypeData.systemPrompt

      const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages, userMsg]

      let response = null
      let toolRound = 0
      const MAX_TOOL_ROUNDS = 3
      try {
        let currentMessages = fullMessages
        while (toolRound < MAX_TOOL_ROUNDS) {
          const result = await generate(currentMessages, true, {
            tools: toolRound === 0 ? VANGUARD_TOOLS : undefined,
          })

          const content = typeof result === 'string' ? result : result?.content || ''
          const toolCalls = typeof result === 'object' ? result?.toolCalls : null

          if (toolCalls?.length) {
            currentMessages = [...currentMessages, { role: 'assistant', content, tool_calls: toolCalls }]
            for (const tc of toolCalls) {
              const toolResult = await executeToolCall(tc, { retrieve, buildContextPrompt })
              currentMessages.push({
                role: 'tool',
                content: toolResult,
                tool_name: tc.function.name,
              })
            }
            toolRound++
          } else {
            response = content
            break
          }
        }
      } catch (ollamaErr) {
        if (coreResult?.summary) {
          response =
            `*[${archetypeData.name} channels the Core — Ollama offline]*\n\n` +
            (coreResult.title ? `**${coreResult.title}**\n\n` : '') +
            coreResult.summary
        } else if (ragPrompt || ragContexts.length) {
          const body = ragContexts
            .slice(0, 3)
            .map((c) => `**${c.title || 'Source'}**\n${(c.content || '').slice(0, 700)}`)
            .join('\n\n')
          response = body
            ? `*[${archetypeData.name} · ancestral memory only — Ollama offline]*\n\n${body}`
            : 'Retrieved memory is available but no chat model is running. Start Ollama or the HoloKai core.'
        } else {
          throw ollamaErr
        }
      }

      if (response) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response,
            rag: {
              mode: activeRagMode,
              sources: [
                ...(coreResult?.active_agents || []),
                ...ragContexts.map((c) => c.title).filter(Boolean),
              ].slice(0, 6),
              confidence: coreResult?.confidence,
            },
          },
        ])
        setLastSpoken(response)
        const shouldSpeak =
          tts.autoSpeak && (stayOnVoiceRef.current || activeTab === 'voice' || fromVoice)
        if (shouldSpeak) {
          tts.speak(response)
          setVoiceStatus('Speaking ancestral reply…')
        }
      }
    } catch {
      const fail =
        'The ancestral connection has faded... Start the HoloKai backend (`python main.py`) and/or Ollama. Local keyword memory still works after `npm run rag:seed` when embeddings are available.'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fail,
        },
      ])
      if (tts.autoSpeak && stayOnVoiceRef.current) tts.speak(fail)
    } finally {
      setBusy(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startVoiceInput = () => {
    // Prefer backend Whisper if available
    if (!whisper.isListening && !whisper.processing) {
      whisper.reset()
      whisper.startListening().then((text) => {
        if (text) {
          setInput(text)
          setVoiceStatus('Heard: "' + text + '"')
          tts.stop()
          sendMessage(text, { fromVoice: true })
        } else if (whisper.error) {
          setVoiceStatus('Whisper error: ' + whisper.error + '. Trying browser STT...')
          startBrowserSTT()
        }
      })
      setListening(true)
      setVoiceStatus('Listening via Whisper...')
      return
    }

    // If Whisper is already active, stop and use browser STT
    whisper.stopListening()
    setListening(false)
    startBrowserSTT()
  }

  const startBrowserSTT = () => {
    const SR =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!SR) {
      setVoiceStatus('Voice input is not supported in this browser. Try Chrome/Edge.')
      return
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
      setVoiceStatus('Stopped listening.')
      return
    }

    const recognition = new SR()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => {
      setListening(true)
      setVoiceStatus('Listening… speak to the ancestors.')
    }
    recognition.onerror = (ev) => {
      setListening(false)
      setVoiceStatus('Voice error: ' + (ev.error || 'unknown'))
    }
    recognition.onend = () => {
      setListening(false)
    }
    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      const final = event.results[event.results.length - 1]?.isFinal
      setInput(transcript)
      if (final && transcript.trim()) {
        setVoiceStatus('Heard: "' + transcript.trim() + '"')
        setListening(false)
        tts.stop()
        sendMessage(transcript.trim(), { fromVoice: true })
      }
    }

    try {
      recognition.start()
    } catch {
      setVoiceStatus('Could not start microphone. Check permissions.')
      setListening(false)
    }
  }

  const handleImageFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageNote('Please choose an image file.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
      setImageNote(
        'Loaded "' + file.name + '" (' + (file.size / 1024).toFixed(1) + ' KB). Ask about it in Chat — the vision model will analyze it.'
      )
    }
    reader.readAsDataURL(file)
  }

  const handleImageAction = () => {
    fileInputRef.current?.click()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-3xl mx-4 bg-zinc-950/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-3xl"
        >
          {/* Header + Vanguard selector */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setShowSelector((v) => !v)}
                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl transition-all max-w-full"
              >
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${archetypeData.gradient} flex items-center justify-center text-lg shadow-lg flex-shrink-0`}
                >
                  {archetypeData.emoji}
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm sm:text-base truncate">
                      {archetypeData.name}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${archetypeData.gradient} text-white`}
                    >
                      {archetypeData.title}
                    </span>
                  </div>
                  <p className="text-white/40 text-[11px] flex items-center gap-1">
                    <Users className="w-3 h-3" /> Switch Vanguard
                  </p>
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/40 hover:text-white transition-all p-2 rounded-xl hover:bg-white/5 flex-shrink-0"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          {/* Archetype grid */}
          <AnimatePresence>
            {showSelector && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-white/10"
              >
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                  {ARCHETYPES.map((arch) => (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => selectArchetype(arch.id)}
                      className={`p-3 rounded-2xl text-left transition border ${
                        activeId === arch.id
                          ? 'bg-white/15 border-amber-400/50'
                          : 'bg-white/[0.03] border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-lg mb-1">{arch.emoji}</div>
                      <div className="text-xs font-semibold text-white truncate">{arch.name}</div>
                      <div className="text-[10px] text-white/40">{arch.title}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const on = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3.5 text-sm font-medium capitalize transition flex items-center justify-center gap-2 ${
                    on
                      ? 'text-white border-b-2 border-amber-400 bg-white/[0.03]'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Body */}
          <div className="h-[480px] sm:h-[520px] flex flex-col relative">
            {activeTab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar relative">
                  <ParticleBurst active={particleActive} />

                  {messages.length === 0 && (
                    <div className="text-center py-12 space-y-4">
                      <div
                        className={`inline-flex w-16 h-16 rounded-full bg-gradient-to-br ${archetypeData.gradient} items-center justify-center text-3xl shadow-[0_0_30px_rgba(245,158,11,0.3)]`}
                      >
                        {archetypeData.emoji}
                      </div>
                      <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">
                        {showIntro
                          ? `I am ${archetypeData.name}, the ${archetypeData.title}. Speak, seeker — the ancestors are listening through digital fire.`
                          : 'Awaiting your query, seeker...'}
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto">
                        {[
                          'Tell me about Kemet',
                          'What is Ubuntu?',
                          'Teach me about Axum',
                          'Explain the Swahili Coast',
                        ].map((hint) => (
                          <button
                            key={hint}
                            type="button"
                            onClick={() => {
                              setInput(hint)
                              inputRef.current?.focus()
                            }}
                            className="px-3 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded-full text-zinc-400 hover:border-amber-500/30 hover:text-amber-300 transition-all"
                          >
                            {hint}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${archetypeData.gradient} flex items-center justify-center text-sm flex-shrink-0 mr-3 mt-1`}
                        >
                          {archetypeData.emoji}
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-amber-500/15 border border-amber-500/20 text-white'
                            : 'bg-gradient-to-br from-white/[0.06] to-white/[0.03] border border-white/10 text-white/85'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {msg.role === 'assistant' && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {msg.rag?.sources?.length > 0 && (
                              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 w-full">
                                <span className="text-[9px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                                  <Brain className="w-2.5 h-2.5 text-amber-400/70" />
                                  {msg.rag.mode === 'vector'
                                    ? 'local vector'
                                    : msg.rag.mode === 'backend' || msg.rag.mode === 'core+rag'
                                      ? 'core memory'
                                      : msg.rag.mode || 'rag'}
                                </span>
                                {msg.rag.sources.map((src, si) => (
                                  <span
                                    key={`${src}-${si}`}
                                    className="text-[10px] text-amber-200/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded"
                                  >
                                    {src}
                                  </span>
                                ))}
                                {typeof msg.rag.confidence === 'number' && (
                                  <span className="text-[10px] text-zinc-500">
                                    · conf {Math.round(msg.rag.confidence * 100)}%
                                  </span>
                                )}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setLastSpoken(msg.content)
                                tts.speak(msg.content)
                              }}
                              className="text-[10px] text-zinc-500 hover:text-amber-300 flex items-center gap-1 mt-1"
                              title="Speak response"
                            >
                              <Volume2 className="w-3 h-3" /> Hear
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {isLoading && streamingContent ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-purple-600 flex items-center justify-center text-sm flex-shrink-0 mr-3 mt-1">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div className="max-w-[80%] px-5 py-3.5 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.03] border border-white/10 text-white/85 text-sm leading-relaxed">
                        {streamingContent}
                        <span className="inline-block w-1.5 h-4 bg-amber-400/60 ml-0.5 animate-pulse" />
                      </div>
                    </motion.div>
                  ) : isLoading ? (
                    <div className="flex justify-start">
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${archetypeData.gradient} flex items-center justify-center text-sm flex-shrink-0 mr-3 mt-1`}
                      >
                        <Loader className="w-4 h-4 text-white animate-spin" />
                      </div>
                      <div className="bg-white/[0.04] border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3">
                        <div className="flex gap-1">
                          <span
                            className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="w-2 h-2 bg-amber-500/60 rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <span
                            className="w-2 h-2 bg-amber-600/60 rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                        <span className="text-white/40 text-sm">Weaving ancestral knowledge...</span>
                      </div>
                    </div>
                  ) : null}

                  <div ref={chatEndRef} />
                </div>

                {contexts.length > 0 && (
                  <div className="px-6 py-2 bg-white/[0.02] border-t border-white/5 flex items-center gap-2 overflow-x-auto">
                    <Brain className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                      Core memory
                      {ragMode === 'backend' || ragMode === 'core+rag'
                        ? ' · backend'
                        : ragMode === 'vector'
                          ? ' · local vector'
                          : ragMode === 'keyword'
                            ? ' · keyword'
                            : ''}
                      :
                    </span>
                    {contexts.slice(0, 3).map((ctx, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded whitespace-nowrap"
                      >
                        {ctx.title}
                        {typeof ctx.score === 'number' && ctx.source !== 'keyword'
                          ? ` ${Math.round(ctx.score * 100)}%`
                          : ''}
                      </span>
                    ))}
                  </div>
                )}
                {/* Model / Cloud bar */}
                <div className="px-6 py-2 bg-white/[0.02] border-t border-white/5 flex items-center gap-3 overflow-x-auto justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModelPicker(!showModelPicker)}
                      className="text-[10px] text-zinc-500 hover:text-amber-300 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5"
                    >
                      <Zap className="w-2.5 h-2.5" />
                      {useCloud ? 'Cloud' : 'Local'} · {model}
                    </button>
                  </div>
                </div>
                {showModelPicker && (
                  <div className="px-6 py-3 bg-black/40 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Engine</span>
                      <button
                        type="button"
                        onClick={() => { setCloudMode(!useCloud); setShowModelPicker(false) }}
                        className={`text-[11px] px-3 py-1.5 rounded-full border transition ${
                          useCloud
                            ? 'bg-purple-500/20 border-purple-400/40 text-purple-200'
                            : 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                        }`}
                      >
                        {useCloud ? '☁️ Ollama Cloud' : '💻 Local Ollama'}
                      </button>
                    </div>
                    <label className="block text-[10px] text-zinc-500">
                      Model
                      <select
                        value={model}
                        onChange={(e) => { setModel(e.target.value); setShowModelPicker(false) }}
                        className="mt-1 w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        {useCloud
                          ? CLOUD_MODELS.map((m) => (
                              <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>
                            ))
                          : healthModels.length > 0
                            ? healthModels.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))
                            : <option value={model}>{model}</option>
                        }
                      </select>
                    </label>
                    {!useCloud && (
                      <p className="text-[9px] text-zinc-600">
                        Local models from Ollama. Pull more: <span className="font-mono">ollama pull &lt;model&gt;</span>
                      </p>
                    )}
                    {useCloud && (
                      <p className="text-[9px] text-zinc-600">
                        Cloud models run on Ollama's servers. No download needed.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'voice' && (
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center border transition ${
                      listening
                        ? 'border-amber-400 bg-amber-500/20 animate-pulse'
                        : whisper.processing
                          ? 'border-sky-400 bg-sky-500/20 animate-pulse'
                          : tts.speaking
                            ? 'border-purple-400 bg-purple-500/15 animate-pulse'
                            : 'border-white/10 bg-white/5'
                    }`}
                  >
                    {whisper.processing ? (
                      <Loader size={44} className="text-sky-300 animate-spin" />
                    ) : tts.speaking ? (
                      <Volume2 size={44} className="text-purple-300" />
                    ) : (
                      <Mic size={44} className={listening ? 'text-amber-400' : 'text-white/50'} />
                    )}
                  </div>
                  <p className="text-white/70 text-sm max-w-md">
                    Full voice loop: <span className="text-amber-300">listen</span> → RAG + Vanguard
                    reply → <span className="text-purple-300">speak</span>
                    {tts.useBackendVoice ? ' (edge-tts neural)' : ' (browser TTS)'}.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={startVoiceInput}
                      className="px-8 py-3.5 bg-white text-black rounded-full text-base font-medium hover:scale-105 transition active:scale-95"
                    >
                      {listening ? 'Stop mic' : 'Tap to speak'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (tts.paused) tts.resume()
                        else if (tts.speaking) tts.pause()
                        else if (lastSpoken) tts.speak(lastSpoken)
                        else if (messages.filter((m) => m.role === 'assistant').length) {
                          const last = [...messages].reverse().find((m) => m.role === 'assistant')
                          if (last) {
                            setLastSpoken(last.content)
                            tts.speak(last.content)
                          }
                        }
                      }}
                      className="px-5 py-3.5 bg-white/10 border border-white/15 rounded-full text-white text-sm flex items-center gap-2 hover:bg-white/15"
                    >
                      {tts.paused ? (
                        <Play className="w-4 h-4" />
                      ) : tts.speaking ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                      {tts.paused ? 'Resume' : tts.speaking ? 'Pause' : 'Replay last'}
                    </button>
                    <button
                      type="button"
                      onClick={() => tts.stop()}
                      className="px-5 py-3.5 bg-white/5 border border-white/10 rounded-full text-white/70 text-sm flex items-center gap-2 hover:bg-white/10"
                    >
                      <VolumeX className="w-4 h-4" /> Stop TTS
                    </button>
                  </div>
                  {(voiceStatus || tts.status) && (
                    <p className="text-amber-200/80 text-xs max-w-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                      {[voiceStatus, tts.status].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {!tts.supported && (
                    <p className="text-rose-300/80 text-xs">
                      Text-to-speech unavailable in this browser. Use Chrome/Edge for full Voice tab.
                    </p>
                  )}
                </div>

                {/* TTS controls */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-white/70">Auto-speak replies</span>
                    <button
                      type="button"
                      onClick={() => tts.setAutoSpeak(!tts.autoSpeak)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        tts.autoSpeak
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                          : 'bg-white/5 border-white/10 text-white/50'
                      }`}
                    >
                      {tts.autoSpeak ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-white/70">Neural voice (edge-tts)</span>
                    <button
                      type="button"
                      onClick={() => tts.setUseBackendVoice(!tts.useBackendVoice)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        tts.useBackendVoice
                          ? 'bg-purple-500/20 border-purple-400/40 text-purple-200'
                          : 'bg-white/5 border-white/10 text-white/50'
                      }`}
                    >
                      {tts.useBackendVoice ? 'On' : 'Off'}
                    </button>
                  </div>
                  <label className="block text-[11px] text-white/50">
                    {tts.useBackendVoice ? 'Neural Voice' : 'Browser Voice'}
                    <select
                      value={tts.useBackendVoice ? tts.backendVoiceURI : tts.voiceURI}
                      onChange={(e) => {
                        if (tts.useBackendVoice) tts.setBackendVoiceURI(e.target.value)
                        else tts.setVoiceURI(e.target.value)
                      }}
                      className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      {tts.useBackendVoice ? (
                        tts.EDGE_TTS_VOICES.map((v) => (
                          <option key={v.uri} value={v.uri}>{v.label}</option>
                        ))
                      ) : (
                        <>
                          {tts.voices.length === 0 && <option value="">Default system voice</option>}
                          {tts.voices.map((v) => (
                            <option key={v.voiceURI} value={v.voiceURI}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="text-[11px] text-white/50">
                      Rate {tts.rate.toFixed(2)}
                      <input
                        type="range"
                        min="0.6"
                        max="1.4"
                        step="0.05"
                        value={tts.rate}
                        onChange={(e) => tts.setRate(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </label>
                    <label className="text-[11px] text-white/50">
                      Pitch {tts.pitch.toFixed(2)}
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={tts.pitch}
                        onChange={(e) => tts.setPitch(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </label>
                    <label className="text-[11px] text-white/50">
                      Volume {Math.round(tts.volume * 100)}%
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={tts.volume}
                        onChange={(e) => tts.setVolume(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </label>
                  </div>
                </div>

                {/* Recent voice transcript */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 max-h-40 overflow-y-auto space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Recent exchange</p>
                  {messages.length === 0 ? (
                    <p className="text-white/40 text-xs">
                      No lines yet. Try: “Tell me about Nubia and the Kandakes.”
                    </p>
                  ) : (
                    messages.slice(-4).map((m, i) => (
                      <p key={i} className="text-xs text-white/70">
                        <span className={m.role === 'user' ? 'text-amber-300' : 'text-purple-300'}>
                          {m.role === 'user' ? 'You' : archetypeData.name}:
                        </span>{' '}
                        {m.content.slice(0, 180)}
                        {m.content.length > 180 ? '…' : ''}
                      </p>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'image' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center overflow-y-auto">
                <ImageIcon size={64} className="text-purple-400" />
                <p className="text-lg text-white/80">Image generation & analysis</p>
                <p className="text-white/45 text-sm max-w-md">
                  Upload a reference for future multimodal (LLaVA) analysis, or describe scenes in
                  Chat for Grok Imagine / local SD pipelines. HoloKai keeps vision local-first.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFile(e.target.files?.[0])}
                />
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    type="button"
                    onClick={handleImageAction}
                    className="px-8 py-3.5 bg-gradient-to-r from-purple-500 to-amber-500 rounded-2xl text-white font-medium flex items-center gap-2 hover:opacity-90"
                  >
                    <Upload className="w-4 h-4" /> Upload image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('chat')
                      setInput('Describe an Afrofuturist vision of Great Zimbabwe at dawn')
                      setTimeout(() => inputRef.current?.focus(), 100)
                    }}
                    className="px-8 py-3.5 bg-white/10 border border-white/15 rounded-2xl text-white font-medium hover:bg-white/15"
                  >
                    Prompt in Chat
                  </button>
                </div>
                {imagePreview && (
                  <div className="mt-2 max-w-sm w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Upload preview"
                      className="rounded-2xl border border-white/10 max-h-48 mx-auto object-contain"
                    />
                  </div>
                )}
                {imageNote && (
                  <p className="text-white/50 text-xs max-w-md bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                    {imageNote}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Chat input bar */}
          {activeTab === 'chat' && (
            <div className="p-5 sm:p-6 border-t border-white/10">
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={startVoiceInput}
                  className={`p-3.5 rounded-2xl border transition ${
                    whisper.processing
                      ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                      : listening
                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                        : 'hover:bg-white/10 border-transparent text-white/60'
                  }`}
                  title="Voice input"
                >
                  {whisper.processing ? <Loader size={20} className="animate-spin" /> : <Mic size={20} />}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('image')}
                  className="p-3.5 hover:bg-white/10 rounded-2xl text-white/60"
                  title="Vision tab"
                >
                  <ImageIcon size={20} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask ${archetypeData.name} about ancient wisdom, future visions...`}
                  disabled={isLoading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-5 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                  className={`bg-gradient-to-br ${archetypeData.gradient} text-white px-5 sm:px-6 rounded-2xl transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-95 flex items-center justify-center shadow-lg`}
                >
                  {isLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default VanguardModal
