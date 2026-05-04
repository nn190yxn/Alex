// Build KB Vector Index: chunks KB markdown files and builds TF-IDF index
// Usage: node scripts/build-kb-index.js
// Output: backend/data/kb-index.json

import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const KB_ROOT = join(__dirname, '../../knowledge-base')
const INDEX_DIR = join(__dirname, '../data')
const INDEX_FILE = join(INDEX_DIR, 'kb-index.json')

// Chunking config
const CHUNK_MIN_CHARS = parseInt(process.env.KB_CHUNK_MIN || '300', 10)
const CHUNK_MAX_CHARS = parseInt(process.env.KB_CHUNK_MAX || '600', 10)
const CHUNK_OVERLAP = parseInt(process.env.KB_CHUNK_OVERLAP || '80', 10)

// TF-IDF config
const TOP_K = parseInt(process.env.KB_VECTOR_TOPK || '8', 10)

// Simple Chinese text tokenizer using character bi-grams
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

// Split content into chunks by paragraph boundaries
function chunkContent(content, filePath, metadata = {}) {
  if (!content || content.length < CHUNK_MIN_CHARS) return []

  const lines = content.split('\n')
  const chunks = []
  let currentChunk = ''
  let currentHeading = ''

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      // If current chunk is big enough, save it
      if (currentChunk.length >= CHUNK_MIN_CHARS) {
        chunks.push({
          text: currentChunk.trim(),
          heading: currentHeading,
          path: filePath,
          metadata: { ...metadata, section: currentHeading },
          tokens: tokenize(currentChunk)
        })
      }
      currentHeading = headingMatch[2].trim()
      currentChunk = line + '\n'
    } else {
      currentChunk += line + '\n'
    }

    // If chunk exceeds max, split at paragraph boundary
    if (currentChunk.length >= CHUNK_MAX_CHARS) {
      const paragraphs = currentChunk.split('\n\n')
      if (paragraphs.length > 1) {
        // Save first N paragraphs as a chunk
        let saved = ''
        let remaining = ''
        let found = false
        for (const p of paragraphs) {
          if (!found && (saved + p).length >= CHUNK_MIN_CHARS) {
            found = true
            remaining = p
          } else if (found) {
            remaining += (remaining ? '\n\n' : '') + p
          } else {
            saved += (saved ? '\n\n' : '') + p
          }
        }
        if (saved.length >= CHUNK_MIN_CHARS) {
          chunks.push({
            text: saved.trim(),
            heading: currentHeading,
            path: filePath,
            metadata: { ...metadata, section: currentHeading },
            tokens: tokenize(saved)
          })
        }
        currentChunk = remaining || ''
      } else {
        // Single paragraph exceeds max, just save it
        chunks.push({
          text: currentChunk.trim().substring(0, CHUNK_MAX_CHARS),
          heading: currentHeading,
          path: filePath,
          metadata: { ...metadata, section: currentHeading },
          tokens: tokenize(currentChunk.substring(0, CHUNK_MAX_CHARS))
        })
        currentChunk = ''
      }
    }
  }

  // Save remaining chunk
  if (currentChunk.trim().length >= CHUNK_MIN_CHARS) {
    chunks.push({
      text: currentChunk.trim(),
      heading: currentHeading,
      path: filePath,
      metadata: { ...metadata, section: currentHeading },
      tokens: tokenize(currentChunk)
    })
  }

  // If no chunks were created, create one from the first part
  if (chunks.length === 0 && content.length > CHUNK_MIN_CHARS) {
    chunks.push({
      text: content.trim().substring(0, CHUNK_MAX_CHARS),
      heading: '',
      path: filePath,
      metadata,
      tokens: tokenize(content.substring(0, CHUNK_MAX_CHARS))
    })
  }

  return chunks
}

