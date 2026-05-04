// Vector Retrieval Service: uses pre-built TF-IDF index for semantic KB search
// Works alongside kbService.js mapping-based retrieval

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const INDEX_FILE = process.env.NODE_ENV === 'production'
  ? '/home/ubuntu/woying-ai/backend/data/kb-index.json'
  : join(__dirname, '../../data/kb-index.json')

// Lazy-loaded index
let index = null
let chunks = null

function loadIndex() {
  if (index) return true
  try {
    if (!existsSync(INDEX_FILE)) {
      return false
    }
    const raw = JSON.parse(readFileSync(INDEX_FILE, 'utf-8'))

    // Reconstruct sparse vectors from serialized format
    const vectors = raw.vectors.map(v => {
      const map = new Map()
      for (const [token, val] of v) {
        map.set(token, val)
      }
      return map
    })

    const idf = new Map()
    for (const [token, val] of raw.idf) {
      idf.set(token, val)
    }

    index = { vectors, idf, N: raw.N }
    chunks = raw.chunks
    return true
  } catch {
    return false
  }
}

// Simple Chinese tokenizer (character bi-grams, same as build script)
function tokenize(text) {
  const cleaned = text.replace(/[#*\n\r\t_\[\]()`~>|]/g, ' ').replace(/\s+/g, ' ').trim()
  const tokens = []
  for (let i = 0; i < cleaned.length - 1; i++) {
    const bigram = cleaned.substring(i, i + 2)
    if (bigram.trim().length === 2) {
      tokens.push(bigram)
    }
  }
  return tokens
}

// Cosine similarity between sparse vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (const [token, val] of vecA) {
    normA += val * val
    if (vecB.has(token)) {
      dotProduct += val * vecB.get(token)
    }
  }
  for (const [, val] of vecB) {
    normB += val * val
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dotProduct / denom : 0
}

/**
 * Search KB index for relevant chunks.
 *
 * @param {string} query - Search query
 * @param {object} options
 * @param {number} [options.topK=8] - Number of results
 * @param {string[]} [options.pathFilter] - Only search in these paths (from kb-mapping)
 * @param {string} [options.memberLevel] - Filter by member level tags
 * @param {string} [options.industry] - Filter by industry
 * @returns {Array<{ text: string, heading: string, path: string, score: number, metadata: object }>}
 */
export function vectorSearch(query, options = {}) {
  if (!loadIndex()) {
    return []
  }

  const { topK = 8, pathFilter = null, industry = null } = options

  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []

  // Build query vector
  const queryTF = new Map()
  for (const token of queryTokens) {
    queryTF.set(token, (queryTF.get(token) || 0) + 1)
  }
  const total = queryTokens.length
  const queryVec = new Map()
  for (const [token, count] of queryTF) {
    const normTf = count / total
    const idfVal = index.idf.get(token) || 0
    queryVec.set(token, normTf * idfVal)
  }

  // Score all chunks (with optional filtering)
  const scores = []
  for (let i = 0; i < index.vectors.length; i++) {
    const chunk = chunks[i]

    // Apply path filter
    if (pathFilter && pathFilter.length > 0) {
      const matchesPath = pathFilter.some(p => chunk.path.includes(p))
      if (!matchesPath) continue
    }

    // Apply industry filter
    if (industry && chunk.metadata && chunk.metadata.industry) {
      if (chunk.metadata.industry !== industry) continue
    }

    const score = cosineSimilarity(queryVec, index.vectors[i])
    if (score > 0) {
      scores.push({
        text: chunk.text,
        heading: chunk.heading,
        path: chunk.path,
        score,
        metadata: chunk.metadata
      })
    }
  }

  // Sort and return top-K
  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, topK)
}

/**
 * Check if index is available.
 */
export function isIndexAvailable() {
  return loadIndex()
}

/**
 * Get index stats.
 */
export function getIndexStats() {
  if (!loadIndex()) {
    return { available: false }
  }
  return {
    available: true,
    totalChunks: chunks.length,
    vocabSize: index.idf.size
  }
}
