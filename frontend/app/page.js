'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Spline from '@splinetool/react-spline'
import { VanguardModal } from './VanguardModal'
import { ARCHETYPES } from './archetypes'
import {
  Mic, MicOff, Brain, ShieldCheck, Send,
  Cpu, HeartPulse, Radio, Database, Activity, Loader2,
  Sparkles, Zap, Globe, BookOpen, Compass,
  PanelLeftOpen, PanelRightOpen, PanelLeftClose, PanelRightClose,
  Volume2, VolumeX, MessageSquare, ChevronDown, MousePointerClick, Users
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const SPLINE_SCENE = 'https://my.spline.design/cybermannequin-Im1neoFY2FTPDevqulV4LNN3/scene.splinecode'

const DEFAULT_EMOTIONS = {
  empathy: 0.75,
  curiosity: 0.70,
  analytical: 0.85,
  culturalResonance: 0.80,
}

const ALL_AGENTS = [
  'Historian AI', 'Archaeologist AI', 'Linguist AI',
  'Anthropologist AI', 'Ethicist AI',
]

const AGENT_COLORS = {
  'Historian AI': '#E8B923',
  'Archaeologist AI': '#C67B3E',
  'Anthropologist AI': '#D9896C',
  'Linguist AI': '#E6C98A',
  'Ethicist AI': '#E8E0D0',
}

const AGENT_ICONS = {
  'Historian AI': BookOpen,
  'Archaeologist AI': Compass,
  'Linguist AI': Globe,
  'Anthropologist AI': Sparkles,
  'Ethicist AI': ShieldCheck,
}

const DEFAULT_COLOR = '#F59E0B'
const PARTICLE_COUNT = 40

// ─── Audio Beep ────────────────────────────────────────────────────
function playBeep(freq = 880, duration = 60) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration / 1000)
  } catch (e) {}
}

// ─── API Helper ────────────────────────────────────────────────────
async function queryHoloKai(query) {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// ─── Spiral Background ─────────────────────────────────────────────
function SpiralBackground() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const particlesRef = useRef([])
  const mouseRef = useRef({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e) => {
      mouseRef.current = { x: e.clientX / canvas.width, y: e.clientY / canvas.height }
    }
    window.addEventListener('mousemove', handleMouse)

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 350 + 30,
      speed: (Math.random() - 0.5) * 0.006,
      drift: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 1.8 + 0.3,
      opacity: Math.random() * 0.35 + 0.05,
      hue: Math.random() * 40 + 30,
    }))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const mx = mouseRef.current.x * canvas.width
      const my = mouseRef.current.y * canvas.height

      // Spiral lines that subtly follow mouse
      const mouseAngle = Math.atan2(my - cy, mx - cx)
      for (let s = 0; s < 4; s++) {
        ctx.strokeStyle = `rgba(245, 158, 11, ${0.025 + s * 0.008})`
        ctx.lineWidth = 0.4
        ctx.beginPath()
        for (let i = 0; i < 420; i += 2) {
          const rad = (i * Math.PI) / 180
          const wobble = Math.sin(rad * 3 + mouseAngle) * 8
          const r = 30 + i * 0.85 + s * 100 + wobble
          const x = cx + Math.cos(rad + s * 1.8 + mouseAngle * 0.1) * r
          const y = cy + Math.sin(rad + s * 1.8 + mouseAngle * 0.1) * r * 0.55
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // Orbital particles
      particlesRef.current.forEach(p => {
        p.angle += p.speed
        p.radius += p.drift * 0.08
        if (p.radius < 25) p.radius = 380
        if (p.radius > 400) p.radius = 40

        const x = cx + Math.cos(p.angle) * p.radius
        const y = cy + Math.sin(p.angle) * p.radius * 0.55

        const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size * 5)
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 60%, ${p.opacity})`)
        grad.addColorStop(1, `hsla(${p.hue}, 80%, 60%, 0)`)
        ctx.beginPath()
        ctx.fillStyle = grad
        ctx.arc(x, y, p.size * 4, 0, Math.PI * 2)
        ctx.fill()
      })

      animRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" style={{ opacity: 0.6 }} />
}

// ─── Interactive Spline Robot ──────────────────────────────────────
// CyberMannequin handles its own pointer tracking, drag, and hover
// internally via its Spline runtime. We just load the scene and let
// the canvas receive raw pointer events — no setVariable overrides.
// ──────────────────────────────────────────────────────────────────
function HoloKaiRobot({ systemState, activeAgents }) {
  const splineRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  function onLoad(splineApp) {
    splineRef.current = splineApp
    setLoaded(true)
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading state */}
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 border-2 border-amber-500/30 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-20 h-20 border-2 border-amber-500/50 rounded-full animate-ping" />
            <div className="absolute inset-0 w-20 h-20 border border-amber-500/20 rounded-full animate-ping" style={{ animationDelay: '400ms' }} />
          </div>
          <p className="text-xs text-zinc-500 font-mono tracking-wider">Initializing CyberMannequin...</p>
          <div className="mt-4 w-56 h-0.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 animate-loading-bar" />
          </div>
        </div>
      )}

      {/* Spline scene — canvas must receive raw pointer events */}
      <Spline
        scene={SPLINE_SCENE}
        onLoad={onLoad}
        className="w-full h-full"
      />
    </div>
  )
}

// ─── Emotion Bar ───────────────────────────────────────────────────
function EmotionBar({ label, value, color, icon: Icon }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400 flex items-center gap-1.5">
          {Icon && <Icon className="w-3 h-3" />}
          {label}
        </span>
        <span className="text-zinc-500 font-mono">{Math.round((value || 0) * 100)}</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden relative">
        <div
          className={`h-full ${color} transition-all duration-700 rounded-full relative`}
          style={{ width: `${Math.max(4, (value || 0) * 100)}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  )
}

