'use client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const VANGUARD_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information. Use this when the user asks about recent events, specific facts, or things outside the ancestral knowledge base.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query string',
          },
          max_results: {
            type: 'integer',
            description: 'Maximum number of results to return (1-10)',
            default: 5,
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'retrieve_knowledge',
      description: 'Search the HoloKai ancestral knowledge base for information about African civilizations, history, philosophy, and cultural heritage.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The knowledge query string',
          },
        },
        required: ['query'],
      },
    },
  },
]

export async function executeToolCall(toolCall, { retrieve, buildContextPrompt }) {
  const { name, arguments: args } = toolCall.function
  const parsed = typeof args === 'string' ? JSON.parse(args) : args

  switch (name) {
    case 'web_search': {
      try {
        const res = await fetch(`${API_BASE}/api/web_search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: parsed.query,
            max_results: parsed.max_results || 5,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          return `Web search error: ${err.detail || res.status}`
        }
        const data = await res.json()
        const results = data.results || []
        if (results.length === 0) return 'No web search results found.'
        return results
          .map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${(r.content || '').slice(0, 500)}`)
          .join('\n\n')
      } catch (err) {
        return `Web search failed: ${err.message}`
      }
    }

    case 'retrieve_knowledge': {
      const ctx = await retrieve(parsed.query, { k: 3 })
      if (!ctx.contexts?.length) return 'No relevant knowledge found.'
      return ctx.contexts
        .map((c, i) => `Source ${i + 1}: ${c.title || 'Knowledge'}\n${(c.content || '').slice(0, 600)}`)
        .join('\n\n---\n\n')
    }

    default:
      return `Unknown tool: ${name}`
  }
}
