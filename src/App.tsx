import { useEffect, useState } from 'react'
import { BarChart3, CheckCircle2, ChevronLeft, ChevronRight, FileArchive, FileText, LayoutDashboard, Mail, Menu, Play, ShieldCheck, Sparkles, X } from 'lucide-react'
import type { View } from './types'
import { getDocuments } from './utils/storage'
import { Dashboard } from './components/Dashboard'
import { DocumentsWorkspace } from './components/DocumentsWorkspace'
import { MailWorkspace } from './components/MailWorkspace'
import { MeetingWorkspace } from './components/MeetingWorkspace'
import { ReportWorkspace } from './components/ReportWorkspace'
import { SopWorkspace } from './components/SopWorkspace'
import { Button } from './components/Common'

const navItems: { id: View; label: string; detail: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '工作總覽', detail: '行政工作入口', icon: LayoutDashboard },
  { id: 'meeting', label: '會議紀錄', detail: '逐字稿整理', icon: FileText },
  { id: 'mail', label: 'Email／公文', detail: '正式商務文字', icon: Mail },
  { id: 'report', label: 'Excel 報表', detail: '支出與異常分析', icon: BarChart3 },
  { id: 'sop', label: 'SOP 產生器', detail: '流程標準化', icon: CheckCircle2 },
  { id: 'documents', label: '文件中心', detail: '本機成果管理', icon: FileArchive },
]

const demoSteps = [
  { title: '從一場行政會議開始', text: '載入每月行政營運會議逐字稿，系統會整理摘要、決議與負責人。', view: 'meeting' as View, action: '前往會議紀錄' },
  { title: '把支出資料變成洞察', text: '載入 CSV 示範資料，自動辨識欄位、統計分類並找出異常支出。', view: 'report' as View, action: '前往 Excel 報表' },
  { title: '產出可交付的 Office 成果', text: '將會議紀錄下載為 Word／PowerPoint，報表下載為 Excel／PowerPoint。', view: 'meeting' as View, action: '查看匯出功能' },
  { title: '完成歸檔與面試展示', text: '確認結果後儲存至文件中心，可搜尋、下載 Markdown 或列印成 PDF。', view: 'documents' as View, action: '前往文件中心' },
]

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [documentCount, setDocumentCount] = useState(getDocuments().length)
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoStep, setDemoStep] = useState(0)

  useEffect(() => {
    const refresh = () => setDocumentCount(getDocuments().length)
    window.addEventListener('adminflow-documents', refresh)
    return () => window.removeEventListener('adminflow-documents', refresh)
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const navigate = (next: View) => { setView(next); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const notify = (message: string) => setToast(message)
  const current = navItems.find((item) => item.id === view)!
  const demo = demoSteps[demoStep]
  const DemoIcon = navItems.find((item) => item.id === demo.view)?.icon || Sparkles
  const renderView = () => {
    if (view === 'meeting') return <MeetingWorkspace notify={notify} />
    if (view === 'mail') return <MailWorkspace notify={notify} />
    if (view === 'report') return <ReportWorkspace notify={notify} />
    if (view === 'sop') return <SopWorkspace notify={notify} />
    if (view === 'documents') return <DocumentsWorkspace notify={notify} />
    return <Dashboard onStartDemo={() => { setDemoStep(0); setDemoOpen(true) }} onNavigate={navigate} />
  }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={20} /></div><div><strong>AdminFlow AI</strong><span>智慧行政工作站</span></div><button className="sidebar-close" aria-label="關閉選單" onClick={() => setSidebarOpen(false)}><X size={19} /></button></div>
      <nav aria-label="主要功能">
        <p className="nav-section-label">工作空間</p>
        {navItems.map(({ id, label, detail, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)}>
          <Icon size={19} /><span><strong>{label}</strong><small>{detail}</small></span>{id === 'documents' && documentCount > 0 && <b className="nav-count">{documentCount}</b>}
        </button>)}
      </nav>
      <div className="sidebar-bottom"><div className="local-status"><ShieldCheck size={17} /><div><strong>部署與資安設定</strong><span>可依組織政策調整</span></div><i /></div><div className="profile"><div>AD</div><span><strong>Admin Workspace</strong><small>智慧行政工作站</small></span></div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="關閉選單" onClick={() => setSidebarOpen(false)} />}
    <div className="main-column">
      <header className="topbar">
        <button className="mobile-menu" aria-label="開啟選單" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
        <div className="breadcrumb"><span>AdminFlow</span><ChevronRight size={14} /><strong>{current.label}</strong></div>
        <div className="topbar-actions" />
      </header>
      <main>{renderView()}</main>
      <footer><span>AdminFlow AI｜智慧行政工作站</span><span>React + Vite · Deployment-ready · Gemini-ready</span></footer>
    </div>

    {demoOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDemoOpen(false)}>
      <section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-title">
        <button className="modal-close" aria-label="關閉導覽" onClick={() => setDemoOpen(false)}><X size={19} /></button>
        <div className="demo-progress">{demoSteps.map((_, index) => <span key={index} className={index <= demoStep ? 'active' : ''} />)}</div>
        <div className="demo-step-label">60 秒導覽 · {demoStep + 1} / {demoSteps.length}</div>
        <div className="demo-icon"><DemoIcon size={24} /></div>
        <h2 id="demo-title">{demo.title}</h2><p>{demo.text}</p>
        <div className="demo-tip"><Sparkles size={16} /><span>進入模組後，點選右上方「載入示範」即可快速體驗。</span></div>
        <div className="demo-controls">
          <Button variant="ghost" disabled={demoStep === 0} icon={<ChevronLeft size={16} />} onClick={() => setDemoStep((step) => step - 1)}>上一步</Button>
          <div>
            <Button variant="secondary" onClick={() => { navigate(demo.view); setDemoOpen(false) }}>{demo.action}</Button>
            {demoStep < demoSteps.length - 1 ? <Button icon={<ChevronRight size={16} />} onClick={() => setDemoStep((step) => step + 1)}>下一步</Button> : <Button icon={<CheckCircle2 size={16} />} onClick={() => { setDemoOpen(false); navigate('dashboard') }}>完成導覽</Button>}
          </div>
        </div>
      </section>
    </div>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}</div>}
  </div>
}

export default App
