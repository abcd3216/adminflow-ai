import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import PptxGenJS from 'pptxgenjs'
import * as XLSX from 'xlsx'
import type { MailResult, MeetingResult, ReportAnalysis, ReportRow, SopResult } from '../types'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(content: string, fileName: string, type = 'text/markdown;charset=utf-8') {
  downloadBlob(new Blob([content], { type }), fileName)
}

const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } })
const body = (text: string) => new Paragraph({ children: [new TextRun(text)], spacing: { after: 100 } })

export async function exportMeetingDocx(result: MeetingResult) {
  const rows = [
    new TableRow({ children: ['待辦事項', '負責人', '截止日', '狀態'].map((value) => new TableCell({ children: [body(value)] })) }),
    ...result.actionItems.map((item) => new TableRow({ children: [item.task, item.owner, item.dueDate, item.status].map((value) => new TableCell({ children: [body(value)] })) })),
  ]
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ text: result.title, heading: HeadingLevel.TITLE }),
    body(`會議日期：${result.date}`),
    heading('會議摘要'), body(result.summary),
    heading('決議事項'), ...result.decisions.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
    heading('待辦事項'), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
  ] }] })
  downloadBlob(await Packer.toBlob(doc), `${result.title}.docx`)
}

function setupPpt(title: string) {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'AdminFlow AI'
  pptx.subject = title
  pptx.title = title
  pptx.company = 'AdminFlow AI'
  pptx.theme = {
    headFontFace: 'Microsoft JhengHei',
    bodyFontFace: 'Microsoft JhengHei',
  }
  return pptx
}

function addTitle(slide: PptxGenJS.Slide, title: string, eyebrow = 'ADMINFLOW AI') {
  slide.background = { color: 'F5F7FA' }
  slide.addText(eyebrow, { x: 0.7, y: 0.35, w: 3, h: 0.25, fontSize: 9, bold: true, color: '168C8C', charSpacing: 1.8 })
  slide.addText(title, { x: 0.7, y: 0.72, w: 11.8, h: 0.6, fontSize: 25, bold: true, color: '10233F', margin: 0 })
  slide.addShape('line', { x: 0.7, y: 1.42, w: 11.8, h: 0, line: { color: 'D8E0EA', width: 1 } })
}

export async function exportMeetingPptx(result: MeetingResult) {
  const pptx = setupPpt(result.title)
  let slide = pptx.addSlide()
  slide.background = { color: '10233F' }
  slide.addText('ADMINFLOW AI', { x: 0.8, y: 0.6, w: 3, h: 0.3, fontSize: 10, color: '62D2C8', bold: true, charSpacing: 2 })
  slide.addText(result.title, { x: 0.8, y: 2.3, w: 11.5, h: 0.8, fontSize: 32, bold: true, color: 'FFFFFF', margin: 0 })
  slide.addText(result.date, { x: 0.8, y: 3.3, w: 5, h: 0.4, fontSize: 15, color: 'C9D5E5', margin: 0 })
  slide = pptx.addSlide(); addTitle(slide, '會議摘要')
  slide.addText(result.summary, { x: 0.8, y: 1.8, w: 11.5, h: 1.4, fontSize: 20, color: '334155', breakLine: false, valign: 'middle', margin: 0.12 })
  slide.addText('決議事項', { x: 0.8, y: 3.65, w: 3, h: 0.4, fontSize: 18, bold: true, color: '10233F' })
  slide.addText(result.decisions.map((text) => ({ text, options: { bullet: { indent: 18 }, breakLine: true } })), { x: 0.95, y: 4.15, w: 10.9, h: 2.1, fontSize: 16, color: '334155', breakLine: true, paraSpaceAfter: 10 })
  slide = pptx.addSlide(); addTitle(slide, '待辦事項')
  slide.addTable([
    [{ text: '待辦事項' }, { text: '負責人' }, { text: '截止日' }, { text: '狀態' }],
    ...result.actionItems.map((item) => [item.task, item.owner, item.dueDate, item.status].map((text) => ({ text }))),
  ], { x: 0.7, y: 1.75, w: 11.8, h: 3.8, border: { type: 'solid', color: 'D8E0EA', pt: 1 }, fill: { color: 'FFFFFF' }, color: '334155', fontSize: 14, margin: 0.1, rowH: 0.55, bold: false })
  await pptx.writeFile({ fileName: `${result.title}.pptx` })
}

export async function exportMailDocx(result: MailResult) {
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ text: result.subject, heading: HeadingLevel.TITLE }),
    body(result.greeting), ...result.paragraphs.map(body), body(result.callToAction),
    new Paragraph({ children: [new TextRun({ text: result.closing, break: 1 })] }),
  ] }] })
  downloadBlob(await Packer.toBlob(doc), `${result.subject.replace(/[\\/:*?"<>|]/g, '')}.docx`)
}

export async function exportSopDocx(result: SopResult) {
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ text: result.title, heading: HeadingLevel.TITLE }),
    heading('目的'), body(result.purpose), heading('適用範圍'), body(result.scope),
    heading('角色'), ...result.roles.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
    heading('作業步驟'), ...result.steps.flatMap((step, index) => [
      new Paragraph({ children: [new TextRun({ text: `${index + 1}. ${step.title}（${step.role}）`, bold: true })] }),
      body(step.detail),
    ]),
    heading('注意事項'), ...result.cautions.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
    heading('檢核表'), ...result.checklist.map((item) => body(`☐ ${item}`)),
  ] }] })
  downloadBlob(await Packer.toBlob(doc), `${result.title}.docx`)
}