// Walk KB directory and collect all .md files
function collectMarkdownFiles(root) {
  const files = []
  function walk(dir) {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (entry.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  }
  walk(root)
  return files
}

// Build TF-IDF index
function buildTFIDFIndex(chunks) {
  const N = chunks.length
  if (N === 0) return null

  // Document frequency
  const df = new Map()
  for (const chunk of chunks) {
    const uniqueTokens = new Set(chunk.tokens)
    for (const token of uniqueTokens) {
      df.set(token, (df.get(token) || 0) + 1)
    }
  }

  // Compute IDF
  const idf = new Map()
  for (const [token, count] of df) {
    idf.set(token, Math.log(N / count + 1))
  }

  // Compute TF-IDF vectors (sparse representation)
  const vectors = chunks.map(chunk => {
    const tf = new Map()
    for (const token of chunk.tokens) {
      tf.set(token, (tf.get(token) || 0) + 1)
    }
    // Normalize TF
    const total = chunk.tokens.length || 1
    const tfidf = new Map()
    for (const [token, count] of tf) {
      const normTf = count / total
      const idfVal = idf.get(token) || 0
      tfidf.set(token, normTf * idfVal)
    }
    return tfidf
  })

  return { vectors, idf, N }
}

// Cosine similarity between two sparse vectors
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

// Search: return top-K most relevant chunks
function search(index, query, k = TOP_K) {
  if (!index || !index.vectors) return []

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

  // Score all chunks
  const scores = index.vectors.map((vec, i) => ({
    index: i,
    score: cosineSimilarity(queryVec, vec)
  }))

  // Sort and return top-K
  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, k)
}

// Main build process
function buildIndex() {
  console.log('KB Index Builder starting...')
  console.log(`KB Root: ${KB_ROOT}`)
  console.log(`Index File: ${INDEX_FILE}`)

  if (!existsSync(KB_ROOT)) {
    console.error(`ERROR: KB root directory not found: ${KB_ROOT}`)
    process.exit(1)
  }

  // Collect markdown files
  const mdFiles = collectMarkdownFiles(KB_ROOT)
  console.log(`Found ${mdFiles.length} markdown files`)

  // Chunk all files
  const allChunks = []
  for (const filePath of mdFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const relPath = relative(KB_ROOT, filePath)

    // Extract metadata from path
    const pathParts = relPath.split('/')
    const category = pathParts[0] || ''
    const industry = pathParts[1] || ''

    const chunks = chunkContent(content, relPath, { category, industry })
    allChunks.push(...chunks)
  }
  console.log(`Generated ${allChunks.length} chunks`)

  // Build TF-IDF index
  const index = buildTFIDFIndex(allChunks)
  if (!index) {
    console.error('ERROR: Failed to build index')
    process.exit(1)
  }

  // Prepare serializable index
  // Convert Maps to arrays of [key, value] pairs
  const serializableChunks = allChunks.map(c => ({
    text: c.text,
    heading: c.heading,
    path: c.path,
    metadata: c.metadata,
    // tokens are not needed for search (we use the index vectors)
    // but we keep them for debugging
    tokenCount: c.tokens.length
  }))

  // Convert sparse vectors to serializable format
  const serializableVectors = index.vectors.map(v => {
    const entries = []
    for (const [token, val] of v) {
      entries.push([token, val])
    }
    return entries
  })

  const idfEntries = []
  for (const [token, val] of index.idf) {
    idfEntries.push([token, val])
  }

  const serializableIndex = {
    version: '1.0.0',
    builtAt: new Date().toISOString(),
    config: {
      chunkMinChars: CHUNK_MIN_CHARS,
      chunkMaxChars: CHUNK_MAX_CHARS,
      chunkOverlap: CHUNK_OVERLAP,
      topK: TOP_K
    },
    stats: {
      totalFiles: mdFiles.length,
      totalChunks: allChunks.length,
      vocabSize: index.idf.size
    },
    chunks: serializableChunks,
    vectors: serializableVectors,
    idf: idfEntries,
    N: index.N
  }

  // Save index
  if (!existsSync(INDEX_DIR)) {
    mkdirSync(INDEX_DIR, { recursive: true })
  }
  writeFileSync(INDEX_FILE, JSON.stringify(serializableIndex), 'utf-8')

  const fileSizeKB = (writeFileSync(INDEX_FILE, JSON.stringify(serializableIndex), 'utf-8'),
    Math.round(statSync(INDEX_FILE).size / 1024))
  console.log(`Index saved: ${INDEX_FILE} (${fileSizeKB} KB)`)
  console.log(`Stats: ${serializableIndex.stats.totalFiles} files, ${serializableIndex.stats.totalChunks} chunks, ${serializableIndex.stats.vocabSize} vocabulary`)

  // Quick test search
  console.log('\n--- Quick Test Searches ---')
  const testQueries = ['节日营销', '门店诊断', '薪酬方案', '抖音运营']
  for (const q of testQueries) {
    const results = search(index, q, 3)
    console.log(`Query: "${q}"`)
    for (const r of results) {
      const chunk = allChunks[r.index]
      console.log(`  [${r.score.toFixed(4)}] ${chunk.path} - ${chunk.heading || '(no heading)'}`)
      console.log(`    ${chunk.text.substring(0, 80)}...`)
    }
    console.log()
  }

  console.log('KB Index build complete!')
}

buildIndex()
