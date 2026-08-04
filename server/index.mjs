import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const port = Number(process.env.PORT || 8787)
const apiKey = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const distDirectory = resolve(process.cwd(), 'dist')
const MAX_AUDIO_SIZE = 100 * 1024 * 1024
const MAX_JSON_SIZE = 2 * 1024 * 1024
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 60 * 1000

const schemas = {
  meeting: '{"title":"string","date":"YYYY-MM-DD HH:mm","summary":"string","decisions":["string"],"actionItems":[{"task":"string","owner":"string","collaborators":["string"],"dueDate":"string","status":"待處理|進行中|已完成"}]}',
  mail: '{"subject":"string","greeting":"string","paragraphs":["string"],"callToAction":"string","closing":"string"}',
  sop: '{"title":"string","purpose":"string","scope":"string","roles":["string"],"steps":[{"title":"string","detail":"string","role":"string"}],"cautions":["string"],"checklist":["string"]}',
  excel: '{"date":"header or empty","department":"header or empty","category":"header or empty","item":"header or empty","amount":"header or empty"}',
  excelCategories: '{"categories":[{"row":0,"category":"string","confidence":0.0}]}',
}

const AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/flac',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
])

const requestsByIp = new Map()
const STATIC_CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-File-Name, X-Local-Date-Time',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

async function serveStatic(res, pathname) {
  const requestedPath = decodeURIComponent(pathname)
  const relativePath = requestedPath === '/' ? 'index.html' : requestedPath.replace(/^\/+/, '')
  const candidate = resolve(distDirectory, relativePath)
  if (candidate !== distDirectory && !candidate.startsWith(`${distDirectory}${sep}`)) {
    return json(res, 403, { error: 'Forbidden' })
  }

  let filePath = candidate
  try {
    if ((await stat(filePath)).isDirectory()) filePath = resolve(filePath, 'index.html')
  } catch {
    filePath = resolve(distDirectory, 'index.html')
  }

  try {
    const content = await readFile(filePath)
    const extension = extname(filePath).toLowerCase()
    res.writeHead(200, {
      'Content-Type': STATIC_CONTENT_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    })
    res.end(content)
  } catch {
    json(res, 404, { error: 'Not found' })
  }
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim()
    || req.socket.remoteAddress
    || 'unknown'
}

function isRateLimited(req) {
  const now = Date.now()
  const ip = clientIp(req)
  const recent = (requestsByIp.get(ip) || []).filter((timestamp) => now - timestamp < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    requestsByIp.set(ip, recent)
    return true
  }
  recent.push(now)
  requestsByIp.set(ip, recent)
  return false
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let tooLarge = false

    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        tooLarge = true
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => tooLarge
      ? reject(Object.assign(new Error('Payload too large'), { status: 413 }))
      : resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function prompt(task, input) {
  const instruction = task === 'meeting'
    ? '分析會議逐字稿。date 一律使用 YYYY-MM-DD HH:mm；逐字稿明確提到會議日期或時間時優先採用，未提到的日期或時間部分使用輸入的 localDateTime 補足。務必把每個明確任務拆成獨立 actionItems，從句子中找出負責人、協作者與期限；不要把整段對話當成任務。每個決議事項的文字必須包含「負責人：姓名」；每個 actionItem 必須填入具體 task、owner、dueDate、status，不能使用待確認，除非原文真的沒有提到。請將「Alex 負責資料庫 ETL」解析成 task=資料庫 ETL、owner=Alex。'
    : task === 'excelCategories'
      ? '根據每筆資料的支出說明與執行單位推測分類。若無法判斷請使用「待分類」，並提供 0 到 1 的信心分數。'
      : task === 'excel'
        ? '根據欄位名稱與前 10 筆資料，推測欄位對應。只能回傳 JSON，不要創造不存在的欄位。'
        : task === 'sop'
          ? '將自由格式流程描述整理成角色、步驟、注意事項與檢核表。'
          : '產生行政 Email 或公文內容，維持清楚、正式且可直接使用。'
  return `${instruction}\n請嚴格依照這個 JSON schema 回傳，不要 Markdown：${schemas[task]}\n\n輸入：\n${JSON.stringify(input)}`
}

function normalizeMeetingDate(output, localDateTime) {
  const fallback = /^20\d{2}-\d{2}-\d{2} \d{2}:\d{2}$/.test(localDateTime || '') ? localDateTime : ''
  const match = String(output?.date || '').match(/^(20\d{2})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/)
  if (!match) return { ...output, date: fallback }
  const time = match[4] && match[5] ? `${match[4]}:${match[5]}` : fallback.slice(11, 16)
  return { ...output, date: `${match[1]}-${match[2]}-${match[3]} ${time}` }
}

function parseGeminiJson(data) {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''))
}

async function geminiJsonRequest(parts) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  const data = await response.json()
  if (!response.ok) throw Object.assign(new Error(data.error?.message || 'Gemini request failed'), { status: response.status })
  return parseGeminiJson(data)
}