export async function exportSopPptx(result: SopResult) {
  const pptx = setupPpt(result.title)
  let slide = pptx.addSlide(); addTitle(slide, result.title, 'STANDARD OPERATING PROCEDURE')
  slide.addText(result.purpose, { x: 0.8, y: 1.8, w: 11.3, h: 1, fontSize: 20, color: '334155', margin: 0.1 })
  slide.addText(`適用角色：${result.roles.join('、')}`, { x: 0.8, y: 3.1, w: 11, h: 0.45, fontSize: 15, color: '52657A' })
  slide = pptx.addSlide(); addTitle(slide, '流程步驟')
  result.steps.forEach((step, index) => {
    const y = 1.72 + index * 0.92
    slide.addShape('roundRect', { x: 0.8, y, w: 0.55, h: 0.55, rectRadius: 0.08, fill: { color: '168C8C' }, line: { color: '168C8C' } })
    slide.addText(String(index + 1), { x: 0.8, y: y + 0.08, w: 0.55, h: 0.25, align: 'center', fontSize: 14, bold: true, color: 'FFFFFF', margin: 0 })
    slide.addText(step.title, { x: 1.6, y, w: 3, h: 0.35, fontSize: 17, bold: true, color: '10233F', margin: 0 })
    slide.addText(`${step.detail}｜${step.role}`, { x: 1.6, y: y + 0.38, w: 9.9, h: 0.35, fontSize: 12, color: '52657A', margin: 0 })
  })
  await pptx.writeFile({ fileName: `${result.title}.pptx` })
}

export function exportReportXlsx(rows: ReportRow[], analysis: ReportAnalysis) {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), '原始資料')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(analysis.byCategory.map((item) => ({ 分類: item.name, 金額: item.value }))), '分類統計')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(analysis.anomalies.map((item) => ({ 資料列: item.row, 異常原因: item.reason, 值: item.value }))), '異常檢查')
  XLSX.writeFile(workbook, '每月行政支出分析.xlsx')
}

export function exportReportCsv(rows: ReportRow[]) {
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows))
  downloadText('\uFEFF' + csv, '每月行政支出資料.csv', 'text/csv;charset=utf-8')
}

export async function exportReportPptx(analysis: ReportAnalysis) {
  const pptx = setupPpt('每月行政支出分析')
  let slide = pptx.addSlide(); addTitle(slide, '每月行政支出分析')
  slide.addText(`NT$ ${analysis.total.toLocaleString()}`, { x: 0.8, y: 1.8, w: 5, h: 0.8, fontSize: 34, bold: true, color: '168C8C', margin: 0 })
  slide.addText('本月總支出', { x: 0.8, y: 2.65, w: 3, h: 0.35, fontSize: 13, color: '64748B' })
  slide.addText(analysis.summary, { x: 0.8, y: 3.4, w: 11.3, h: 1.1, fontSize: 18, color: '334155', margin: 0.1 })
  slide = pptx.addSlide(); addTitle(slide, '分類統計與建議')
  slide.addChart(pptx.ChartType.bar, [{ name: '金額', labels: analysis.byCategory.map((item) => item.name), values: analysis.byCategory.map((item) => item.value) }], {
    x: 0.7, y: 1.7, w: 7.3, h: 4.7, catAxisLabelFontFace: 'Microsoft JhengHei', valAxisLabelFontFace: 'Microsoft JhengHei',
    showLegend: false, showTitle: false, chartColors: ['168C8C'], showValue: true,
  })
  slide.addText(analysis.suggestions.map((text) => ({ text, options: { bullet: { indent: 18 }, breakLine: true } })), { x: 8.45, y: 1.9, w: 3.8, h: 3.8, fontSize: 14, color: '334155', breakLine: true, paraSpaceAfter: 12 })
  await pptx.writeFile({ fileName: '每月行政支出分析.pptx' })
}

export function meetingMarkdown(result: MeetingResult) {
  return `# ${result.title}\n\n日期：${result.date}\n\n## 摘要\n\n${result.summary}\n\n## 決議事項\n\n${result.decisions.map((item) => `- ${item}`).join('\n')}\n\n## 待辦事項\n\n| 待辦 | 負責人 | 截止日 | 狀態 |\n| --- | --- | --- | --- |\n${result.actionItems.map((item) => `| ${item.task} | ${item.owner} | ${item.dueDate} | ${item.status} |`).join('\n')}`
}

export function mailMarkdown(result: MailResult) {
  return `# ${result.subject}\n\n${result.greeting}\n\n${result.paragraphs.join('\n\n')}\n\n${result.callToAction}\n\n${result.closing}`
}

export function sopMarkdown(result: SopResult) {
  return `# ${result.title}\n\n## 目的\n\n${result.purpose}\n\n## 適用範圍\n\n${result.scope}\n\n## 角色\n\n${result.roles.map((item) => `- ${item}`).join('\n')}\n\n## 步驟\n\n${result.steps.map((step, index) => `${index + 1}. **${step.title}**（${step.role}）：${step.detail}`).join('\n')}\n\n## 注意事項\n\n${result.cautions.map((item) => `- ${item}`).join('\n')}\n\n## 檢核表\n\n${result.checklist.map((item) => `- [ ] ${item}`).join('\n')}`
}
