import * as XLSX from 'xlsx'
import type { FieldMap, ReportAnalysis, ReportRow } from '../types'

const aliases: Record<keyof FieldMap, string[]> = {
  date: ['日期', 'date', '時間'],
  department: ['部門', 'department', '單位'],
  category: ['分類', 'category', '類別'],
  item: ['品項', 'item', '項目', '內容'],
  amount: ['金額', 'amount', '費用', '支出'],
}

export function detectFields(headers: string[]): FieldMap {
  const find = (key: keyof FieldMap) => headers.find((header) => aliases[key].some((alias) => header.toLowerCase().includes(alias.toLowerCase()))) || ''
  return { date: find('date'), department: find('department'), category: find('category'), item: find('item'), amount: find('amount') }
}

export function parseWorkbook(buffer: ArrayBuffer): ReportRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json<ReportRow>(sheet, { defval: '' })
}

function amountOf(value: unknown) {
  return Number(String(value ?? '').replace(/[$NT,，\s]/g, ''))
}

export function analyzeReport(rows: ReportRow[], fields: FieldMap, threshold: number): ReportAnalysis {
  const validAmounts = rows.map((row) => amountOf(row[fields.amount])).filter(Number.isFinite)
  const total = validAmounts.reduce((sum, amount) => sum + amount, 0)
  const categoryMap = new Map<string, number>()
  const departmentMap = new Map<string, number>()
  const seen = new Set<string>()
  const anomalies: ReportAnalysis['anomalies'] = []

  rows.forEach((row, index) => {
    const amount = amountOf(row[fields.amount])
    const category = String(row[fields.category] || '未分類')
    const department = String(row[fields.department] || '未填部門')
    const signature = JSON.stringify(row)
    if (!row[fields.department] || !row[fields.category] || !row[fields.amount]) anomalies.push({ row: index + 2, reason: '必要欄位有空值', value: String(row[fields.item] || '—') })
    if (!Number.isFinite(amount)) anomalies.push({ row: index + 2, reason: '金額格式錯誤', value: String(row[fields.amount] || '空白') })
    if (seen.has(signature)) anomalies.push({ row: index + 2, reason: '重複資料', value: String(row[fields.item] || '—') })
    if (Number.isFinite(amount) && amount >= threshold) anomalies.push({ row: index + 2, reason: `金額達警示門檻 ${threshold.toLocaleString()}`, value: amount.toLocaleString() })
    seen.add(signature)
    if (Number.isFinite(amount)) {
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount)
      departmentMap.set(department, (departmentMap.get(department) || 0) + amount)
    }
  })
  const topRow = rows.reduce((best, row) => amountOf(row[fields.amount]) > amountOf(best?.[fields.amount]) ? row : best, rows[0])
  const byCategory = [...categoryMap].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const byDepartment = [...departmentMap].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  return {
    total,
    average: validAmounts.length ? total / validAmounts.length : 0,
    count: rows.length,
    maximum: amountOf(topRow?.[fields.amount]) || 0,
    maximumItem: String(topRow?.[fields.item] || '—'),
    byCategory,
    byDepartment,
    anomalies,
    summary: `本期共 ${rows.length} 筆行政支出，總額 NT$ ${total.toLocaleString()}。最大支出類別為「${byCategory[0]?.name || '未分類'}」，占總支出 ${total ? Math.round((byCategory[0]?.value || 0) / total * 100) : 0}%。`,
    suggestions: ['優先檢視達警示門檻的高額支出並補齊核准紀錄。', '針對重複採購品項進行合併議價。', '每月固定檢查空值與部門分類，提升報表品質。'],
  }
}
