const pad = (value: number) => String(value).padStart(2, '0')

export function formatLocalDateTime(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function normalizeMeetingDateTime(value: string | undefined, localDateTime: string) {
  const match = value?.match(/^(20\d{2})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/)
  if (!match) return localDateTime
  const time = match[4] && match[5] ? `${match[4]}:${match[5]}` : localDateTime.slice(11, 16)
  return `${match[1]}-${match[2]}-${match[3]} ${time}`
}
