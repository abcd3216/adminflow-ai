import type { AiService } from './aiService'
import { callGemini } from './geminiClient'
import type { MeetingResult, MailResult, SopResult } from '../types'
import { formatLocalDateTime, normalizeMeetingDateTime } from '../utils/meetingTime'

export class ApiAiService implements AiService {
  constructor(private readonly fallback: AiService) {}
  async generateMeeting(transcript: string, localDateTime = formatLocalDateTime()): Promise<MeetingResult> {
    try {
      const result = await callGemini<MeetingResult>('meeting', { transcript, localDateTime })
      return { ...result, date: normalizeMeetingDateTime(result.date, localDateTime) }
    } catch {
      const result = await this.fallback.generateMeeting(transcript, localDateTime)
      return { ...result, date: normalizeMeetingDateTime(result.date, localDateTime) }
    }
  }
  async generateMail(input: { context: string; audience: string; purpose: string; tone: string }): Promise<MailResult> { try { return await callGemini<MailResult>('mail', input) } catch { return this.fallback.generateMail(input) } }
  async generateSop(input: { title: string; description: string; roles: string }): Promise<SopResult> { try { return await callGemini<SopResult>('sop', input) } catch { return this.fallback.generateSop(input) } }
}
