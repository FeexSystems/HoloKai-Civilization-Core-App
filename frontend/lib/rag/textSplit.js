/**
 * Lightweight recursive character splitter (no LangChain dependency).
 * Chunk size tuned for nomic-embed-text + scholarly knowledge passages.
 */

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', '; ', ', ', ' ', '']

/**
 * @param {string} text
 * @param {{ chunkSize?: number, chunkOverlap?: number, separators?: string[] }} [options]
 * @returns {string[]}
 */
export function splitText(text, options = {}) {
  const chunkSize = options.chunkSize ?? 800
  const chunkOverlap = options.chunkOverlap ?? 150
  const separators = options.separators ?? DEFAULT_SEPARATORS

  const cleaned = (text || '').replace(/\r\n/g, '\n').trim()
  if (!cleaned) return []
  if (cleaned.length <= chunkSize) return [cleaned]

  const chunks = []
  const pieces = recursiveSplit(cleaned, separators, chunkSize)

  let buffer = ''
  for (const piece of pieces) {
    const candidate = buffer ? `${buffer}${piece}` : piece
    if (candidate.length <= chunkSize) {
      buffer = candidate
      continue
    }
    if (buffer) {
      chunks.push(buffer.trim())
      const overlap = buffer.slice(-chunkOverlap)
      buffer = `${overlap}${piece}`.trim()
      if (buffer.length > chunkSize) {
        // hard-cut oversized residual
        let start = 0
        while (start < buffer.length) {
          const end = Math.min(start + chunkSize, buffer.length)
          chunks.push(buffer.slice(start, end).trim())
          start = Math.max(end - chunkOverlap, end)
        }
        buffer = ''
      }
    } else {
      let start = 0
      while (start < piece.length) {
        const end = Math.min(start + chunkSize, piece.length)
        chunks.push(piece.slice(start, end).trim())
        start = Math.max(end - chunkOverlap, end)
      }
      buffer = ''
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim())

  return chunks.filter(Boolean)
}

function recursiveSplit(text, separators, chunkSize) {
  if (!separators.length) return [text]
  const [sep, ...rest] = separators

  if (sep === '') {
    const out = []
    for (let i = 0; i < text.length; i += chunkSize) {
      out.push(text.slice(i, i + chunkSize))
    }
    return out
  }

  const parts = text.split(sep)
  const rebuilt = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const withSep = i < parts.length - 1 ? `${part}${sep}` : part
    if (!withSep) continue
    if (withSep.length > chunkSize && rest.length) {
      rebuilt.push(...recursiveSplit(withSep, rest, chunkSize))
    } else {
      rebuilt.push(withSep)
    }
  }
  return rebuilt
}
