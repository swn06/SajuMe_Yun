const STORAGE_KEY = 'sajume.guest-session'

export function loadGuestSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function saveGuestSession(session) {
  try {
    const prev = loadGuestSession() || {}
    const next = {
      profile: session.profile ?? prev.profile ?? null,
      result: session.result ?? prev.result ?? '',
      createdAt: session.createdAt ?? prev.createdAt ?? new Date().toISOString(),
    }
    if (!next.profile && !next.result) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // private mode 등에서 실패해도 흐름은 유지
  }
}

export function clearGuestSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** 손님에게 보여줄 앞부분만 남긴다. 나머지는 DOM에 넣지 않는다. */
export function previewReadingText(text, ratio = 0.48) {
  const value = String(text || '').trim()
  if (!value) return ''

  const blocks = value.split(/\n{2,}/).filter(Boolean)
  if (blocks.length >= 2) {
    const cut = Math.max(1, Math.min(blocks.length - 1, Math.ceil(blocks.length * ratio)))
    return blocks.slice(0, cut).join('\n\n')
  }

  const target = Math.max(90, Math.floor(value.length * ratio))
  if (value.length <= 140) {
    return value.slice(0, Math.max(40, Math.floor(value.length * ratio))).trimEnd()
  }

  const region = value.slice(0, Math.min(value.length, target + 80))
  const markers = ['다냥', '구나냥', '이라냥', '다.', '요.', '냐.', '\n']
  let cut = target
  for (const marker of markers) {
    const at = region.lastIndexOf(marker)
    if (at >= target * 0.35) {
      cut = at + marker.length
      break
    }
  }
  return value.slice(0, cut).trimEnd()
}
