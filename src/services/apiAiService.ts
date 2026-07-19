import type { AiService } from './aiService'
import { callGemini } from './geminiClient'
import type { MeetingResult, MailResult, SopResult } from '../types'

export class ApiAiService implements AiService {
  constructor(private readonly fallback: AiService) {}
  async generateMeeting(transcript: string): Promise<MeetingResult> { try { return await callGemini<MeetingResult>('meeting', { transcript }) } catch { return this.fallback.generateMeeting(transcript) } }
  async generateMail(input: { context: string; audience: string; purpose: string; tone: string }): Promise<MailResult> { try { return await callGemini<MailResult>('mail', input) } catch { return this.fallback.generateMail(input) } }
  async generateSop(input: { title: string; description: string; roles: string }): Promise<SopResult> { try { return await callGemini<SopResult>('sop', input) } catch { return this.fallback.generateSop(input) } }
}
