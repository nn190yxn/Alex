import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = 5173

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json'
}

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0]
  if (!url.startsWith('/assets/')) url = '/index.html'
  
  let filePath = path.join(DIST, url)
  if (!fs.existsSync(filePath)) filePath = path.join(DIST, 'index.html')
  
  const ext = path.extname(filePath)
  const mime = MIME[ext] || 'application/octet-stream'
  
  try {
    const data = fs.readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': data.length })
    res.end(data)
  } catch (e) {
    res.writeHead(404)
    res.end('Not Found')
  }
})

server.listen(PORT, () => console.log(`Serving on port ${PORT}`))
