import type { SavedDocument } from '../types'

const DOCUMENTS_KEY = 'adminflow_documents_v1'

export function getDocuments(): SavedDocument[] {
  try {
    return JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '[]') as SavedDocument[]
  } catch {
    return []
  }
}

export function saveDocument(document: Omit<SavedDocument, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString()
  const saved: SavedDocument = {
    ...document,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify([saved, ...getDocuments()]))
  window.dispatchEvent(new Event('adminflow-documents'))
  return saved
}

export function deleteDocument(id: string) {
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(getDocuments().filter((document) => document.id !== id)))
  window.dispatchEvent(new Event('adminflow-documents'))
}

export function clearAllData() {
  Object.keys(localStorage).filter((key) => key.startsWith('adminflow_')).forEach((key) => localStorage.removeItem(key))
  window.dispatchEvent(new Event('adminflow-documents'))
}

export function useDraft<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(`adminflow_draft_${key}`) || '') as T
  } catch {
    return fallback
  }
}

export function saveDraft<T>(key: string, value: T) {
  localStorage.setItem(`adminflow_draft_${key}`, JSON.stringify(value))
}
