import { useEffect, useRef, useState } from 'react'
import { CalendarDays, CheckCircle2, ClipboardList, Download, FileText, LoaderCircle, Save, Sparkles, Upload } from 'lucide-react'
import { demoTranscript } from '../data/demoData'
import { aiService } from '../services/aiService'
import { transcribeMeetingAudio } from '../services/geminiClient'
import type { MeetingResult } from '../types'
import { exportMeetingDocx } from '../utils/export'
import { formatLocalDateTime, normalizeMeetingDateTime } from '../utils/meetingTime'
import { saveDocument, saveDraft, useDraft } from '../utils/storage'
import { Button, EmptyState, Field, MockBadge, PageHeader, PrivacyNote } from './Common'

const MAX_AUDIO_SIZE = 100 * 1024 * 1024
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024
const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
}
const AUDIO_TYPES = new Set([
  'audio/aac',
  'audio/flac',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
])

type UploadState = {
  kind: 'audio' | 'document'
  name: string
  size: number
  status: 'processing' | 'reading' | 'done'
}

type AudioMeetingResponse = {
  transcript: string
  meeting: MeetingResult
}

export function MeetingWorkspace({ notify }: { notify: (message: string) => void }) {
  const [transcript, setTranscript] = useState(() => useDraft('meeting-transcript', ''))
  const [result, setResult] = useState<MeetingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [upload, setUpload] = useState<UploadState | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => saveDraft('meeting-transcript', transcript), [transcript])

  const generate = async (source = transcript) => {
    if (!source.trim()) return notify('請先輸入會議逐字稿')
    setLoading(true)
    try {
      const localDateTime = formatLocalDateTime()
      setResult(await aiService.generateMeeting(source, localDateTime))
      notify('會議內容已整理完成')
    }
    finally { setLoading(false) }
  }

  const handleAudioUpload = async (file?: File) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const mimeType = AUDIO_TYPES.has(file.type) ? file.type : AUDIO_MIME_BY_EXTENSION[extension]
    if (!mimeType) return notify('請上傳 MP3、WAV、M4A／AAC、OGG 或 FLAC 錄音檔')
    if (file.size > MAX_AUDIO_SIZE) return notify('音訊檔案不可超過 100MB')

    setLoading(true)
    setResult(null)
    setUpload({ kind: 'audio', name: file.name, size: file.size, status: 'processing' })
    try {
      const localDateTime = formatLocalDateTime()
      const generated = await transcribeMeetingAudio<AudioMeetingResponse>(file, mimeType, localDateTime)
      if (!generated.transcript?.trim() || !generated.meeting) throw new Error('Gemini 未回傳完整的轉錄結果')
      setTranscript(generated.transcript.trim())
      setResult({ ...generated.meeting, date: normalizeMeetingDateTime(generated.meeting.date, localDateTime) })
      notify('錄音已完成轉錄與會議整理')
    } catch (error) {
      notify(error instanceof Error ? `錄音處理失敗：${error.message}` : '錄音處理失敗，請稍後再試')
    } finally {
      setUpload(null)
      setLoading(false)
    }
  }

  const handleDocumentUpload = async (file: File, extension: string) => {
    if (file.size > MAX_DOCUMENT_SIZE) return notify('Word／文字檔案不可超過 20MB')
    setUpload({ kind: 'document', name: file.name, size: file.size, status: 'reading' })

    try {
      let rawText: string
      if (extension === 'txt') {
        rawText = await file.text()
      } else {
        const { default: mammoth } = await import('mammoth')
        rawText = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
      }
      const cleanedText = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
      if (!cleanedText) throw new Error('文件沒有可讀取的文字')

      setTranscript(cleanedText)
      setResult(null)
      setUpload({ kind: 'document', name: file.name, size: file.size, status: 'done' })
      notify(`已載入 ${file.name}，請確認內容後再整理`)
    } catch {
      setUpload(null)
      notify('無法讀取文件，請確認檔案是有效的 DOCX 或純文字檔')
    }
  }

  const handleFileUpload = async (file?: File) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    if (extension === 'doc') return notify('不支援舊版 DOC，請先在 Word 另存為 DOCX')
    if (extension === 'docx' || extension === 'txt') return handleDocumentUpload(file, extension)
    await handleAudioUpload(file)
  }

  const save = () => {
    if (!result) return
    saveDocument({ type: '會議紀錄', title: result.title, summary: result.summary, content: result, source: 'meeting', tags: ['會議', '待辦'] })
    notify('會議紀錄已儲存至文件中心')
  }

  return <>
    <PageHeader eyebrow="MEETING NOTES" title="AI 會議紀錄整理" description="貼上逐字稿、載入 Word／文字檔或上傳錄音檔，自動整理摘要、決議、負責人與截止日。" actions={<MockBadge />} />
    <div className="workspace-grid">
      <section className="panel input-panel">
        <div className="panel-heading"><div><span className="step-label">輸入</span><h2>會議逐字稿</h2></div><div className="meeting-input-actions"><Button variant="ghost" disabled={loading} onClick={() => setTranscript(demoTranscript)}>載入示範</Button><button className="icon-button" title="載入 Word、文字或錄音檔" aria-label="載入 Word、文字或錄音檔" disabled={loading} onClick={() => fileInputRef.current?.click()}>{loading && upload?.kind === 'audio' ? <LoaderCircle size={17} className="spin" /> : <Upload size={17} />}</button><input ref={fileInputRef} type="file" hidden disabled={loading} accept=".docx,.doc,.txt,.mp3,.m4a,.aac,.wav,.ogg,.flac,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/flac" onChange={(event) => { void handleFileUpload(event.target.files?.[0]); event.currentTarget.value = '' }} /></div></div>
        <Field label="會議逐字稿" hint={`目前 ${transcript.length.toLocaleString()} 字`}>
          <textarea className="large-textarea" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="貼上逐字稿，或點擊右上角載入 DOCX、TXT 或錄音檔…" />
        </Field>
        {upload?.kind === 'audio' && <div className="audio-processing-status"><LoaderCircle size={17} className="spin" /><strong>處理中</strong></div>}
        {upload?.kind === 'document' && <div className="audio-upload-status"><div className="audio-upload-header"><FileText size={17} /><div><strong>{upload.name}</strong><span>{(upload.size / 1024 / 1024).toFixed(1)}MB · {upload.status === 'reading' ? '讀取文件中' : '文字已載入'}</span></div></div></div>}
        <p className="audio-privacy-note">檔案將傳送到 Gemini 進行轉錄，完成後會立即刪除</p>
        <div className="panel-footer"><span className="autosave-note">草稿已自動儲存在本機</span><Button loading={loading} icon={<Sparkles size={16} />} onClick={() => generate()}>整理會議內容</Button></div>
      </section>
      <section className="panel output-panel">
        <div className="panel-heading"><div><span className="step-label">輸出</span><h2>結構化會議紀錄</h2></div></div>
        {!result ? <EmptyState icon={<ClipboardList size={25} />} title="等待整理會議內容" description="AI 將在這裡整理摘要、決議事項與待辦清單。" /> : <div className="result-content"><div className="result-title-row"><div><h3>{result.title}</h3><span><CalendarDays size={14} /> {result.date}</span></div><span className="success-chip"><CheckCircle2 size={14} /> 已完成</span></div><div className="summary-box"><p className="result-label">會議摘要</p><p>{result.summary}</p></div><div className="result-block"><p className="result-label">決議事項</p><ul className="check-list">{result.decisions.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}</ul></div><div className="result-block"><p className="result-label">後續任務</p><div className="table-wrap"><table><thead><tr><th>任務</th><th>負責人</th><th>截止日</th><th>狀態</th></tr></thead><tbody>{result.actionItems.map((item) => <tr key={item.task}><td>{item.task}</td><td>{item.owner}</td><td>{item.dueDate}</td><td><span className="status-pending">{item.status}</span></td></tr>)}</tbody></table></div></div><div className="result-actions"><Button variant="secondary" icon={<Download size={16} />} onClick={() => exportMeetingDocx(result)}>匯出 Word</Button><Button icon={<Save size={16} />} onClick={save}>儲存至文件中心</Button></div></div>}
      </section>
    </div>
    <PrivacyNote />
  </>
}
