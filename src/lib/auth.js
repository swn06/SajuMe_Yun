import { supabase } from './supabase.js'

const GSI_SRC = 'https://accounts.google.com/gsi/client'

export function getGoogleClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
}

export function isInAppBrowser() {
  const ua = navigator.userAgent || ''
  return /KAKAOTALK|NAVER|FBAN|FBAV|Instagram|Line\//i.test(ua)
}

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`)
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve(window.google)
        return
      }
      existing.addEventListener('load', () => resolve(window.google), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google 로그인을 불러오지 못했다냥')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Google 로그인을 불러오지 못했다냥'))
    document.head.appendChild(script)
  })
}

async function generateNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const nonce = btoa(String.fromCharCode(...bytes))
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce))
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return { nonce, hashedNonce }
}

function removeGoogleFallback() {
  document.querySelector('[data-google-fallback]')?.remove()
}

function showGoogleFallbackButton() {
  removeGoogleFallback()
  const overlay = document.createElement('div')
  overlay.dataset.googleFallback = 'true'
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:1.25rem;background:rgba(8,6,4,.72)'
  overlay.innerHTML = `
    <div style="width:min(22rem,100%);padding:1.4rem 1.2rem 1.15rem;border:1px solid color-mix(in srgb,#8b1e1e 55%,#c4a35a);background:#1a120f;color:#f4efe4;text-align:center">
      <p style="margin:0 0 1rem;font-size:.92rem;line-height:1.55">Google 버튼을 눌러 로그인을 마치라냥</p>
      <div data-google-host style="display:flex;justify-content:center"></div>
      <button type="button" data-google-cancel style="margin-top:1rem;padding:.4rem .8rem;border:1px solid #c4a35a;background:transparent;color:#f4efe4;cursor:pointer">닫기</button>
    </div>
  `
  document.body.appendChild(overlay)
  return overlay
}

export async function signInWithGoogle() {
  const clientId = getGoogleClientId()
  if (!clientId) {
    throw new Error('Google 클라이언트 ID가 없다냥. VITE_GOOGLE_CLIENT_ID를 넣고 다시 배포하라냥.')
  }
  if (isInAppBrowser()) {
    throw new Error('카카오톡 등 인앱 브라우저에서는 Google 로그인이 막힌다냥. Safari나 Chrome으로 열어 보라냥.')
  }

  await loadGoogleIdentity()
  const { nonce, hashedNonce } = await generateNonce()

  return new Promise((resolve, reject) => {
    let settled = false

    const finish = (error) => {
      if (settled) return
      settled = true
      removeGoogleFallback()
      if (error) reject(error)
      else resolve()
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
            nonce,
          })
          if (error) throw error
          finish()
        } catch (err) {
          finish(err)
        }
      },
      nonce: hashedNonce,
      use_fedcm_for_prompt: true,
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    window.google.accounts.id.prompt((notification) => {
      if (settled) return
      if (notification.isDismissedMoment() && notification.getDismissedReason() === 'credential_returned') {
        return
      }
      const blocked = notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()
      if (!blocked) return

      const overlay = showGoogleFallbackButton()
      overlay.querySelector('[data-google-cancel]')?.addEventListener('click', () => {
        finish(new Error('로그인을 취소했다냥'))
      })
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) finish(new Error('로그인을 취소했다냥'))
      })
      const host = overlay.querySelector('[data-google-host]')
      if (!host) {
        finish(new Error('Google 로그인 버튼을 만들지 못했다냥'))
        return
      }
      window.google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 280,
        locale: 'ko',
      })
    })
  })
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function getUserDisplayName(user) {
  if (!user) return ''
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    '사용자'
  )
}

export function getUserAvatarUrl(user) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
}
