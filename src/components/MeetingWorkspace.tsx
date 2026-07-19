import { useEffect, useRef, useState } from 'react'
import { CalendarDays, CheckCircle2, ClipboardList, Download, FileAudio, FileText, Save, Sparkles, Upload } from 'lucide-react'
import { demoTranscript } from '../data/demoData'
import { aiService } from '../services/aiService'
import type { MeetingResult } from '../types'
import { downloadText, exportMeetingDocx, meetingMarkdown } from '../utils/export'
import { exportCustomMeetingPptx, type MeetingPptOptions, type MeetingPptSlide } from '../utils/meetingPptExport'
import { saveDocument, saveDraft, useDraft } from '../utils/storage'
import { Button, EmptyState, Field, MockBadge, PageHeader, PrivacyNote } from './Common'

const MAX_AUDIO_SIZE = 100 * 1024 * 1024
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/wave']

type UploadState = { name: string; size: number; progress: number; status: 'uploading' | 'transcribing' | 'done' }
const defaultPptSlides: MeetingPptSlide[] = [
  { id: 'cover', type: 'cover', title: '會議紀錄' },
  { id: 'summary', type: 'summary', title: '會議摘要' },
  { id: 'decisions', type: 'decisions', title: '重要決議' },
  { id: 'tasks', type: 'tasks', title: '後續任務' },
  { id: 'closing', type: 'closing', title: '結語' },
]

