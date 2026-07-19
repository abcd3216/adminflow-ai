import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, BarChart3, Download, FileSpreadsheet, Presentation, Save, Upload } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as XLSX from 'xlsx'
import { demoCsv } from '../data/demoData'
import type { FieldMap, ReportRow } from '../types'
import { exportReportCsv, exportReportPptx, exportReportXlsx } from '../utils/export'
import { callGemini } from '../services/geminiClient'
import { analyzeReport, detectFields, parseWorkbook } from '../utils/report'
import { saveDocument } from '../utils/storage'
import { Button, EmptyState, Field, MockBadge, PageHeader, PrivacyNote } from './Common'

const colors = ['#168c8c', '#2f6fed', '#7c8ea3', '#d69035', '#7957d5']
const categoryRulesKey = 'adminflow-category-rules'
const inferLocalCategory = (row: ReportRow) => {
  const text = Object.values(row).join(' ').toLowerCase()
  if (/api|雲端|主機|資料庫|database/.test(text)) return '系統與基礎設施'
  if (/簡訊|email|行銷|宣傳|會員/.test(text)) return '行銷與會員'
  if (/jmeter|測試|qa|壓力/.test(text)) return '測試與品質'
  if (/客服|教育|訓練|教材/.test(text)) return '教育與客服'
  if (/資安|dmz|防護|監控/.test(text)) return '資安與監控'
  return '待分類'
}
const findNumericAmountHeader = (rows: ReportRow[], headers: string[]) => headers.find((header) => !/(date|日期|時間|發生|日)/i.test(header) && rows.filter((row) => {
  const value = String(row[header] ?? '').replace(/[$,NT\s]/g, '')
  return value !== '' && Number.isFinite(Number(value))
}).length >= Math.max(1, Math.ceil(rows.length * 0.5))) || ''

