
'use client'

import { useState, useEffect, useRef } from 'react'
import Spline from '@splinetool/react-spline/next'
import {
  Mic, MicOff, Brain, ShieldCheck, Send,
  Cpu, HeartPulse, Radio, Database, Activity, Loader2
} from 'lucide-react'

// ----------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Replace with your own HoloKai robot scene when ready
const SPLINE_SCENE = 'https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode'

const DEFAULT_EMOTIONS = {
  empathy: 0.75,
  curiosity: 0.70,
  analytical: 0.85,
  culturalResonance: 0.80,
}

const ALL_AGENTS = [
  'Historian AI',
  'Archaeologist AI',
  'Linguist AI',
  'Anthropologist AI',
  'Ethicist AI',
]

// Agent-specific core colors
const AGENT_COLORS: Record<string, string> = {
  'Historian AI': '#E8B923',
  'Archaeologist AI': '#C67B3E',
  'Anthropologist AI': '#D9896C',
  'Linguist AI': '#E6C98A',
  'Ethicist AI': '#E8E0D0',
}

const DEFAULT_COLOR = '#F59E0B'

// ----------------------------------------------------------------------
// API Helper
// ----------------------------------------------------------------------
async function queryHoloKai(query: string) {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// ----------------------------------------------------------------------
// Small UI Components
// ----------------------------------------------------------------------
function EmotionBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-500 font-mono">{Math.round((value || 0) * 100)}</span>
      </div>
      <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-700 rounded-full`}
          style={{ width: `${Math.max(4, (value || 0) * 100)}%` }}
        />
      </div>
    </div>
  )
}

function ResponseCard({ fragment }: { fragment: any }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] font-semibold tracking-wider text-amber-500 uppercase">
          {fragment.agent_origin || fragment.agent}
        </span>
        <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
          {fragment.source_type || fragment.type}
        </span>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed">
        {fragment.content || fragment.text}
      </p>
      {typeof fragment.confidence === 'number' && (
        <p className="mt-2 text-[11px] text-zinc-500 font-mono">
          {Math.round(fragment.confidence * 100)}% confidence
        </p>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------
// Spline Robot with Agent Color Logic
// ----------------------------------------------------------------------
function HoloKaiRobot({
  systemState,
  activeAgents,
}: {
  systemState: string
  activeAgents: string[]
}) {
  const splineRef = useRef<any>(null)
  const [loaded, setLoaded] = useState(false)

  function onLoad(splineApp: any) {
    splineRef.current = splineApp
    setLoaded(true)
  }

  useEffect(() => {
    const app = splineRef.current
    if (!app) return

    // Determine color
    let targetColor = DEFAULT_COLOR
    if (activeAgents.length === 1) {
      targetColor = AGENT_COLORS[activeAgents[0]] || DEFAULT_COLOR
    }

    // Push variables into Spline
    app.setVariable?.('systemState', systemState)
    app.setVariable?.('activeAgentCount', activeAgents.length)
    app.setVariable?.('primaryAgent', activeAgents[0] || 'none')
    app.setVariable?.('coreColor', targetColor)

    // Direct material control
    try {
      const core = app.findObjectByName?.('ChestCore')
      if (core?.material) {
        core.material.emissive?.set?.(targetColor)

        let intensity = 1.2
        if (systemState === 'speaking') intensity = 3.0
        else if (systemState === 'thinking') intensity = 2.3
        else if (systemState === 'listening') intensity = 1.7
        else intensity = 1.1 + activeAgents.length * 0.2

        core.material.emissiveIntensity = intensity
      }
    } catch (err) {
      // Object may not exist in the current scene
    }
  }, [systemState, activeAgents])

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-xs text-zinc-500 font-mono">Loading 3D Core...</p>
        </div>
      )}
      <Spline scene={SPLINE_SCENE} onLoad={onLoad} className="w-full h-full" />
    </div>
  )
}

// ----------------------------------------------------------------------
// Main Page
// ----------------------------------------------------------------------
export default function HoloKaiPage() {
  const [systemState, setSystemState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [transcript, setTranscript] = useState('')
  const [textInput, setTextInput] = useState('')
  const [activeAgents, setActiveAgents] = useState<string[]>([])
  const [currentResponse, setCurrentResponse] = useState<any>(null)
  const [emotions, setEmotions] = useState(DEFAULT_EMOTIONS)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const processQuery = async (query: string) => {
    if (!query.trim()) return

    setError('')
    setIsLoading(true)
    setSystemState('thinking')
    setTranscript(query)
    setActiveAgents([])
    setCurrentResponse(null)

    try {
      const data = await queryHoloKai(query.trim())
      setActiveAgents(data.active_agents || [])
      setCurrentResponse(data)
      setEmotions(data.emotions || DEFAULT_EMOTIONS)
      setSystemState('speaking')
      setTimeout(() => setSystemState('idle'), 2600)
    } catch (err: any) {
      setError(err.message || 'Failed to reach HoloKai core')
      setSystemState('idle')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || isLoading) return
    processQuery(textInput)
    setTextInput('')
  }

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans selection:bg-amber-500/30">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-amber-600/5 blur-[130px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-orange-800/5 blur-[110px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                HOLOKAI
              </h1>
              <p className="text-[11px] text-zinc-500 tracking-widest uppercase">Civilization Core</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-amber-500/90 bg-amber-500/5 border border-amber-500/15 px-3 py-1.5 rounded-full">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>CORE ONLINE</span>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-3 space-y-5">
            {/* Emotion Engine */}
            <div className="rounded-2xl border border-white/5 bg-zinc-950/60 backdrop-blur-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <HeartPulse className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium tracking-widest text-zinc-400 uppercase">
                  Emotion Engine
                </span>
              </div>
              <div className="space-y-4">
                <EmotionBar label="Empathy" value={emotions.empathy} color="bg-rose-500" />
                <EmotionBar label="Curiosity" value={emotions.curiosity} color="bg-sky-500" />
                <EmotionBar label="Analytical" value={emotions.analytical} color="bg-emerald-500" />
                <EmotionBar label="Resonance" value={emotions.culturalResonance} color="bg-amber-500" />
              </div>
            </div>

            {/* Active Agents */}
            <div className="rounded-2xl border border-white/5 bg-zinc-950/60 backdrop-blur-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <Cpu className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium tracking-widest text-zinc-400 uppercase">
                  Active Agents
                </span>
              </div>
              <div className="space-y-2">
                {ALL_AGENTS.map((agent) => (
                  <div
                    key={agent}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-300 ${
                      activeAgents.includes(agent)
                        ? 'bg-amber-500/10 border border-amber-500/25 text-amber-300'
                        : 'bg-black/30 border border-white/5 text-zinc-600'
                    }`}
                  >
                    <span>{agent}</span>
                    {activeAgents.includes(agent) && (
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center - 3D Robot */}
          <div className="lg:col-span-5">
            <div className="relative h-full min-h-[520px] rounded-2xl border border-white/5 bg-black overflow-hidden">
              {/* Spotlight */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[280px] bg-amber-500/10 blur-[90px] rounded-full pointer-events-none" />

              {/* Transcript */}
              <div className="absolute top-5 left-5 right-5 z-20 text-center pointer-events-none">
                {transcript && (
                  <p className="inline-block text-sm font-light text-zinc-200 bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-5 py-2">
                    {transcript}
                  </p>
                )}
              </div>

              <HoloKaiRobot systemState={systemState} activeAgents={activeAgents} />

              {/* State dots */}
              <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 z-20">
                {['idle', 'listening', 'thinking', 'speaking'].map((state) => (
                  <div
                    key={state}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      systemState === state
                        ? 'bg-amber-400 scale-125 shadow-[0_0_10px_#fbbf24]'
                        : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Synthesis */}
          <div className="lg:col-span-4">
            <div className="h-full rounded-2xl border border-white/5 bg-zinc-950/60 backdrop-blur-xl flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium tracking-widest text-zinc-400 uppercase">
                    Synthesis Report
                  </span>
                </div>
                {isLoading && <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <p className="text-sm font-mono">Synthesizing...</p>
                  </div>
                ) : !currentResponse?.fragments?.length ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-3">
                    <ShieldCheck className="w-10 h-10 opacity-20" />
                    <p className="text-sm text-center max-w-[200px]">
                      Awaiting query to synthesize civilization data
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-xl font-medium text-amber-400 mb-1">
                        {currentResponse.title}
                      </h2>
                      {currentResponse.confidence !== undefined && (
                        <p className="text-xs text-zinc-500 font-mono mb-4">
                          Confidence {Math.round(currentResponse.confidence * 100)}%
                        </p>
                      )}
                    </div>
                    <div className="space-y-3">
                      {currentResponse.fragments.map((fragment: any, idx: number) => (
                        <ResponseCard key={idx} fragment={fragment} />
                      ))}
                    </div>
                    {currentResponse.safety_notes?.length > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-200/80">
                        {currentResponse.safety_notes.join(' ')}
                      </div>
                    )}
                  </>
                )}
                {error && <p className="text-sm text-red-400 font-mono">{error}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Input */}
        <footer className="mt-8">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 max-w-3xl mx-auto bg-zinc-950/80 border border-white/10 rounded-2xl p-2 backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={() =>
                setSystemState(systemState === 'listening' ? 'idle' : 'listening')
              }
              className={`p-3.5 rounded-xl transition-all ${
                systemState === 'listening'
                  ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {systemState === 'listening' ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>

            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask HoloKai about African civilizations..."
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600 px-2 py-3"
            />

            <button
              type="submit"
              disabled={!textInput.trim() || isLoading}
              className="p-3.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-amber-400 disabled:opacity-40 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </footer>
      </div>
    </div>
  )
}