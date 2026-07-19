export async function callGemini<T>(task: 'meeting' | 'mail' | 'sop' | 'excel' | 'excelCategories', input: unknown): Promise<T> {
  const response = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, input }) })
  if (!response.ok) throw new Error((await response.json()).error || 'Gemini API request failed')
  return response.json() as Promise<T>
}
