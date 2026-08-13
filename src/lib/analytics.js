export const GA_MEASUREMENT_ID = 'G-LYPT783Z4J'

function gtag(...args) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag(...args)
}

function pagePath() {
  const shareMatch = window.location.pathname.match(/^\/result\/([^/]+)\/?$/)
  return shareMatch ? '/result' : window.location.pathname || '/'
}

export function initAnalytics() {
  const path = pagePath()
  trackPageView({
    path,
    title: path === '/result' ? '공유 사주 결과' : document.title,
  })
}

export function trackPageView({ path, title } = {}) {
  gtag('event', 'page_view', {
    page_path: path || pagePath(),
    page_title: title || document.title,
    page_location: window.location.origin + (path || pagePath()),
  })
}

export function trackEvent(name, params = {}) {
  gtag('event', name, params)
}

export function setAnalyticsUser(userId) {
  gtag('set', { user_id: userId || undefined })
  gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId || undefined,
  })
}
