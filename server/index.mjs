import { createServer } from 'node:http'

const port = Number(process.env.PORT || 8787)
const apiKey = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash'

const schemas = {
  meeting: '{"title":"string","date":"YYYY-MM-DD","summary":"string","decisions":["string"],"actionItems":[{"task":"string","owner":"string","collaborators":["string"],"dueDate":"string","status":"待處理|進行中|已完成"}]}',
  mail: '{"subject":"string","greeting":"string","paragraphs":["string"],"callToAction":"string","closing":"string"}',
  sop: '{"title":"string","purpose":"string","scope":"string","roles":["string"],"steps":[{"title":"string","detail":"string","role":"string"}],"cautions":["string"],"checklist":["string"]}',
  excel: '{"date":"header or empty","department":"header or empty","category":"header or empty","item":"header or empty","amount":"header or empty"}',
  excelCategories: '{"categories":[{"row":0,"category":"string","confidence":0.0}]}',
}

function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(body)) }
function prompt(task, input) {
  const instruction = task === 'meeting'
    ? '分析會議逐字稿。務必把每個明確任務拆成獨立 actionItems，從句子中找出負責人、協作者與期限；不要把整段對話當成任務。每個決議事項的文字必須包含「負責人：姓名」；每個 actionItem 必須填入具體 task、owner、dueDate、status，不能使用待確認，除非原文真的沒有提到。請將「Alex 負責資料庫 ETL」解析成 task=資料庫 ETL、owner=Alex。'
    : task === 'excelCategories'
      ? '根據每筆資料的支出說明與執行單位推測分類。若無法判斷請使用「待分類」，並提供 0 到 1 的信心分數。'
      : task === 'excel'
      ? '根據欄位名稱與前 10 筆資料，推測欄位對應。只能回傳 JSON，不要創造不存在的欄位。'
      : task === 'sop'
        ? '將自由格式流程描述整理成角色、步驟、注意事項與檢核表。'
        : '產生行政 Email 或公文內容，維持清楚、正式且可直接使用。'
  return `${instruction}\n請嚴格依照這個 JSON schema 回傳，不要 Markdown：${schemas[task]}\n\n輸入：\n${JSON.stringify(input)}`
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  if (req.method !== 'POST' || req.url !== '/api/gemini') return json(res, 404, { error: 'Not found' })
  if (!apiKey) return json(res, 503, { error: 'GEMINI_API_KEY is not configured' })
  let body = ''
  for await (const chunk of req) body += chunk
  try {
    const { task, input } = JSON.parse(body)
    if (!schemas[task]) return json(res, 400, { error: 'Unsupported task' })
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt(task, input) }] }], generationConfig: { responseMimeType: 'application/json' } }),
    })
    const data = await response.json()
    if (!response.ok) return json(res, response.status, { error: data.error?.message || 'Gemini request failed' })
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    return json(res, 200, JSON.parse(text.replace(/^```json\s*|\s*```$/g, '')))
  } catch (error) { return json(res, 500, { error: error instanceof Error ? error.message : 'Invalid request' }) }
})

server.listen(port, () => console.log(`AdminFlow Gemini proxy listening on http://localhost:${port}`))
