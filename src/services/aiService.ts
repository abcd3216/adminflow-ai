import type { MeetingResult, MailResult, SopResult } from '../types'
import { HybridMeetingService } from './hybridMeetingService'
import { ApiAiService } from './apiAiService'

export interface AiService {
  generateMeeting(transcript: string): Promise<MeetingResult>
  generateMail(input: { context: string; audience: string; purpose: string; tone: string }): Promise<MailResult>
  generateSop(input: { title: string; description: string; roles: string }): Promise<SopResult>
}

export const aiService: AiService = new ApiAiService(new HybridMeetingService())

export const providerInfo = {
  id: 'mock',
  label: 'Mock AI',
  note: '規則式智慧模擬｜資料不離開瀏覽器',
}
