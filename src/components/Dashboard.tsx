import { ArrowRight, FileOutput, LockKeyhole, Sparkles, WandSparkles } from 'lucide-react'
import type { View } from '../types'
import { Button, PageHeader, PrivacyNote } from './Common'

const capabilities = [
  { icon: WandSparkles, label: '行政工作整理', value: '會議、信件、報表與 SOP', note: '從輸入到成果，一站完成', tone: 'blue' },
  { icon: FileOutput, label: '文件成果', value: 'Word、Excel、Markdown', note: '依需求匯出與保存', tone: 'teal' },
  { icon: LockKeyhole, label: '資料保存', value: '本機優先', note: '可依組織政策擴充部署', tone: 'slate' },
]

export function Dashboard({ onStartDemo, onNavigate }: { onStartDemo: () => void; onNavigate: (view: View) => void }) {
  return <>
    <PageHeader eyebrow="ADMIN WORKSPACE" title="把行政工作，整理成清楚可用的成果" description="支援個人工作與企業團隊，協助整理會議、分析報表、撰寫文件並集中管理成果。" />
    <section className="hero-card">
      <div className="hero-copy">
        <div className="hero-kicker"><Sparkles size={15} /> 個人與企業皆適用</div>
        <h2>讓日常行政工作，更快整理、更容易完成</h2>
        <p>從會議紀錄、Email 到報表分析，協助你快速完成日常行政工作。</p>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="document-stack">
          <div className="mini-doc mini-doc-back"><span>EXCEL</span><div className="mini-bars"><i /><i /><i /><i /></div></div>
          <div className="mini-doc mini-doc-mid"><span>DOCUMENT</span><div className="mini-slide"><i /><b /></div></div>
          <div className="mini-doc mini-doc-front"><span>WORKSPACE</span><h4>工作成果</h4><i /><i /><i /><div className="mini-check">✓ 重點與待辦已整理</div></div>
        </div>
      </div>
    </section>

    <section className="capability-grid" aria-label="工作站能力">
      {capabilities.map(({ icon: Icon, label, value, note, tone }) => <article className="capability-card" key={label}>
        <div className={`capability-icon tone-${tone}`}><Icon size={19} /></div>
        <div><p>{label}</p><strong>{value}</strong><span>{note}</span></div>
      </article>)}
    </section>

    <section className="workflow-section">
      <div className="section-heading"><div><p className="eyebrow">WORKFLOW</p><h2>從輸入到可交付成果</h2></div></div>
      <div className="workflow-row">
        {[
          ['01', '會議紀錄', '整理摘要與待辦', 'meeting'],
          ['02', '行政報表', '分析支出與異常', 'report'],
          ['03', '文件成果', '匯出與編輯文件', 'documents'],
          ['04', '文件中心', '集中保存與管理', 'documents'],
        ].map(([number, title, note, view], index) => <div className="workflow-item" key={number} onClick={() => onNavigate(view as View)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onNavigate(view as View)}>
          <span className="workflow-number">{number}</span><div><strong>{title}</strong><p>{note}</p></div>{index < 3 && <ArrowRight className="workflow-arrow" size={18} />}
        </div>)}
      </div>
    </section>
    <PrivacyNote />
  </>
}
