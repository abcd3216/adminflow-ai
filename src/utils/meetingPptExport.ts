import PptxGenJS from 'pptxgenjs'
import type { MeetingResult } from '../types'

export type MeetingPptSlide = { id: string; type: 'cover' | 'summary' | 'decisions' | 'tasks' | 'closing'; title: string }
export type MeetingPptOptions = { template: '企業正式' | '極簡專業' | '專案報告'; ratio: '16:9' | '4:3'; primaryColor: string; slides: MeetingPptSlide[] }

export async function exportCustomMeetingPptx(result: MeetingResult, options: MeetingPptOptions) {
  const pptx = new PptxGenJS()
  pptx.layout = options.ratio === '4:3' ? 'LAYOUT_STANDARD' : 'LAYOUT_WIDE'
  pptx.author = 'AdminFlow AI'
  pptx.title = result.title
  pptx.company = 'AdminFlow AI'
  const primary = options.primaryColor.replace('#', '').toUpperCase()
  const titleSlide = (slide: PptxGenJS.Slide, title: string) => {
    slide.background = { color: 'F5F7FA' }
    slide.addText('ADMINFLOW AI', { x: 0.7, y: 0.35, w: 3, h: 0.25, fontSize: 9, bold: true, color: primary, charSpacing: 1.8 })
    slide.addText(title, { x: 0.7, y: 0.72, w: 11.8, h: 0.6, fontSize: 25, bold: true, color: '10233F', margin: 0 })
    slide.addShape('line', { x: 0.7, y: 1.42, w: 11.8, h: 0, line: { color: 'D8E0EA', width: 1 } })
  }

  options.slides.forEach((config) => {
    if (config.type === 'cover') {
      const slide = pptx.addSlide(); slide.background = { color: '10233F' }
      slide.addText('ADMINFLOW AI', { x: 0.8, y: 0.6, w: 3, h: 0.3, fontSize: 10, color: primary, bold: true, charSpacing: 2 })
      slide.addText(config.title || result.title, { x: 0.8, y: 2.3, w: 11.5, h: 0.8, fontSize: 32, bold: true, color: 'FFFFFF', margin: 0 })
      slide.addText(result.date, { x: 0.8, y: 3.3, w: 5, h: 0.4, fontSize: 15, color: 'C9D5E5', margin: 0 })
      return
    }
    const slide = pptx.addSlide(); titleSlide(slide, config.title)
    if (config.type === 'summary') {
      slide.addText(result.summary, { x: 0.8, y: 1.8, w: 11.5, h: 1.4, fontSize: 20, color: '334155', valign: 'middle', margin: 0.12 })
    } else if (config.type === 'decisions') {
      slide.addText(result.decisions.map((text) => ({ text, options: { bullet: { indent: 18 }, breakLine: true } })), { x: 0.95, y: 1.8, w: 10.9, h: 4.7, fontSize: 18, color: '334155', breakLine: true, paraSpaceAfter: 14 })
    } else if (config.type === 'tasks') {
      slide.addTable([
        [{ text: '任務' }, { text: '負責人' }, { text: '截止日' }, { text: '狀態' }],
        ...result.actionItems.map((item) => [item.task, item.owner, item.dueDate, item.status].map((text) => ({ text }))),
      ], { x: 0.7, y: 1.75, w: 11.8, h: 3.8, border: { type: 'solid', color: 'D8E0EA', pt: 1 }, fill: { color: 'FFFFFF' }, color: '334155', fontSize: 14, margin: 0.1, rowH: 0.55 })
    } else {
      slide.background = { color: primary }
      slide.addText(config.title || '結語', { x: 0.9, y: 2.55, w: 11, h: 0.75, fontSize: 32, bold: true, color: 'FFFFFF', align: 'center', margin: 0 })
      slide.addText('以上內容可依團隊討論結果持續更新', { x: 1.2, y: 3.5, w: 10.4, h: 0.4, fontSize: 16, color: 'E5F7F5', align: 'center', margin: 0 })
    }
  })
  await pptx.writeFile({ fileName: `${result.title}.pptx` })
}
