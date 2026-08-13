export function formatGender(value) {
  if (value === 'male') return '남성'
  if (value === 'female') return '여성'
  return value
}

export function formatCalendar(value) {
  if (value === 'solar') return '양력'
  if (value === 'lunar') return '음력'
  return value
}

export function formatMeta({ birthDate, birthTime, gender, calendarType }) {
  const parts = [
    birthDate,
    birthTime ? String(birthTime).slice(0, 5) : null,
    formatGender(gender),
    formatCalendar(calendarType),
  ].filter(Boolean)
  return parts.join(' · ')
}

export function timeInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

export function sharedResultPath(shareToken) {
  return `/result/${shareToken}`
}

export function sharedResultUrl(shareToken) {
  return `${window.location.origin}${sharedResultPath(shareToken)}`
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isShareToken(value) {
  return UUID_RE.test(String(value || ''))
}

export function formatReadingWhen(iso) {
  if (!iso) return '기록'
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
