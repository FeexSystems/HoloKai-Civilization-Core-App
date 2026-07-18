#!/usr/bin/env node
/**
 * Seed HoloKai African history vector store from curated knowledge files.
 *
 * Prerequisites:
 *   ollama pull nomic-embed-text
 *   ollama serve  (if not already running)
 *
 * Usage (from frontend/):
 *   node scripts/seed-knowledge.mjs
 *   node scripts/seed-knowledge.mjs --clear
 *   node scripts/seed-knowledge.mjs --api          # hit running Next.js server
 *   node scripts/seed-knowledge.mjs --list         # list catalog only
 *   node scripts/seed-knowledge.mjs --status
 *
 * Backends:
 *   HOLAKAI_VECTOR_BACKEND=local   (default pure-TS JSON)
 *   HOLAKAI_VECTOR_BACKEND=qdrant  + QDRANT_URL=http://localhost:6333
 *   HOLAKAI_VECTOR_BACKEND=chroma  + CHROMA_URL=http://localhost:8001
 */

import { pathToFileURL } from 'url'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const clear = process.argv.includes('--clear')
const viaApi = process.argv.includes('--api')
const listOnly = process.argv.includes('--list')
const statusOnly = process.argv.includes('--status')
const apiBase = process.env.HOLAKAI_API || 'http://localhost:3000'

async function loadRag() {
  process.chdir(frontendRoot)
  const modPath = pathToFileURL(path.join(frontendRoot, 'lib', 'rag', 'index.js')).href
  return import(modPath)
}

async function seedViaApi() {
  console.log(`Seeding via API ${apiBase}/api/rag/seed (clear=${clear})...`)
  const res = await fetch(`${apiBase}/api/rag/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clear }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('Seed failed:', data)
    process.exit(1)
  }
  printResult(data)
}

async function listCatalog() {
  const { KNOWLEDGE_SOURCES } = await loadRag()
  console.log('\n=== African Civilizations Knowledge Catalog ===')
  console.log(`Sources: ${KNOWLEDGE_SOURCES.length}\n`)
  for (const s of KNOWLEDGE_SOURCES) {
    console.log(`  • ${s.id.padEnd(18)} ${s.title}`)
    console.log(`    ${s.region} · ${s.era} · ${s.empire}`)
    console.log(`    themes: ${(s.themes || []).join(', ')}`)
  }
  console.log('')
}

async function printStatus() {
  if (viaApi) {
    const res = await fetch(`${apiBase}/api/rag/status`)
    const data = await res.json()
    console.log(JSON.stringify(data, null, 2))
    return
  }
  const { getRagStatus } = await loadRag()
  const status = await getRagStatus()
  console.log(JSON.stringify(status, null, 2))
  if (!status.ready) {
    console.log('\nHint: npm run rag:seed  (requires Ollama + nomic-embed-text)')
  }
}

async function seedLocal() {
  process.env.HOLAKAI_VECTOR_BACKEND = process.env.HOLAKAI_VECTOR_BACKEND || 'local'

  const { seedKnowledgeBase, getRagStatus, KNOWLEDGE_SOURCES } = await loadRag()

  console.log('Checking embeddings (Ollama nomic-embed-text)...')
  const status = await getRagStatus()
  if (!status.embeddings?.ok) {
    console.error('Embeddings not ready:', status.embeddings?.error)
    console.error('Run: ollama pull nomic-embed-text')
    console.error('Or:  docker compose --profile qdrant-ollama up -d')
    process.exit(1)
  }
  console.log(
    `Embeddings OK · ${status.embeddings.model} · ${status.embeddings.dimensions}d · backend prefer=${process.env.HOLAKAI_VECTOR_BACKEND}`
  )
  console.log(`Catalog: ${KNOWLEDGE_SOURCES.length} African history sources`)

  console.log(`Seeding vector store (clear=${clear})...`)
  const result = await seedKnowledgeBase({ clear })
  printResult(result)
}

function printResult(result) {
  console.log('\n=== HoloKai Ancestral Memory Seed ===')
  console.log(`Total chunks: ${result.totalChunks}`)
  console.log(`Embed model: ${result.embedModel || 'nomic-embed-text'}`)
  console.log(`Store: ${JSON.stringify(result.store)}`)
  for (const s of result.sources || []) {
    if (s.ok) console.log(`  ✓ ${s.source} — ${s.chunks} chunks`)
    else console.log(`  ✗ ${s.source} — ${s.error}`)
  }
  const failed = (result.sources || []).filter((s) => !s.ok)
  console.log('=====================================')
  if (failed.length) {
    console.error(`\n${failed.length} source(s) failed.`)
    process.exitCode = 1
  } else {
    console.log('\nReady for VanguardModal RAG (useRAG → /api/rag/retrieve).')
  }
  console.log('')
}

try {
  if (listOnly) await listCatalog()
  else if (statusOnly) await printStatus()
  else if (viaApi) await seedViaApi()
  else await seedLocal()
} catch (err) {
  console.error(err)
  process.exit(1)
}