export function MeetingWorkspace({ notify }: { notify: (message: string) => void }) {
  const [transcript, setTranscript] = useState(() => useDraft('meeting-transcript', ''))
  const [result, setResult] = useState<MeetingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [audio, setAudio] = useState<UploadState | null>(null)
  const [pptOpen, setPptOpen] = useState(false)
  const [pptSlides, setPptSlides] = useState<MeetingPptSlide[]>(defaultPptSlides)
  const [pptOptions, setPptOptions] = useState<Omit<MeetingPptOptions, 'slides'>>({ template: '企業正式', ratio: '16:9', primaryColor: '#168C8C' })
  const audioInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => saveDraft('meeting-transcript', transcript), [transcript])
  useEffect(() => { if (result) setPptSlides(defaultPptSlides.map((slide) => slide.type === 'cover' ? { ...slide, title: result.title } : slide)) }, [result])

  const movePptSlide = (index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= pptSlides.length) return
    const copy = [...pptSlides]; [copy[index], copy[next]] = [copy[next], copy[index]]; setPptSlides(copy)
  }

  const generate = async (source = transcript) => {
    if (!source.trim()) return notify('請先輸入會議逐字稿')
    setLoading(true)
    try { setResult(await aiService.generateMeeting(source)); notify('會議內容已整理完成') }
    finally { setLoading(false) }
  }

  const handleAudioUpload = (file?: File) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!AUDIO_TYPES.includes(file.type) && !['mp3', 'm4a', 'wav'].includes(extension || '')) return notify('請上傳 MP3、M4A 或 WAV 音訊檔')
    if (file.size > MAX_AUDIO_SIZE) return notify('音訊檔案不可超過 100MB')

    setAudio({ name: file.name, size: file.size, progress: 8, status: 'uploading' })
    window.setTimeout(() => {
      setAudio((current) => current ? { ...current, progress: 65, status: 'transcribing' } : current)
      window.setTimeout(async () => {
        const generatedTranscript = `錄音檔案：${file.name}\n\n（轉錄內容已完成，請確認內容後再儲存。）`
        setTranscript(generatedTranscript)
        setAudio((current) => current ? { ...current, progress: 100, status: 'done' } : current)
        await generate(generatedTranscript)
      }, 900)
    }, 650)
  }

  const save = () => {
    if (!result) return
    saveDocument({ type: '會議紀錄', title: result.title, summary: result.summary, content: result, source: 'meeting', tags: ['會議', '待辦'] })
    notify('會議紀錄已儲存至文件中心')
  }

  return <>
    <PageHeader eyebrow="MEETING NOTES" title="AI 會議紀錄整理" description="貼上逐字稿或上傳錄音檔，自動整理摘要、決議、負責人與截止日。" actions={<MockBadge />} />
    <div className="workspace-grid">
      <section className="panel input-panel">
        <div className="panel-heading"><div><span className="step-label">輸入</span><h2>會議逐字稿</h2></div><div className="meeting-input-actions"><Button variant="ghost" onClick={() => setTranscript(demoTranscript)}>載入示範</Button><button className="icon-button" title="新增錄音檔" aria-label="新增錄音檔" onClick={() => audioInputRef.current?.click()}><Upload size={17} /></button><input ref={audioInputRef} type="file" hidden accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav" onChange={(event) => { handleAudioUpload(event.target.files?.[0]); event.currentTarget.value = '' }} /></div></div>
        <Field label="會議逐字稿" hint={`目前 ${transcript.length.toLocaleString()} 字`}>
          <textarea className="large-textarea" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="貼上會議逐字稿，或點擊右上角按鈕新增錄音檔…" />
        </Field>
        {audio && <div className="audio-upload-status"><div className="audio-upload-header"><FileAudio size={17} /><div><strong>{audio.name}</strong><span>{(audio.size / 1024 / 1024).toFixed(1)}MB · {audio.status === 'uploading' ? '上傳中' : audio.status === 'transcribing' ? '轉錄中' : '轉錄完成'}</span></div><span className="audio-progress-value">{audio.progress}%</span></div><div className="audio-progress"><span style={{ width: `${audio.progress}%` }} /></div></div>}
        <div className="panel-footer"><span className="autosave-note">草稿已自動儲存在本機</span><Button loading={loading} icon={<Sparkles size={16} />} onClick={() => generate()}>整理會議內容</Button></div>
      </section>
      <section className="panel output-panel">
        <div className="panel-heading"><div><span className="step-label">輸出</span><h2>結構化會議紀錄</h2></div></div>
        {!result ? <EmptyState icon={<ClipboardList size={25} />} title="等待整理會議內容" description="AI 將在這裡整理摘要、決議事項與待辦清單。" /> : <div className="result-content"><div className="result-title-row"><div><h3>{result.title}</h3><span><CalendarDays size={14} /> {result.date}</span></div><span className="success-chip"><CheckCircle2 size={14} /> 已完成</span></div><div className="summary-box"><p className="result-label">會議摘要</p><p>{result.summary}</p></div><div className="result-block"><p className="result-label">決議事項</p><ul className="check-list">{result.decisions.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}</ul></div><div className="result-block"><p className="result-label">後續任務</p><div className="table-wrap"><table><thead><tr><th>任務</th><th>負責人</th><th>截止日</th><th>狀態</th></tr></thead><tbody>{result.actionItems.map((item) => <tr key={item.task}><td>{item.task}</td><td>{item.owner}</td><td>{item.dueDate}</td><td><span className="status-pending">{item.status}</span></td></tr>)}</tbody></table></div></div><div className="result-actions"><Button variant="secondary" icon={<Download size={16} />} onClick={() => exportMeetingDocx(result)}>匯出 Word</Button><Button variant="secondary" icon={<FileText size={16} />} onClick={() => setPptOpen(true)}>匯出 PowerPoint</Button><Button icon={<Save size={16} />} onClick={save}>儲存至文件中心</Button></div></div>}
      </section>
    </div>
    {pptOpen && result && <div className="ppt-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPptOpen(false)}><section className="ppt-modal" role="dialog" aria-modal="true" aria-labelledby="ppt-title"><div className="ppt-modal-header"><div><span className="step-label">簡報設定</span><h2 id="ppt-title">自訂會議簡報</h2></div><button className="modal-close" onClick={() => setPptOpen(false)} aria-label="關閉">×</button></div><div className="ppt-settings-grid"><label>模板<select value={pptOptions.template} onChange={(event) => setPptOptions({ ...pptOptions, template: event.target.value as MeetingPptOptions['template'] })}><option>企業正式</option><option>極簡專業</option><option>專案報告</option></select></label><label>比例<select value={pptOptions.ratio} onChange={(event) => setPptOptions({ ...pptOptions, ratio: event.target.value as MeetingPptOptions['ratio'] })}><option>16:9</option><option>4:3</option></select></label><label>主色<input type="color" value={pptOptions.primaryColor} onChange={(event) => setPptOptions({ ...pptOptions, primaryColor: event.target.value })} /></label></div><p className="ppt-helper">拖曳排序可先用上下按鈕調整；生成後仍可回來修改頁面標題。</p><div className="ppt-slide-list">{pptSlides.map((slide, index) => <div className="ppt-slide-row" key={slide.id}><span className="ppt-slide-number">{index + 1}</span><input value={slide.title} onChange={(event) => setPptSlides(pptSlides.map((item) => item.id === slide.id ? { ...item, title: event.target.value } : item))} /><button onClick={() => movePptSlide(index, -1)} disabled={index === 0} aria-label="上移">↑</button><button onClick={() => movePptSlide(index, 1)} disabled={index === pptSlides.length - 1} aria-label="下移">↓</button><button onClick={() => setPptSlides(pptSlides.filter((item) => item.id !== slide.id))} aria-label="刪除">×</button></div>)}</div><div className="ppt-modal-actions"><Button variant="ghost" onClick={() => setPptOpen(false)}>取消</Button><Button onClick={async () => { await exportCustomMeetingPptx(result, { ...pptOptions, slides: pptSlides }); notify('自訂簡報已匯出'); setPptOpen(false) }}>匯出 PowerPoint</Button></div></section></div>}
    <PrivacyNote />
  </>
}
