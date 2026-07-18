'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader, Sparkles, Zap, Brain } from 'lucide-react'
import { ARCHETYPES, getArchetypeById } from './archetypes'
import { useOllama } from './useOllama'
import { useRAG } from './useRAG'

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
    const w = canvas.width = canvas.offsetWidth
    const h = canvas.height = canvas.offsetHeight

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

      particlesRef.current.forEach(p => {
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

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [active])

  if (!active) return null
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />
}

export function VanguardModal({ isOpen, onClose, archetype, onAnimationTrigger }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [showIntro, setShowIntro] = useState(true)
  const [particleActive, setParticleActive] = useState(false)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  const { generate, isLoading, streamingContent } = useOllama()
  const { retrieve, buildContextPrompt, contexts } = useRAG()

  const archetypeData = getArchetypeById(archetype)

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, streamingContent, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      setShowIntro(true)
      setMessages([])
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  useEffect(() => {
    if (streamingContent) {
      setParticleActive(true)
      onAnimationTrigger?.(archetype)
      setTimeout(() => setParticleActive(false), 2000)
    }
  }, [streamingContent])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    setShowIntro(false)

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    try {
      // RAG retrieval
      const ragContexts = await retrieve(input)
      const ragPrompt = buildContextPrompt(ragContexts)

      const systemPrompt = ragPrompt
        ? `${archetypeData.systemPrompt}\n\n---\n\nRelevant Knowledge:\n${ragPrompt}\n---\n\nRespond as ${archetypeData.name}, the ${archetypeData.title}, using the above knowledge when relevant while maintaining your core personality.`
        : archetypeData.systemPrompt

      const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
        userMsg,
      ]

      const response = await generate(fullMessages, true)

      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }])
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'The ancestral connection has faded... Please try again, seeker.',
      }])
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-2xl mx-4 bg-black/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${archetypeData.gradient} flex items-center justify-center text-xl shadow-lg`}>
                {archetypeData.emoji}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {archetypeData.name}
                  <span className={`text-xs font-normal px-2 py-0.5 rounded-full bg-gradient-to-r ${archetypeData.gradient} text-white`}>
                    {archetypeData.title}
                  </span>
                </h2>
                <p className="text-white/50 text-xs">{archetypeData.description}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-all p-2 rounded-xl hover:bg-white/5">
              <X size={22} />
            </button>
          </div>

          {/* Chat Area */}
          <div className="h-[480px] overflow-y-auto p-6 space-y-4 custom-scrollbar relative">
            <ParticleBurst active={particleActive} />

            {messages.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <div className={`inline-flex w-16 h-16 rounded-full bg-gradient-to-br ${archetypeData.gradient} items-center justify-center text-3xl shadow-[0_0_30px_rgba(245,158,11,0.3)]`}>
                  {archetypeData.emoji}
                </div>
                <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">
                  {showIntro
                    ? `I am ${archetypeData.name}, the ${archetypeData.title}. Speak, seeker — the ancestors are listening through digital fire.`
                    : `Awaiting your query, seeker...`
                  }
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto">
                  {['Tell me about Kemet', 'What is Ubuntu?', 'Teach me about Ifa', 'Explain Sankofa'].map(hint => (
                    <button
                      key={hint}
                      onClick={() => { setInput(hint); inputRef.current?.focus() }}
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
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${archetypeData.gradient} flex items-center justify-center text-sm flex-shrink-0 mr-3 mt-1`}>
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
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {/* Loading / Streaming */}
            {(isLoading && streamingContent) ? (
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
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${archetypeData.gradient} flex items-center justify-center text-sm flex-shrink-0 mr-3 mt-1`}>
                  <Loader className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-white/[0.04] border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-amber-500/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-amber-600/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-white/40 text-sm">Weaving ancestral knowledge...</span>
                </div>
              </div>
            ) : null}

            <div ref={chatEndRef} />
          </div>

          {/* Context indicator */}
          {contexts.length > 0 && (
            <div className="px-6 py-2 bg-white/[0.02] border-t border-white/5 flex items-center gap-2 overflow-x-auto">
              <Brain className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
              <span className="text-[10px] text-zinc-500 whitespace-nowrap">Knowledge:</span>
              {contexts.slice(0, 3).map((ctx, i) => (
                <span key={i} className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {ctx.title}
                </span>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-6 border-t border-white/10">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${archetypeData.name} about ancient wisdom, future visions...`}
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className={`bg-gradient-to-br ${archetypeData.gradient} text-white px-6 rounded-2xl transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-95 flex items-center justify-center shadow-lg`}
              >
                {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
