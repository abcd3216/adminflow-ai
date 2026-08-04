export async function callGemini<T>(task: 'meeting' | 'mail' | 'sop' | 'excel' | 'excelCategories', input: unknown): Promise<T> {
  const response = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, input }) })
  if (!response.ok) throw new Error((await response.json()).error || 'Gemini API request failed')
  return response.json() as Promise<T>
}

export async function transcribeMeetingAudio<T>(file: File, mimeType: string, localDateTime: string): Promise<T> {
  const response = await fetch('/api/gemini/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'X-File-Name': encodeURIComponent(file.name),
      'X-Local-Date-Time': localDateTime,
    },
    body: file,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: '錄音處理失敗' }))
    throw new Error(data.error || '錄音處理失敗')
  }
  return response.json() as Promise<T>
}
