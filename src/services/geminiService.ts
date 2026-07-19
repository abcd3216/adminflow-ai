import type { AiService } from './aiService'

/**
 * Gemini-ready provider 契約。
 *
 * 正式啟用時，這個 provider 應呼叫自己的 Serverless / Node API，
 * 由後端讀取 GEMINI_API_KEY。禁止在瀏覽器端直接放入 API Key。
 */
export class GeminiAiService implements AiService {
  private unavailable(): never {
    throw new Error('Gemini provider 需要安全後端代理；公開 Demo 目前使用 Mock AI。')
  }
  async generateMeeting(): Promise<never> { return this.unavailable() }
  async generateMail(): Promise<never> { return this.unavailable() }
  async generateSop(): Promise<never> { return this.unavailable() }
}
