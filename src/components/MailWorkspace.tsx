import { useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, Mail, Save, Sparkles } from 'lucide-react'
import { aiService } from '../services/aiService'
import type { MailResult } from '../types'
import { saveDocument, saveDraft, useDraft } from '../utils/storage'
import { Button, EmptyState, Field, MockBadge, PageHeader, PrivacyNote } from './Common'

const initial = { context: '', audience: '全體同仁', purpose: '正式 Email', tone: '正式' }

export function MailWorkspace({ notify }: { notify: (message: string) => void }) {
  const [form, setForm] = useState(() => useDraft('mail', initial))
  const [result, setResult] = useState<MailResult | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => saveDraft('mail', form), [form])
  useEffect(() => {
    if (form.tone === '友善') setForm((current) => ({ ...current, tone: '正式' }))
    document.querySelectorAll('select').forEach((select) => {
      Array.from(select.options).find((option) => option.textContent === '友善')?.remove()
    })
  }, [form.tone])
  const text = useMemo(() => result ? [result.greeting, ...result.paragraphs, result.callToAction, result.closing].join('\n\n') : '', [result])

  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value })
  const generate = async () => {
    if (!form.context.trim()) return notify('請先輸入信件情境')
    setLoading(true)
    try { setResult(await aiService.generateMail(form)); notify('正式內容已產生') } finally { setLoading(false) }
  }
  const copy = async () => { await navigator.clipboard.writeText(`主旨：${result?.subject}\n\n${text}`); notify('信件已複製') }
  const openGmail = () => {
    if (!result) return
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(result.subject)}&body=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }
  const save = () => {
    if (!result) return
    saveDocument({ type: 'Email／公文', title: result.subject, summary: result.paragraphs[0], content: result, source: 'mail', tags: [form.purpose, form.tone] })
    notify('已儲存至文件中心')
  }

  return <>
    <PageHeader eyebrow="BUSINESS WRITING" title="Email／公文助手" description="依情境、用途與語氣，產生可直接使用的正式行政文字。" actions={<MockBadge />} />
    <div className="workspace-grid">
      <section className="panel input-panel">
        <div className="panel-heading"><div><span className="step-label">設定</span><h2>撰寫需求</h2></div><Button variant="ghost" onClick={() => setForm({ context: '通知各部門於 7 月 18 日前回覆辦公用品採購需求', audience: '各部門窗口', purpose: '提醒通知', tone: '正式' })}>載入示範</Button></div>
        <Field label="情境與重點"><textarea value={form.context} onChange={(event) => update('context', event.target.value)} placeholder="例如：通知各部門回覆下月採購需求…" /></Field>
        <div className="form-grid">
          <Field label="收件對象"><input value={form.audience} onChange={(event) => update('audience', event.target.value)} /></Field>
          <Field label="用途"><select value={form.purpose} onChange={(event) => update('purpose', event.target.value)}><option>正式 Email</option><option>行政公告</option><option>提醒通知</option></select></Field>
          <Field label="語氣"><select value={form.tone} onChange={(event) => update('tone', event.target.value)}><option>正式</option><option>友善</option><option>簡潔</option></select></Field>
        </div>
        <div className="panel-footer"><span className="autosave-note">草稿已自動儲存在本機</span><Button loading={loading} icon={<Sparkles size={16} />} onClick={generate}>產生正式內容</Button></div>
      </section>
      <section className="panel output-panel">
        <div className="panel-heading"><div><span className="step-label">預覽</span><h2>Gmail 格式</h2></div>{result && <div className="compact-actions"><button title="複製" onClick={copy}><Copy size={17} /></button><button title="開啟 Gmail" onClick={openGmail}><ExternalLink size={17} /></button></div>}</div>
        {!result ? <EmptyState icon={<Mail size={25} />} title="等待產生正式內容" description="完成左側設定後，這裡會顯示可直接寄出的信件或公告。" /> :
          <div className="email-preview">
            <div className="email-toolbar"><div className="gmail-mark">M</div><div><span>新郵件</span><small>AdminFlow 預覽</small></div></div>
            <div className="email-meta"><span>收件者</span><strong>{form.audience}</strong></div>
            <div className="email-meta"><span>主旨</span><strong>{result.subject}</strong></div>
            <div className="email-body"><p>{result.greeting}</p>{result.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<p>{result.callToAction}</p><p className="preserve-lines">{result.closing}</p></div>
            <div className="result-actions">
              <Button icon={<Save size={16} />} onClick={save}>儲存</Button>
            </div>
          </div>}
      </section>
    </div>
    <PrivacyNote />
  </>
}