export function ReportWorkspace({ notify }: { notify: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [fields, setFields] = useState<FieldMap>({ date: '', department: '', category: '', item: '', amount: '' })
  const [threshold, setThreshold] = useState(10000)
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [uncertainRows, setUncertainRows] = useState<number[]>([])
  const headers = useMemo(() => rows.length ? Object.keys(rows[0]) : [], [rows])
  const analysis = useMemo(() => rows.length && fields.amount ? analyzeReport(rows, fields, threshold) : null, [rows, fields, threshold])

  const loadRows = async (nextRows: ReportRow[]) => {
    const localFields = detectFields(nextRows.length ? Object.keys(nextRows[0]) : [])
    const categoryField = localFields.category || '__ai_category'
    let enrichedRows = nextRows.map((row) => ({ ...row, [categoryField]: row[localFields.category] || inferLocalCategory(row) }))
    let uncertain = nextRows.map((_, index) => index)
    if (localFields.category) uncertain = []
    try {
      const headers = nextRows.length ? Object.keys(nextRows[0]) : []
      const inferred = await callGemini<FieldMap>('excel', { headers, sampleRows: nextRows.slice(0, 10) })
      const validInferred = (Object.keys(inferred) as (keyof FieldMap)[]).reduce((result, key) => {
        const value = inferred[key]
        if (!headers.includes(value)) return result
        if (key === 'amount') {
          const numericValues = nextRows.map((row) => Number(String(row[value] ?? '').replace(/[$,NT\s]/g, ''))).filter(Number.isFinite)
          if (!numericValues.length) return result
        }
        result[key] = value
        return result
      }, {} as Partial<FieldMap>)
      const numericHeader = findNumericAmountHeader(nextRows, headers)
      const resolvedFields = { ...localFields, ...validInferred, amount: numericHeader || validInferred.amount || localFields.amount, category: validInferred.category || categoryField }
      setFields(resolvedFields)
      if (!localFields.category) {
        const classified = await callGemini<{ categories: { row: number; category: string; confidence: number }[] }>('excelCategories', { rows: nextRows.slice(0, 50), itemHeader: resolvedFields.item, departmentHeader: resolvedFields.department })
        const byRow = new Map(classified.categories.map((item) => [item.row, item]))
        enrichedRows = enrichedRows.map((row, index) => ({ ...row, [categoryField]: byRow.get(index)?.category || row[categoryField] }))
        uncertain = classified.categories.filter((item) => item.confidence < 0.8).map((item) => item.row)
      }
    } catch {
      const headers = nextRows.length ? Object.keys(nextRows[0]) : []
      const numericHeader = findNumericAmountHeader(nextRows, headers)
      setFields({ ...localFields, amount: numericHeader || localFields.amount, category: categoryField })
    }
    setRows(enrichedRows)
    setCategoryOptions([...new Set(enrichedRows.map((row) => String(row[categoryField] || '待分類')))])
    setUncertainRows(uncertain)
    try {
      const savedRules = JSON.parse(localStorage.getItem(categoryRulesKey) || '{}') as Record<string, string>
      enrichedRows = enrichedRows.map((row) => {
        const signature = `${row[localFields.item] || ''}|${row[localFields.department] || ''}`
        return savedRules[signature] ? { ...row, [categoryField]: savedRules[signature] } : row
      })
      setRows(enrichedRows)
    } catch { setFields(localFields) }
    notify(`已在本機讀取 ${nextRows.length} 筆資料`)
  }
  const updateCategory = (rowIndex: number, value: string) => {
    const categoryField = fields.category
    setRows((current) => current.map((row, index) => index === rowIndex ? { ...row, [categoryField]: value } : row))
    setUncertainRows((current) => current.filter((index) => index !== rowIndex))
    const row = rows[rowIndex]
    if (row) {
      const signature = `${row[fields.item] || ''}|${row[fields.department] || ''}`
      const rules = JSON.parse(localStorage.getItem(categoryRulesKey) || '{}') as Record<string, string>
      localStorage.setItem(categoryRulesKey, JSON.stringify({ ...rules, [signature]: value }))
    }
  }
  const loadDemo = () => {
    const workbook = XLSX.read(demoCsv, { type: 'string' })
    void loadRows(XLSX.utils.sheet_to_json<ReportRow>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' }))
  }
  const handleFile = async (file?: File) => {
    if (!file) return
    try { loadRows(parseWorkbook(await file.arrayBuffer())) } catch { notify('檔案無法解析，請確認為 CSV 或 Excel 格式') }
  }
  const save = () => {
    if (!analysis) return
    saveDocument({ type: '行政報表', title: '每月行政支出分析', summary: analysis.summary, content: { analysis, rows, fields }, source: 'report', tags: ['Excel', '支出分析'] })
    notify('報表已儲存至文件中心')
  }

  return <>
    <PageHeader eyebrow="DATA REPORT" title="Excel／CSV 行政報表" description="上傳資料後，自動辨識欄位、統計支出、找出異常並產生管理摘要。" actions={<MockBadge />} />
    {!rows.length ? <section className="panel upload-panel">
      <div className="upload-drop" onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}>
        <div className="upload-icon"><Upload size={26} /></div><h2>拖曳或選擇 CSV／Excel 檔案</h2><p>支援 .csv、.xlsx、.xls；展示版於瀏覽器處理，正式部署可依公司政策設定。</p><Button variant="secondary">選擇檔案</Button>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
      </div>
      <div className="sample-divider"><span>或</span></div>
      <Button icon={<FileSpreadsheet size={16} />} onClick={loadDemo}>載入每月支出資料</Button>
    </section> :
      <div className="report-layout">
        <section className="panel report-controls">
          <div className="panel-heading"><div><span className="step-label">資料設定</span><h2>{rows.length} 筆資料已載入</h2></div><Button variant="ghost" onClick={() => setRows([])}>更換檔案</Button></div>
          <div className="mapping-grid">
            {(Object.keys(fields) as (keyof FieldMap)[]).map((key) => <Field key={key} label={{ date: '日期', department: '部門', category: '分類', item: '品項', amount: '金額' }[key]}>
              <select value={fields[key]} onChange={(event) => setFields({ ...fields, [key]: event.target.value })}><option value="">未指定</option>{headers.map((header) => <option key={header}>{header}</option>)}</select>
            </Field>)}
          </div>
          <Field label="金額警示門檻"><div className="currency-input"><span>NT$</span><input type="number" min="0" step="1000" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></div></Field>
        </section>
        {uncertainRows.length > 0 && <section className="panel classification-review"><div className="panel-heading"><div><span className="step-label">AI 分類</span><h2>{uncertainRows.length} 筆資料需要確認</h2></div></div><p>Gemini 已先依支出說明推測分類，請確認待分類項目；你的修正會記住並套用到相似資料。</p><div className="classification-list">{uncertainRows.slice(0, 12).map((rowIndex) => <label key={rowIndex}><span>第 {rowIndex + 2} 列</span><strong>{String(rows[rowIndex]?.[fields.item] || '未命名項目')}</strong><select value={String(rows[rowIndex]?.[fields.category] || '待分類')} onChange={(event) => updateCategory(rowIndex, event.target.value)}>{categoryOptions.map((option) => <option key={option}>{option}</option>)}<option>其他</option></select></label>)}</div></section>}
        {analysis ? <>
          <section className="metric-grid">
            <article><span>本月總額</span><strong>NT$ {analysis.total.toLocaleString()}</strong><small>{analysis.count} 筆支出</small></article>
            <article><span>平均金額</span><strong>NT$ {Math.round(analysis.average).toLocaleString()}</strong><small>每筆平均</small></article>
            <article><span>最高支出</span><strong>NT$ {analysis.maximum.toLocaleString()}</strong><small>{analysis.maximumItem}</small></article>
            <article className={analysis.anomalies.length ? 'metric-alert' : ''}><span>需注意</span><strong>{analysis.anomalies.length} 筆</strong><small>品質與金額異常</small></article>
          </section>
          <div className="report-main-grid">
            <section className="panel chart-panel"><div className="panel-heading"><div><span className="step-label">視覺化</span><h2>分類支出統計</h2></div></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={analysis.byCategory} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6ebf1" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#66778b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#8a98a9' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => `NT$ ${Number(value).toLocaleString()}`} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{analysis.byCategory.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
            </section>
            <section className="panel insight-panel"><div className="panel-heading"><div><span className="step-label">AI 摘要</span><h2>行政觀察</h2></div></div><p className="insight-summary">{analysis.summary}</p><ul>{analysis.suggestions.map((item) => <li key={item}>{item}</li>)}</ul></section>
          </div>
          <section className="panel anomaly-panel"><div className="panel-heading"><div><span className="step-label">資料品質</span><h2>異常檢查</h2></div><span className="warning-count"><AlertTriangle size={15} /> {analysis.anomalies.length} 項</span></div>
            {analysis.anomalies.length ? <div className="table-wrap"><table><thead><tr><th>資料列</th><th>原因</th><th>內容</th></tr></thead><tbody>{analysis.anomalies.map((item, index) => <tr key={`${item.row}-${index}`}><td>第 {item.row} 列</td><td>{item.reason}</td><td>{item.value}</td></tr>)}</tbody></table></div> : <EmptyState icon={<BarChart3 size={24} />} title="未發現異常" description="目前資料品質良好。" />}
          </section>
          <div className="floating-actions"><Button variant="ghost" icon={<Download size={16} />} onClick={() => exportReportCsv(rows)}>CSV</Button><Button variant="secondary" icon={<Download size={16} />} onClick={() => exportReportXlsx(rows, analysis)}>匯出 Excel</Button><Button variant="secondary" icon={<Presentation size={16} />} onClick={() => exportReportPptx(analysis)}>匯出 PowerPoint</Button><Button icon={<Save size={16} />} onClick={save}>儲存報表</Button></div>
        </> : <section className="panel"><EmptyState icon={<FileSpreadsheet size={24} />} title="請完成欄位對應" description="至少指定金額欄位後即可開始分析。" /></section>}
      </div>}
    <PrivacyNote />
  </>
}
