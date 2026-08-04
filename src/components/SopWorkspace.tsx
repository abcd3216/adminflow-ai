import { useEffect, useState } from 'react'
import { CheckSquare, FileText, Save, Sparkles } from 'lucide-react'
import { demoSopDescription } from '../data/demoData'
import { aiService } from '../services/aiService'
import type { SopResult } from '../types'
import { exportSopDocx } from '../utils/export'
import { saveDocument, saveDraft, useDraft } from '../utils/storage'
import { Button, EmptyState, Field, MockBadge, PageHeader, PrivacyNote } from './Common'

const initial = { title: '', description: '', roles: '申請人、部門主管、行政部' }

export function SopWorkspace({ notify }: { notify: (message: string) => void }) {
  const [form, setForm] = useState(() => useDraft('sop', initial))
  const [result, setResult] = useState<SopResult | null>(null)
  const [checked, setChecked] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => saveDraft('sop', form), [form])
  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value })
  const generate = async () => {
    if (!form.description.trim()) return notify('請先描述作業流程')
    setLoading(true); try { setResult(await aiService.generateSop(form)); notify('SOP 已整理完成') } finally { setLoading(false) }
  }
  const save = () => {
    if (!result) return
    saveDocument({ type: 'SOP', title: result.title, summary: result.purpose, content: result, source: 'sop', tags: ['SOP', '流程'] }); notify('已儲存至文件中心')
  }
  return <>
    <PageHeader eyebrow="PROCESS DESIGN" title="SOP 產生器" description="把口語流程整理成角色分工、標準步驟、注意事項與檢核表。" actions={<MockBadge />} />
    <div className="workspace-grid">
      <section className="panel input-panel">
        <div className="panel-heading"><div><span className="step-label">輸入</span><h2>流程描述</h2></div><Button variant="ghost" onClick={() => setForm({ title: '辦公用品採購作業 SOP', description: demoSopDescription, roles: '申請人、部門主管、行政部' })}>載入示範</Button></div>
        <Field label="流程名稱"><input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="例如：辦公用品採購作業 SOP" /></Field>
        <Field label="目前的做法"><textarea className="large-textarea sop-textarea" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="用自己的話描述流程、條件與例外…" /></Field>
        <Field label="涉及角色" hint="請用頓號分隔"><input value={form.roles} onChange={(event) => update('roles', event.target.value)} /></Field>
        <div className="panel-footer"><span className="autosave-note">草稿已自動儲存在本機</span><Button loading={loading} icon={<Sparkles size={16} />} onClick={generate}>產生標準 SOP</Button></div>
      </section>
      <section className="panel output-panel">
        <div className="panel-heading"><div><span className="step-label">輸出</span><h2>標準作業程序</h2></div></div>
        {!result ? <EmptyState icon={<CheckSquare size={25} />} title="等待整理流程" description="AI 將把口語描述轉為可執行、可檢核的 SOP。" /> :
          <div className="sop-result">
            <div className="result-title-row"><div><h3>{result.title}</h3><span>{result.scope}</span></div></div>
            <div className="summary-box"><p className="result-label">目的</p><p>{result.purpose}</p></div>
            <div className="role-row">{result.roles.map((role) => <span key={role}>{role}</span>)}</div>
            <div className="sop-steps">{result.steps.map((step, index) => <div className="sop-step" key={step.title}><span>{index + 1}</span><div><strong>{step.title}</strong><p>{step.detail}</p><small>負責：{step.role}</small></div></div>)}</div>
            <div className="caution-box"><strong>注意事項</strong><ul>{result.cautions.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="result-block"><p className="result-label">執行檢核表</p><div className="checklist">{result.checklist.map((item, index) => <label key={item}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked(checked.includes(index) ? checked.filter((value) => value !== index) : [...checked, index])} /><span>{item}</span></label>)}</div></div>
            <div className="result-actions"><Button variant="secondary" icon={<FileText size={16} />} onClick={() => exportSopDocx(result)}>匯出 Word</Button><Button icon={<Save size={16} />} onClick={save}>儲存 SOP</Button></div>
          </div>}
      </section>
    </div>
    <PrivacyNote />
  </>
}
