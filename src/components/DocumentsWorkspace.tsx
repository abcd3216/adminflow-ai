import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, FileArchive, FileBarChart, FileText, Mail, Printer, Search, Trash2 } from 'lucide-react'
import type { MailResult, MeetingResult, SavedDocument, SopResult } from '../types'
import { downloadText, mailMarkdown, meetingMarkdown, sopMarkdown } from '../utils/export'
import { clearAllData, deleteDocument, getDocuments } from '../utils/storage'
import { Button, EmptyState, Field, PageHeader, PrivacyNote } from './Common'

const typeIcons = { '會議紀錄': FileText, 'Email／公文': Mail, '行政報表': FileBarChart, SOP: FileArchive }
const filters = ['全部', '會議紀錄', 'Email／公文', '行政報表', 'SOP']

function documentMarkdown(document: SavedDocument) {
  if (document.type === '會議紀錄') return meetingMarkdown(document.content as MeetingResult)
  if (document.type === 'Email／公文') return mailMarkdown(document.content as MailResult)
  if (document.type === 'SOP') return sopMarkdown(document.content as SopResult)
  return `# ${document.title}\n\n${document.summary}\n\n\`\`\`json\n${JSON.stringify(document.content, null, 2)}\n\`\`\``
}

export function DocumentsWorkspace({ notify }: { notify: (message: string) => void }) {
  const [documents, setDocuments] = useState<SavedDocument[]>(getDocuments)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('全部')
  const [selected, setSelected] = useState<SavedDocument | null>(null)
  useEffect(() => {
    const refresh = () => setDocuments(getDocuments())
    window.addEventListener('adminflow-documents', refresh)
    return () => window.removeEventListener('adminflow-documents', refresh)
  }, [])
  const visible = useMemo(() => documents.filter((document) => (filter === '全部' || document.type === filter) && `${document.title}${document.summary}${document.tags.join('')}`.toLowerCase().includes(query.toLowerCase())), [documents, filter, query])
  const remove = (id: string) => { deleteDocument(id); setSelected(null); notify('文件已刪除') }
  const clear = () => {
    if (!window.confirm('確定清除所有文件與草稿嗎？此動作無法復原。')) return
    clearAllData(); setDocuments([]); setSelected(null); notify('所有本機資料已清除')
  }
  const print = (document: SavedDocument) => {
    setSelected(document)
    setTimeout(() => window.print(), 80)
  }
  return <>
    <PageHeader eyebrow="DOCUMENT CENTER" title="文件中心" description="集中管理已確認的會議紀錄、信件、報表與 SOP；保存方式可依部署需求擴充。" actions={documents.length ? <Button variant="danger" icon={<Trash2 size={15} />} onClick={clear}>清除全部</Button> : undefined} />
    <div className="document-toolbar">
      <div className="search-box"><Search size={17} /><input aria-label="搜尋文件" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋標題、摘要或標籤…" /></div>
    </div>
    {!visible.length ? <section className="panel"><EmptyState icon={<FileArchive size={27} />} title={documents.length ? '找不到符合條件的文件' : '文件中心目前是空的'} description={documents.length ? '請調整搜尋文字或篩選條件。' : '在任一工具產生結果後，按下「儲存」即可加入這裡。'} /></section> :
      <div className="documents-layout">
        <section className="document-list">
          {visible.map((document) => {
            const Icon = typeIcons[document.type]
            return <article className={`document-card ${selected?.id === document.id ? 'selected' : ''}`} key={document.id} onClick={() => setSelected(document)}>
              <div className={`document-type-icon type-${document.source}`}><Icon size={19} /></div>
              <div className="document-info"><div><span>{document.type}</span><time>{new Date(document.createdAt).toLocaleDateString('zh-TW')}</time></div><h3>{document.title}</h3><p>{document.summary}</p><div className="tag-row">{document.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
              <button className="icon-button" aria-label="預覽文件" onClick={(event) => { event.stopPropagation(); setSelected(document) }}><Eye size={17} /></button>
            </article>
          })}
        </section>
        <aside className="panel document-preview">
          {!selected ? <EmptyState icon={<Eye size={24} />} title="選擇文件預覽" description="點選左側文件，查看摘要與匯出選項。" /> :
            <div className="print-area">
              <div className="preview-meta"><span>{selected.type}</span><time>{new Date(selected.createdAt).toLocaleString('zh-TW')}</time></div>
              <h2>{selected.title}</h2><p className="preview-summary">{selected.summary}</p>
              <div className="preview-tags">{selected.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              <pre>{documentMarkdown(selected).replace(/^#.*\n/, '').slice(0, 1800)}</pre>
              <div className="preview-actions">
                <Button variant="secondary" icon={<Download size={16} />} onClick={() => downloadText(documentMarkdown(selected), `${selected.title}.md`)}>Markdown</Button>
                <Button variant="secondary" icon={<Printer size={16} />} onClick={() => print(selected)}>列印／PDF</Button>
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => remove(selected.id)}>刪除</Button>
              </div>
            </div>}
        </aside>
      </div>}
    <PrivacyNote />
  </>
}