// ─── Chat Message Bubble ───────────────────────────────────────────
function ChatMessage({ msg, index }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}
         style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}>
      <div className={`max-w-[85%] lg:max-w-[70%]`}>
        {!isUser && msg.active_agents?.length > 0 && (
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            {msg.active_agents.slice(0, 3).map(agent => {
              const Icon = AGENT_ICONS[agent] || Database
              return (
                <span key={agent} className="text-[9px] font-mono text-amber-400/70 flex items-center gap-1 bg-amber-500/5 px-1.5 py-0.5 rounded">
                  <Icon className="w-2.5 h-2.5" />
                  {agent.replace(' AI', '')}
                </span>
              )
            })}
          </div>
        )}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 text-zinc-100'
            : 'glass-panel border border-white/5 text-zinc-200'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
        {!isUser && msg.fragments?.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5 px-1">
            <span className="text-[9px] text-zinc-600 font-mono flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" />
              {Math.round((msg.fragments.reduce((a, f) => a + (f.confidence || 0), 0) / msg.fragments.length) * 100)}% confidence
            </span>
            <span className="text-[9px] text-zinc-600">
              {msg.fragments.length} source{msg.fragments.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Synthesis Detail Panel ────────────────────────────────────────
function SynthesisDetail({ response }) {
  if (!response) return null
  return (
    <div className="space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-amber-400">{response.title}</h3>
        <span className="text-[10px] font-mono text-zinc-500">
          {Math.round(response.confidence * 100)}%
        </span>
      </div>
      {response.fragments?.map((f, i) => (
        <div key={i} className="glass-panel rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-1.5">
            {(() => {
              const Icon = AGENT_ICONS[f.agent_origin] || Database
              return <Icon className="w-3 h-3 text-amber-400" />
            })()}
            <span className="text-[10px] font-semibold text-amber-400/80 uppercase">{f.agent_origin}</span>
            <span className="text-[9px] text-zinc-600 ml-auto bg-white/5 px-1.5 py-0.5 rounded">{f.source_type}</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{f.content}</p>
        </div>
      ))}
      {response.safety_notes?.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-200/70 flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{response.safety_notes.join(' ')}</span>
        </div>
      )}
    </div>
  )
}

// ─── Glass Nav Menu ────────────────────────────────────────────────
function GlassNavMenu({ leftOpen, rightOpen, onToggleLeft, onToggleRight, muted, onToggleMute }) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 3000)
    return () => clearInterval(interval)
  }, [])

  const handleClick = (action) => { playBeep(1200, 40); action() }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <button
        onClick={() => handleClick(onToggleLeft)}
        className={`glass-panel w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${
          leftOpen ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-white/10 text-zinc-500 hover:text-amber-400 hover:border-amber-500/20'
        }`}
      >
        {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
      </button>
      <div className={`glass-panel px-3 py-1.5 rounded-full border border-amber-500/20 flex items-center gap-2 transition-all duration-300 ${
        pulse ? 'border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]' : ''
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
          pulse ? 'bg-amber-400 scale-125' : 'bg-emerald-400'
        }`} />
        <span className="text-[10px] font-mono text-amber-400/80 tracking-wider">LIVE</span>
      </div>
      <button
        onClick={() => handleClick(onToggleMute)}
        className="glass-panel w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 text-zinc-500 hover:text-amber-400 hover:border-amber-500/20 transition-all duration-300"
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
      <button
        onClick={() => handleClick(onToggleRight)}
        className={`glass-panel w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${
          rightOpen ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-white/10 text-zinc-500 hover:text-amber-400 hover:border-amber-500/20'
        }`}
      >
        {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
      </button>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────
export default function HoloKaiPage() {
  const [systemState, setSystemState] = useState('idle')
  const [textInput, setTextInput] = useState('')
  const [activeAgents, setActiveAgents] = useState([])
  const [currentEmotions, setCurrentEmotions] = useState(DEFAULT_EMOTIONS)
  const [chatMessages, setChatMessages] = useState([])
  const [currentResponse, setCurrentResponse] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [leftPanelOpen, setLeftPanelOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [greetingAnimation, setGreetingAnimation] = useState(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [vanguardOpen, setVanguardOpen] = useState(false)
  const [vanguardArchetype, setVanguardArchetype] = useState('oluwa-core')
  const [selectedArchetype, setSelectedArchetype] = useState(null)
  const chatEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    if (autoScroll && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [autoScroll])

  useEffect(() => { scrollToBottom() }, [chatMessages, scrollToBottom])

  const handleScroll = useCallback(() => {
    const c = chatContainerRef.current
    if (!c) return
    setAutoScroll(c.scrollHeight - c.scrollTop - c.clientHeight < 100)
  }, [])

  const processQuery = useCallback(async (query) => {
    if (!query.trim()) return
    setError('')
    setIsLoading(true)
    setSystemState('thinking')

    const userMsg = { id: `user_${Date.now()}`, role: 'user', content: query.trim(), timestamp: new Date().toISOString() }
    setChatMessages(prev => [...prev, userMsg])

    try {
      const data = await queryHoloKai(query.trim())
      setActiveAgents(data.active_agents || [])
      setCurrentEmotions(data.emotions || DEFAULT_EMOTIONS)
      setCurrentResponse(data)
      setSystemState('speaking')

      if (data.greeting_animation) {
        setGreetingAnimation(data.greeting_animation)
        setTimeout(() => setGreetingAnimation(null), 2500)
      }

      const assistantMsg = {
        id: `assistant_${Date.now()}`, role: 'assistant',
        content: data.summary || 'Analysis complete.',
        timestamp: new Date().toISOString(),
        fragments: data.fragments || [],
        active_agents: data.active_agents || [],
        emotions: data.emotions || {},
      }
      setChatMessages(prev => [...prev, assistantMsg])
      setTimeout(() => setSystemState('idle'), 2600)
    } catch (err) {
      setError(err.message || 'Failed to reach HoloKai core')
      setSystemState('idle')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!textInput.trim() || isLoading) return
    processQuery(textInput)
    setTextInput('')
  }

  const stateConfig = {
    idle: { label: 'STANDBY', color: 'text-zinc-500', bg: 'bg-zinc-700', icon: Activity },
    listening: { label: 'LISTENING', color: 'text-sky-400', bg: 'bg-sky-500', icon: Mic },
    thinking: { label: 'PROCESSING', color: 'text-amber-400', bg: 'bg-amber-500', icon: Cpu },
    speaking: { label: 'SYNTHESIZING', color: 'text-emerald-400', bg: 'bg-emerald-500', icon: Brain },
  }
  const CurrentState = stateConfig[systemState]
  const quickTopics = ['Kemet', 'Mali Empire', 'Great Zimbabwe', 'Timbuktu', 'Adinkra', 'Ubuntu', 'Nubia', 'Benin Bronzes']

  return (
    <div className="h-screen bg-black overflow-hidden relative font-sans antialiased flex flex-col">
      <style jsx global>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes loading-bar { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 100%; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 20px rgba(245,158,11,0.1); } 50% { box-shadow: 0 0 40px rgba(245,158,11,0.3); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-loading-bar { animation: loading-bar 1.5s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.4s ease-out forwards; opacity: 0; }
        .animate-glow-pulse { animation: glow-pulse 3s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 1s ease-out forwards; }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.2); border-radius: 4px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245,158,11,0.4); }
        .spline-container canvas { outline: none !important; pointer-events: auto !important; }
        .spline-container iframe { pointer-events: auto !important; }
        .spline-container > div { pointer-events: auto !important; }
      `}</style>

      {/* Spiral background */}
      <SpiralBackground />

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-amber-500/5 via-transparent to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-t from-amber-500/3 via-transparent to-transparent blur-[100px] rounded-full" />
      </div>

      {/* Glass Nav */}
      <GlassNavMenu
        leftOpen={leftPanelOpen}
        rightOpen={rightPanelOpen}
        onToggleLeft={() => { playBeep(); setLeftPanelOpen(p => !p) }}
        onToggleRight={() => { playBeep(); setRightPanelOpen(p => !p) }}
        muted={muted}
        onToggleMute={() => setMuted(m => !m)}
      />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/Holokai-favicon.ico" alt="HoloKai" className="w-10 h-10 rounded-xl" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-light tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200">
              HOLOKAI
            </h1>
            <p className="text-[9px] text-amber-500/50 tracking-widest uppercase">Where Civilization Remembers</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Vanguard Button */}
          <div className="relative">
            <button
              onClick={() => { playBeep(); setVanguardOpen(p => !p); setVanguardArchetype(selectedArchetype || 'oluwa-core') }}
              className={`glass-panel flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                selectedArchetype
                  ? 'border-amber-500/40 text-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'border-white/10 text-zinc-400 hover:text-amber-300 hover:border-amber-500/20'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono tracking-wider">
                {selectedArchetype ? ARCHETYPES.find(a => a.id === selectedArchetype)?.name : 'VANGUARD'}
              </span>
            </button>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 glass-panel rounded-full border ${CurrentState.bg}/20`}>
            <CurrentState.icon className={`w-3 h-3 ${CurrentState.color}`} />
            <span className={`text-[10px] font-mono tracking-wider ${CurrentState.color}`}>{CurrentState.label}</span>
          </div>
        </div>
      </header>

      {/* Archetype Selector Panel */}
      {vanguardOpen && !selectedArchetype && (
        <div className="relative z-20 px-6 py-3 border-b border-white/5 bg-black/60 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest mb-3">SELECT A VANGUARD ARCHETYPE</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ARCHETYPES.map((arch) => (
                <button
                  key={arch.id}
                  onClick={() => { playBeep(880, 40); setSelectedArchetype(arch.id); setVanguardArchetype(arch.id); setVanguardOpen(false) }}
                  className={`glass-panel rounded-2xl p-3 border text-left transition-all duration-200 hover:scale-[1.02] ${
                    selectedArchetype === arch.id
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-lg">{arch.emoji}</span>
                    <span className={`text-xs font-semibold`} style={{ color: arch.color }}>{arch.name}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">{arch.title}</p>
                  <p className="text-[9px] text-zinc-600 mt-1 leading-relaxed">{arch.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setVanguardOpen(false)}
              className="mt-3 text-[10px] text-zinc-500 hover:text-zinc-300 font-mono"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vanguard Modal */}
      {selectedArchetype && (
        <VanguardModal
          isOpen={vanguardOpen}
          onClose={() => { setVanguardOpen(false); setSelectedArchetype(null) }}
          archetype={vanguardArchetype}
          onAnimationTrigger={(arch) => {
            setGreetingAnimation('wave')
            setTimeout(() => setGreetingAnimation(null), 2000)
          }}
        />
      )}

      {/* Main Content — Robot-First Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">

        {/* Left Panel */}
        <div className={`absolute lg:relative z-30 h-full w-72 transition-all duration-300 ${
          leftPanelOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:w-0 lg:opacity-0 lg:overflow-hidden'
        }`}>
          <div className="h-full glass-panel border-r border-white/5 p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="glass-panel p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <HeartPulse className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-medium tracking-widest text-zinc-400 uppercase">Emotion Engine</span>
              </div>
              <div className="space-y-3">
                <EmotionBar label="Empathy" value={currentEmotions.empathy} color="bg-rose-500" icon={HeartPulse} />
                <EmotionBar label="Curiosity" value={currentEmotions.curiosity} color="bg-sky-500" icon={Sparkles} />
                <EmotionBar label="Analytical" value={currentEmotions.analytical} color="bg-emerald-500" icon={Cpu} />
                <EmotionBar label="Resonance" value={currentEmotions.culturalResonance} color="bg-amber-500" icon={Globe} />
              </div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-medium tracking-widest text-zinc-400 uppercase">Active Agents</span>
              </div>
              <div className="space-y-1.5">
                {ALL_AGENTS.map((agent) => {
                  const Icon = AGENT_ICONS[agent]
                  const isActive = activeAgents.includes(agent)
                  return (
                    <div key={agent} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all duration-300 ${
                      isActive ? 'bg-amber-500/10 border border-amber-500/25 text-amber-300' : 'bg-white/[0.02] border border-white/5 text-zinc-600'
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-600'}`} />
                      <span className="flex-1 font-medium">{agent}</span>
                      {isActive && <Radio className="w-3 h-3 text-amber-400 animate-pulse" />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Center — Full Robot + Chat Overlay */}
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* Full-body Spline Robot — z-5 so canvas gets pointer events */}
          <div className="absolute inset-0 z-5 spline-container" style={{ pointerEvents: 'auto' }}>
            <HoloKaiRobot
              systemState={systemState}
              activeAgents={activeAgents}
            />
          </div>

          {/* Chat messages — z-10 but pointer-events-none so robot canvas receives mouse */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto chat-scroll relative z-10 px-4 md:px-8 py-6 pointer-events-none"
          >
            <div className="max-w-2xl mx-auto space-y-4 pointer-events-auto">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center pointer-events-auto">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/10 to-amber-700/5 border border-amber-500/15 flex items-center justify-center animate-glow-pulse overflow-hidden">
                      <img src="/Holokai-favicon.ico" alt="HoloKai" className="w-16 h-16" />
                    </div>
                    <div className="absolute inset-0 w-20 h-20 border border-amber-500/10 rounded-full animate-pulse" />
                  </div>
                  <h2 className="text-lg font-light text-zinc-300 mb-2 tracking-wide">Welcome to HoloKai</h2>
                  <p className="text-xs text-zinc-500 max-w-sm mb-8 leading-relaxed">
                    Ask about 5,000+ years of African civilizations, cultures, sciences, philosophies, and innovations
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {quickTopics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => processQuery(`Tell me about ${topic}`)}
                        className="px-4 py-2 text-xs glass-panel border border-white/10 rounded-full text-zinc-400 hover:border-amber-500/30 hover:text-amber-300 transition-all duration-200"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, idx) => (
                <ChatMessage key={msg.id} msg={msg} index={idx} />
              ))}

              {isLoading && (
                <div className="flex justify-start animate-slide-up">
                  <div className="glass-panel border border-white/5 rounded-2xl px-4 py-3 max-w-[80%]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-5 h-5 border-2 border-amber-500/40 rounded-full animate-spin" />
                        <div className="absolute inset-0 w-5 h-5 border border-amber-500/20 rounded-full animate-ping" />
                      </div>
                      <span className="text-xs text-zinc-400 font-mono">Synthesizing civilization data...</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-center animate-slide-up">
                  <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">{error}</div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Auto-scroll */}
          {!autoScroll && chatMessages.length > 0 && (
            <button
              onClick={() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setAutoScroll(true) }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 glass-panel border border-amber-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] text-amber-400 hover:bg-amber-500/10 transition-all pointer-events-auto"
            >
              <ChevronDown className="w-3 h-3" /> New messages
            </button>
          )}

          {/* Input */}
          <div className="relative z-20 px-4 md:px-8 pb-4 pt-2 pointer-events-auto">
            <form onSubmit={handleSubmit} className="glass-input flex items-center gap-2 p-1.5 rounded-2xl border border-white/10 max-w-3xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none rounded-2xl" />
              <button
                type="button"
                onClick={() => { playBeep(600, 30); setSystemState(systemState === 'listening' ? 'idle' : 'listening') }}
                className={`relative p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center ${
                  systemState === 'listening' ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'hover:bg-white/5 text-zinc-400'
                }`}
              >
                {systemState === 'listening' ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ask about civilizations, sciences, philosophies..."
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600 px-2 py-2.5 min-w-0"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isLoading}
                className="relative px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black rounded-xl text-sm font-medium hover:from-amber-400 hover:to-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 overflow-hidden flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">{isLoading ? 'Processing...' : 'Transmit'}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel */}
        <div className={`absolute lg:relative z-30 h-full w-80 transition-all duration-300 ${
          rightPanelOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 lg:w-0 lg:opacity-0 lg:overflow-hidden'
        }`}>
          <div className="h-full glass-panel border-l border-white/5 p-4 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-medium tracking-widest text-zinc-400 uppercase">Synthesis Report</span>
              {isLoading && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin ml-auto" />}
            </div>
            <div className="flex-1 overflow-y-auto chat-scroll pr-1">
              {currentResponse ? (
                <SynthesisDetail response={currentResponse} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-3">
                  <MessageSquare className="w-10 h-10 opacity-15 text-amber-500" />
                  <p className="text-[11px] text-center max-w-[180px] leading-relaxed">
                    Synthesis details will appear here after your first query
                  </p>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-600 font-mono">{chatMessages.length} messages</span>
              {chatMessages.length > 0 && (
                <button
                  onClick={() => { playBeep(400, 30); setChatMessages([]); setCurrentResponse(null); setActiveAgents([]); setCurrentEmotions(DEFAULT_EMOTIONS) }}
                  className="text-[10px] text-zinc-600 hover:text-amber-400 transition-colors font-mono"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
