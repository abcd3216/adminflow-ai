import type { AiService } from './aiService'
import type { MeetingResult, MailResult, SopResult } from '../types'

const delay = (ms = 650) => new Promise((resolve) => setTimeout(resolve, ms))
const uniq = <T,>(items: T[]) => [...new Set(items)]

function extractDate(text: string) {
  const match = text.match(/(20\d{2})[年\/-](\d{1,2})[月\/-](\d{1,2})日?/)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : new Date().toISOString().slice(0, 10)
}

function normalizeDueDate(raw: string | undefined) {
  if (!raw) return '待確認'
  const match = raw.match(/(\d{1,2})月(\d{1,2})日/)
  if (!match) return raw
  return `${new Date().getFullYear()}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
}

export class MockAiService implements AiService {
  async generateMeeting(transcript: string): Promise<MeetingResult> {
    await delay()
    const lines = transcript.split(/\n|。/).map((line) => line.trim()).filter(Boolean)
    const decisions = lines
      .filter((line) => /決議|同意|確認|預定/.test(line))
      .map((line) => line.replace(/^.*?[：:]/, '').trim())
      .slice(0, 5)
    const tasks: MeetingResult['actionItems'] = []
    const taskPatterns = [
      { keyword: /採購|支出|明細|詢價|比價/, task: '確認採購支出明細並完成比價' },
      { keyword: /影印機|維修|保養|卡紙/, task: '聯絡廠商安排影印機保養' },
      { keyword: /活動|中秋|企劃/, task: '提出公司活動初步企劃' },
    ]
    for (const line of lines) {
      for (const pattern of taskPatterns) {
        if (!pattern.keyword.test(line) || tasks.some((task) => task.task === pattern.task)) continue
        const ownerMatch = line.match(/(?:由|請)([\u4e00-\u9fa5]{2,4})(?:在|負責|聯絡|統籌|整理)/)
        const speakerMatch = line.match(/^([\u4e00-\u9fa5]{2,4})(?:主任|組長)?[：:]/)
        const dueMatch = line.match(/\d{1,2}月\d{1,2}日/)
        tasks.push({
          task: pattern.task,
          owner: ownerMatch?.[1] || speakerMatch?.[1] || (line.includes('行政部') ? '行政部' : '待確認'),
          dueDate: normalizeDueDate(dueMatch?.[0]),
          status: '待處理',
        })
      }
    }
    const topics = uniq(lines.flatMap((line) => [
      /採購|支出|用品/.test(line) ? '採購支出' : '',
      /影印機|維修|設備/.test(line) ? '設備維護' : '',
      /活動|中秋/.test(line) ? '活動籌備' : '',
    ]).filter(Boolean))
    return {
      title: '每月行政營運會議紀錄',
      date: extractDate(transcript),
      summary: `本次會議聚焦於${topics.length ? topics.join('、') : '行政例行事項'}，共整理 ${Math.max(decisions.length, 1)} 項決議與 ${Math.max(tasks.length, 1)} 項後續任務。各負責人應依期限完成並回報進度。`,
      decisions: decisions.length ? decisions : ['會議內容已完成初步整理，決議細節待與會者確認。'],
      actionItems: tasks.length ? tasks : [{ task: '確認會議紀錄內容', owner: '待確認', dueDate: '待確認', status: '待處理' }],
    }
  }

  async generateMail(input: { context: string; audience: string; purpose: string; tone: string }): Promise<MailResult> {
    await delay(520)
    const audience = input.audience.trim() || '各位同仁'
    const formal = input.tone === '正式'
    const subjectPrefix = input.purpose === '行政公告' ? '【行政公告】' : input.purpose === '提醒通知' ? '【提醒】' : ''
    const context = input.context.trim() || '請協助確認本月行政事項與待辦進度'
    return {
      subject: `${subjectPrefix}${context.slice(0, 24)}`,
      greeting: `${audience}您好：`,
      paragraphs: [
        formal ? `為利相關行政作業順利進行，茲就「${context}」說明如下。` : `想和您更新「${context}」的相關安排。`,
        '請依下方說明確認內容，如有需調整之處，敬請於期限前回覆，以利後續彙整與執行。',
      ],
      callToAction: input.purpose === '提醒通知' ? '敬請於本週五下班前完成確認並回覆。' : '如有任何疑問，請與行政部聯繫。',
      closing: formal ? '敬祝　順心\n行政部 敬上' : '謝謝您的協助！\n行政部',
    }
  }

  async generateSop(input: { title: string; description: string; roles: string }): Promise<SopResult> {
    await delay(620)
    const roles = uniq(input.roles.split(/[、,，\s]+/).filter(Boolean))
    const source = input.description
    const stepTemplates = [
      { key: /提出|申請|需求/, title: '提出需求', detail: '申請人填寫需求、用途、預算與期望完成日。', role: roles[0] || '申請人' },
      { key: /主管|確認|核准/, title: '主管審核', detail: '確認需求必要性、預算與資料完整性。', role: roles[1] || '部門主管' },
      { key: /比價|詢價|供應商/, title: '詢價與比價', detail: '依採購規範取得報價並留下比較紀錄。', role: roles[2] || '行政部' },
      { key: /下單|採購/, title: '核准後執行', detail: '確認核准結果後下單，記錄廠商與交期。', role: roles[2] || '行政部' },
      { key: /到貨|驗收|發票|保存/, title: '驗收與歸檔', detail: '核對品項、數量與金額，保存發票及相關紀錄。', role: roles[0] || '申請人' },
    ]
    const steps = stepTemplates.filter((step) => step.key.test(source))
    return {
      title: input.title.trim() || '行政作業標準流程',
      purpose: `建立一致的「${input.title || '行政作業'}」處理方式，降低遺漏並保留可追蹤紀錄。`,
      scope: '適用於公司內部相關申請、審核、執行與歸檔作業。',
      roles: roles.length ? roles : ['申請人', '部門主管', '行政部'],
      steps: steps.length ? steps : stepTemplates.slice(0, 4),
      cautions: [
        /一萬|10,?000/.test(source) ? '單筆超過新台幣 10,000 元時，須附至少兩家報價紀錄。' : '超過公司核定門檻時，須補充比價或主管核准。',
        '未完成核准前不得逕行下單。',
        '發票、報價與驗收紀錄應依公司規範保存。',
      ],
      checklist: ['需求與用途填寫完整', '預算及主管核准完成', '報價與比價紀錄齊全', '品項已驗收', '發票與文件已歸檔'],
    }
  }
}