async function uploadGeminiFile(audio, mimeType, fileName) {
  const start = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(audio.length),
      'X-Goog-Upload-Header-Content-Type': mimeType,
    },
    body: JSON.stringify({ file: { display_name: fileName } }),
  })
  if (!start.ok) {
    const data = await start.json().catch(() => ({}))
    throw Object.assign(new Error(data.error?.message || '無法建立 Gemini 檔案上傳工作'), { status: start.status })
  }

  const uploadUrl = start.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('Gemini 未提供檔案上傳網址')

  const upload = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(audio.length),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: audio,
  })
  const data = await upload.json()
  if (!upload.ok) throw Object.assign(new Error(data.error?.message || 'Gemini 檔案上傳失敗'), { status: upload.status })
  return data.file
}

async function waitUntilActive(file) {
  let current = file
  for (let attempt = 0; attempt < 30 && current.state === 'PROCESSING'; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${current.name}`, {
      headers: { 'x-goog-api-key': apiKey },
    })
    const data = await response.json()
    if (!response.ok) throw Object.assign(new Error(data.error?.message || '無法確認錄音處理狀態'), { status: response.status })
    current = data
  }
  if (current.state !== 'ACTIVE') throw new Error(`錄音檔處理失敗（狀態：${current.state || 'UNKNOWN'}）`)
  return current
}

async function deleteGeminiFile(fileName) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}`, {
    method: 'DELETE',
    headers: { 'x-goog-api-key': apiKey },
  })
  if (!response.ok && response.status !== 404) throw new Error('Gemini 暫存錄音檔刪除失敗')
}

async function transcribeAndStructure(audio, mimeType, fileName, localDateTime) {
  let uploadedFile
  let output
  let processError
  let deleteError

  try {
    uploadedFile = await uploadGeminiFile(audio, mimeType, fileName)
    const activeFile = await waitUntilActive(uploadedFile)
    const audioSchema = `{"transcript":"string","meeting":${schemas.meeting}}`
    const instruction = [
      '請先逐字轉錄這段會議錄音，再整理為結構化會議紀錄。',
      '逐字稿請保留可辨識的說話者、原意、專有名詞、數字與日期，不要自行省略任務內容。',
      `meeting.date 一律使用 YYYY-MM-DD HH:mm；錄音明確提到會議日期或時間時優先，未提到的部分使用本機處理時間 ${localDateTime} 補足。`,
      '每個明確任務都要拆成獨立 actionItems，owner、collaborators、dueDate、status 必須依錄音填寫；錄音未提到才可填「待確認」。',
      '每個決議事項必須是清楚的決策結果，並在文字中包含「負責人：姓名」。',
      `請嚴格依照這個 JSON schema 回傳，不要 Markdown：${audioSchema}`,
    ].join('\n')
    output = await geminiJsonRequest([
      { text: instruction },
      { fileData: { mimeType: activeFile.mimeType || mimeType, fileUri: activeFile.uri } },
    ])
  } catch (error) {
    processError = error
  } finally {
    if (uploadedFile?.name) {
      try {
        await deleteGeminiFile(uploadedFile.name)
      } catch (error) {
        deleteError = error
      }
    }
  }

  if (deleteError) throw deleteError
  if (processError) throw processError
  return { ...output, meeting: normalizeMeetingDate(output.meeting, localDateTime) }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  const pathname = new URL(req.url || '/', 'http://localhost').pathname
  if (req.method === 'GET' && pathname === '/health') return json(res, 200, { status: 'ok' })
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(res, pathname)
  if (req.method !== 'POST' || !['/api/gemini', '/api/gemini/transcribe'].includes(pathname)) {
    return json(res, 404, { error: 'Not found' })
  }
  if (!apiKey) return json(res, 503, { error: 'GEMINI_API_KEY is not configured' })
  if (isRateLimited(req)) return json(res, 429, { error: '操作次數已達上限，請一小時後再試' })

  try {
    if (pathname === '/api/gemini/transcribe') {
      const mimeType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase()
      const encodedName = String(req.headers['x-file-name'] || 'meeting-audio')
      const fileName = decodeURIComponent(encodedName)
      const localDateTime = String(req.headers['x-local-date-time'] || '')
      if (!/^20\d{2}-\d{2}-\d{2} \d{2}:\d{2}$/.test(localDateTime)) return json(res, 400, { error: '本機時間格式不正確' })
      if (!AUDIO_MIME_TYPES.has(mimeType)) return json(res, 415, { error: '不支援此錄音格式' })
      const audio = await readBody(req, MAX_AUDIO_SIZE)
      if (!audio.length) return json(res, 400, { error: '錄音檔案是空的' })
      return json(res, 200, await transcribeAndStructure(audio, mimeType, fileName, localDateTime))
    }

    const rawBody = await readBody(req, MAX_JSON_SIZE)
    const { task, input } = JSON.parse(rawBody.toString('utf8'))
    if (!schemas[task]) return json(res, 400, { error: 'Unsupported task' })
    const output = await geminiJsonRequest([{ text: prompt(task, input) }])
    return json(res, 200, task === 'meeting' ? normalizeMeetingDate(output, input?.localDateTime) : output)
  } catch (error) {
    return json(res, error?.status || 500, { error: error instanceof Error ? error.message : 'Invalid request' })
  }
})

server.listen(port, '0.0.0.0', () => console.log(`AdminFlow Gemini proxy listening on http://localhost:${port}`))
