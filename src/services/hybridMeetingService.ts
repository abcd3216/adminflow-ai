import type { AiService } from './aiService'
import { MockAiService } from './mockAiService'
import type { MeetingResult, MailResult, SopResult } from '../types'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const clean = (line: string) => line.replace(/^\s*(?:[-•*]\s*)?(?:[^：:]{1,18}[：:]\s*)?/, '').trim()
const unique = (items: string[]) => [...new Set(items.filter(Boolean))]

function dateFrom(text: string, localDateTime: string) {
  const fullDate = text.match(/(20\d{2})[年\-/](\d{1,2})[月\-/](\d{1,2})日?/)
  const shortDate = text.match(/(\d{1,2})[月\-/](\d{1,2})日/)
  const time = localDateTime.slice(11, 16)
  if (fullDate) return `${fullDate[1]}-${fullDate[2].padStart(2, '0')}-${fullDate[3].padStart(2, '0')} ${time}`
  if (shortDate) return `${localDateTime.slice(0, 4)}-${shortDate[1].padStart(2, '0')}-${shortDate[2].padStart(2, '0')} ${time}`
  return localDateTime
}

function extractOwner(line: string) {
  const owner = line.match(/(?:負責人?|由|請|交給)\s*[:：]?\s*([\u4e00-\u9fa5A-Za-z]{2,12})/)
  return owner?.[1] || line.match(/^([\u4e00-\u9fa5A-Za-z]{2,12})\s*[：:]/)?.[1] || '待確認'
}

function extractDueDate(line: string) {
  const match = line.match(/(20\d{2}[年\-/]\d{1,2}[月\-/]\d{1,2}日?|\d{1,2}[月\-/]\d{1,2}日?)/)
  return match?.[1] || '待確認'
}

export class HybridMeetingService implements AiService {
  private readonly fallback = new MockAiService()

  async generateMeeting(transcript: string, localDateTime = ''): Promise<MeetingResult> {
    const generatedAt = localDateTime || new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16)
    await wait(650)
    const lines = transcript.split(/\r?\n|[。！？]/).map((line) => line.trim()).filter((line) => line.length >= 4)
    const decisionLines = lines.filter((line) => /決議|決定|確認|同意|通過|採用|定案|結論|共識|定義|上線|改為|維持|完成/.test(line))
    const taskLines = lines.filter((line) => /負責|owner|請|需要|待辦|跟進|回覆|完成|處理|準備|整理|確認|期限|截止/.test(line))
    const decisions = unique((decisionLines.length ? decisionLines : lines.slice(1, 4)).map(clean)).slice(0, 6)
    const actionSource = unique(taskLines.filter((line) => !decisionLines.includes(line)).map(clean)).slice(0, 6)
    const actionItems = (actionSource.length ? actionSource : lines.slice(-2)).map((line) => ({
      task: line.slice(0, 80), owner: extractOwner(line), dueDate: extractDueDate(line), status: '待處理' as const,
    }))
    const summarySource = unique(lines.slice(0, 3).map(clean)).join('；')
    return {
      title: '會議重點與行動紀錄',
      date: dateFrom(transcript, generatedAt),
      summary: summarySource ? `本次會議整理出 ${decisions.length} 項重點與 ${actionItems.length} 項後續任務：${summarySource}。` : '已完成會議內容整理，請確認決議與後續任務。',
      decisions: decisions.length ? decisions : ['會議內容已整理，建議由與會者確認最終決議。'],
      actionItems: actionItems.length ? actionItems : [{ task: '確認會議紀錄內容', owner: '待確認', dueDate: '待確認', status: '待處理' }],
    }
  }

  generateMail(input: { context: string; audience: string; purpose: string; tone: string }): Promise<MailResult> { return this.fallback.generateMail(input) }
  generateSop(input: { title: string; description: string; roles: string }): Promise<SopResult> { return this.fallback.generateSop(input) }
}
