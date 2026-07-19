export type View = 'dashboard' | 'meeting' | 'mail' | 'report' | 'sop' | 'documents'
export type DocumentType = '會議紀錄' | 'Email／公文' | '行政報表' | 'SOP'

export interface ActionItem {
  task: string
  owner: string
  dueDate: string
  status: '待處理' | '進行中' | '已完成'
}

export interface MeetingResult {
  title: string
  date: string
  summary: string
  decisions: string[]
  actionItems: ActionItem[]
}

export interface MailResult {
  subject: string
  greeting: string
  paragraphs: string[]
  callToAction: string
  closing: string
}

export interface SopResult {
  title: string
  purpose: string
  scope: string
  roles: string[]
  steps: { title: string; detail: string; role: string }[]
  cautions: string[]
  checklist: string[]
}

export interface SavedDocument {
  id: string
  type: DocumentType
  title: string
  summary: string
  content: unknown
  source: View
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface ReportRow {
  [key: string]: string | number | undefined
}

export interface FieldMap {
  date: string
  department: string
  category: string
  item: string
  amount: string
}

export interface ReportAnalysis {
  total: number
  average: number
  count: number
  maximum: number
  maximumItem: string
  byCategory: { name: string; value: number }[]
  byDepartment: { name: string; value: number }[]
  anomalies: { row: number; reason: string; value: string }[]
  summary: string
  suggestions: string[]
}
