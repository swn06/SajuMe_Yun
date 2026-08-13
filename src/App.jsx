import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './App.css'
import { buildSajuPrompt } from './prompt.js'
import LoadingRitual from './LoadingRitual.jsx'
import ProfileModal from './ProfileModal.jsx'
import Mascot from './Mascot.jsx'
import { supabase } from './lib/supabase.js'
import {
  getUserAvatarUrl,
  getUserDisplayName,
  signInWithGoogle,
  signOut,
} from './lib/auth.js'
import {
  hasCompleteProfile,
  loadUserProfile,
  profilePayloadFromForm,
  upsertUserProfile,
} from './lib/users.js'
import { formatMeta, sharedResultUrl, timeInputValue } from './lib/format.js'
import {
  clearGuestSession,
  loadGuestSession,
  previewReadingText,
  saveGuestSession,
} from './lib/guestSession.js'

const READING_SELECT = 'id, result, created_at, user_id, share_token'

function TalismanCorners() {
  return (
    <>
      <span className="talisman__corner talisman__corner--tl" aria-hidden="true" />
      <span className="talisman__corner talisman__corner--tr" aria-hidden="true" />
      <span className="talisman__corner talisman__corner--bl" aria-hidden="true" />
      <span className="talisman__corner talisman__corner--br" aria-hidden="true" />
    </>
  )
}

function GoogleGlyph() {
  return (
    <svg className="auth-google__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

async function askGemini(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY가 .env에 없습니다. 개발 서버를 재시작해 주세요.')
  }

  // 2.5 Flash는 신규 키에서 사용 불가 → 공식 대체 모델
  const model = 'gemini-3.6-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const message = data?.error?.message || `API 오류 (${response.status})`
    throw new Error(message)
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n')

  if (!text) {
    throw new Error('Gemini 응답에서 텍스트를 찾지 못했습니다.')
  }

  return text
}

function formatReadingWhen(iso) {
  if (!iso) return '기록'
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  /** null | 'loading' | 'bursting' */
  const [ritualPhase, setRitualPhase] = useState(null)
  const pendingResultRef = useRef('')
  const readingPanelRef = useRef(null)

  const [savedProfile, setSavedProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(false)
  const [profileModal, setProfileModal] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [error, setError] = useState('')
  const [readings, setReadings] = useState([])
  const [listError, setListError] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [selectedReading, setSelectedReading] = useState(null)
  const [isViewing, setIsViewing] = useState(false)
  /** null | uuid — 수정 중인 기록 id */
  const [editingId, setEditingId] = useState(null)
  const [draftResult, setDraftResult] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [newPanelPulse, setNewPanelPulse] = useState(false)
  const [readingCount, setReadingCount] = useState(null)
  const toastTimerRef = useRef(null)
  const guestHydratedRef = useRef(false)

  const showToast = useCallback((message) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ id: Date.now(), message, leaving: false })
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => (current ? { ...current, leaving: true } : null))
      toastTimerRef.current = null
    }, 2200)
  }, [])

  const resetWorkspace = useCallback(() => {
    setName('')
    setBirthDate('')
    setBirthTime('')
    setGender('')
    setCalendarType('solar')
    setSavedProfile(null)
    setProfileReady(false)
    setProfileModal(null)
    setProfileSaving(false)
    setSelectedReading(null)
    setIsViewing(false)
    setEditingId(null)
    setDraftResult('')
    setError('')
    setListError('')
    setReadings([])
    setToast(null)
    setNewPanelPulse(false)
    pendingResultRef.current = ''
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }, [])

  const applyProfile = useCallback((profile) => {
    setName(profile?.name ?? '')
    setBirthDate(profile?.birth_date ?? '')
    setBirthTime(timeInputValue(profile?.birth_time))
    setGender(profile?.gender ?? '')
    setCalendarType(profile?.calendar_type || 'solar')
  }, [])

  const restoreGuestWorkspace = useCallback(() => {
    const guest = loadGuestSession()
    setListLoading(false)
    setListError('')
    setReadings([])
    setProfileReady(true)
    setEditingId(null)
    setProfileModal(null)
    if (guest?.profile && hasCompleteProfile(guest.profile)) {
      setSavedProfile(guest.profile)
      applyProfile(guest.profile)
    } else {
      setSavedProfile(null)
      applyProfile(null)
    }
    if (guest?.result) {
      setSelectedReading({
        id: 'local-temp',
        result: guest.result,
        created_at: guest.createdAt || null,
      })
      setDraftResult(guest.result)
      setIsViewing(true)
    } else {
      setSelectedReading(null)
      setDraftResult('')
      setIsViewing(false)
    }
  }, [applyProfile])

  const loadReadingCount = useCallback(async () => {
    const { data, error: countError } = await supabase.rpc('count_saju_readings')
    if (countError) {
      console.error(countError)
      return
    }
    const next = Number(data)
    if (Number.isFinite(next) && next >= 0) setReadingCount(next)
  }, [])

  const loadReadings = useCallback(async () => {
    setListLoading(true)
    const { data, error: loadError } = await supabase
      .from('saju_readings')
      .select(READING_SELECT)
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      setListError(loadError.message || '목록을 불러오지 못했습니다.')
      setListLoading(false)
      return []
    }

    setListError('')
    setListLoading(false)
    const next = data ?? []
    setReadings(next)
    return next
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    if (!authReady) return

    if (!user) {
      if (!guestHydratedRef.current) {
        restoreGuestWorkspace()
        guestHydratedRef.current = true
      }
      return
    }

    guestHydratedRef.current = false
    let cancelled = false

    async function hydrateUser() {
      setProfileReady(false)
      const guest = loadGuestSession()

      try {
        let profile = null
        try {
          profile = await loadUserProfile(user.id)
        } catch (err) {
          console.error(err)
          if (!cancelled) {
            setError(err.message || '저장된 사주 정보를 불러오지 못했습니다.')
          }
        }
        if (cancelled) return

        if (guest?.profile && hasCompleteProfile(guest.profile) && !hasCompleteProfile(profile)) {
          try {
            profile = await upsertUserProfile(user.id, guest.profile)
          } catch (err) {
            console.error(err)
          }
        }
        if (cancelled) return

        setSavedProfile(profile)
        applyProfile(profile)
        if (!hasCompleteProfile(profile)) {
          setProfileModal('onboard')
        }

        await loadReadings()
        if (cancelled) return

        if (guest?.result) {
          const { data, error: saveError } = await supabase
            .from('saju_readings')
            .insert({ result: guest.result, user_id: user.id })
            .select(READING_SELECT)
            .single()

          if (cancelled) return

          if (saveError) {
            console.error(saveError)
            setSelectedReading({ id: 'local-temp', result: guest.result })
            setDraftResult(guest.result)
            setIsViewing(true)
          } else {
            setSelectedReading(data)
            setDraftResult(data.result ?? '')
            setIsViewing(true)
            await loadReadings()
            if (!cancelled) await loadReadingCount()
          }
          showToast('이제 전체 풀이를 볼 수 있다냥')
        }

        clearGuestSession()
      } finally {
        if (!cancelled) setProfileReady(true)
      }
    }

    hydrateUser()
    return () => {
      cancelled = true
    }
  }, [authReady, user, applyProfile, loadReadings, loadReadingCount, restoreGuestWorkspace, showToast])

  useEffect(() => {
    if (!authReady) return
    loadReadingCount()
  }, [authReady, loadReadingCount])

  useEffect(() => {
    if (!selectedReading) return
    readingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedReading?.id])

  async function handleGoogleSignIn() {
    setAuthError('')
    setAuthBusy(true)
    try {
      if (!user) {
        saveGuestSession({
          profile: savedProfile && hasCompleteProfile(savedProfile) ? savedProfile : null,
          result: selectedReading?.result || pendingResultRef.current || '',
          createdAt: selectedReading?.created_at || new Date().toISOString(),
        })
      }
      await signInWithGoogle()
    } catch (err) {
      console.error(err)
      setAuthError(err.message || 'Google 로그인에 실패했습니다.')
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    setAuthError('')
    setAuthBusy(true)
    try {
      clearGuestSession()
      resetWorkspace()
      setProfileReady(true)
      guestHydratedRef.current = true
      await signOut()
    } catch (err) {
      console.error(err)
      setAuthError(err.message || '로그아웃에 실패했습니다.')
    } finally {
      setAuthBusy(false)
    }
  }

  function handleSelectReading(reading) {
    if (selectedReading?.id === reading.id && !editingId) {
      setSelectedReading(null)
      setIsViewing(false)
      setEditingId(null)
      setDraftResult('')
      return
    }
    setSelectedReading(reading)
    setIsViewing(true)
    setEditingId(null)
    setDraftResult(reading.result ?? '')
    setError('')
  }

  function handleNewReading() {
    if (!selectedReading && !editingId) {
      showToast('이미 새 사주 화면이 열려 있다냥')
      setNewPanelPulse(false)
      window.requestAnimationFrame(() => setNewPanelPulse(true))
      return
    }
    setSelectedReading(null)
    setIsViewing(false)
    setEditingId(null)
    setDraftResult('')
    setError('')
    pendingResultRef.current = ''
    if (!user) {
      saveGuestSession({
        profile: savedProfile && hasCompleteProfile(savedProfile) ? savedProfile : null,
        result: '',
        createdAt: new Date().toISOString(),
      })
    }
  }

  function handleStartEdit() {
    if (!selectedReading || selectedReading.id === 'local-temp') return
    setEditingId(selectedReading.id)
    setDraftResult(selectedReading.result ?? '')
    setIsViewing(false)
    setError('')
  }

  function handleCancelEdit() {
    if (!editingId) return
    if (savedProfile?.name) applyProfile(savedProfile)
    const current = readings.find((r) => r.id === editingId) || selectedReading
    setEditingId(null)
    if (current) {
      setSelectedReading(current)
      setDraftResult(current.result ?? '')
      setIsViewing(true)
    }
    setError('')
  }

  async function handleSaveProfile(form) {
    const payload = profilePayloadFromForm(form)
    if (!user) {
      setSavedProfile(payload)
      applyProfile(payload)
      setProfileModal(null)
      setError('')
      saveGuestSession({
        profile: payload,
        result: selectedReading?.result || '',
        createdAt: selectedReading?.created_at,
      })
      return
    }
    setProfileSaving(true)
    try {
      const nextProfile = await upsertUserProfile(user.id, payload)
      setSavedProfile(nextProfile)
      applyProfile(nextProfile)
      setProfileModal(null)
      setError('')
    } finally {
      setProfileSaving(false)
    }
  }

  function openProfileEditor() {
    if (isBusy || profileSaving) return
    setProfileModal('edit')
  }

  async function handleSaveMeta(e) {
    e.preventDefault()
    if (!editingId || !user) return

    setIsSaving(true)
    setError('')

    try {
      const { data, error: updateError } = await supabase
        .from('saju_readings')
        .update({ result: draftResult })
        .eq('id', editingId)
        .select(READING_SELECT)
        .single()

      if (updateError) {
        console.error(updateError)
        setError(updateError.message || '수정에 실패했습니다.')
        return
      }

      setSelectedReading(data)
      setEditingId(null)
      setIsViewing(true)
      setDraftResult(data.result ?? '')
      await loadReadings()
    } catch (err) {
      console.error(err)
      setError(err.message || '수정에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedReading || selectedReading.id === 'local-temp') return
    if (!window.confirm('이 해석 기록을 삭제할까요?')) return

    setIsDeleting(true)
    setError('')

    const { error: deleteError } = await supabase
      .from('saju_readings')
      .delete()
      .eq('id', selectedReading.id)

    setIsDeleting(false)

    if (deleteError) {
      console.error(deleteError)
      setError(deleteError.message || '삭제에 실패했습니다.')
      return
    }

    handleNewReading()
    await loadReadings()
  }

  async function handleShare() {
    if (!selectedReading?.share_token || selectedReading.id === 'local-temp') {
      showToast('저장한 기록만 공유할 수 있다냥')
      return
    }

    const url = sharedResultUrl(selectedReading.share_token)
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${name || '무냥이'}의 사주`,
          text: '무냥이가 풀어 준 사주를 보거라냥',
          url,
        })
        return
      }
      await navigator.clipboard.writeText(url)
      showToast('공유 링크를 복사했다냥')
    } catch (err) {
      if (err?.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(url)
        showToast('공유 링크를 복사했다냥')
      } catch {
        showToast('링크 복사에 실패했다냥')
      }
    }
  }

  async function handleAnalyze(e) {
    e.preventDefault()
    setError('')

    if (!hasCompleteProfile(savedProfile)) {
      setProfileModal('onboard')
      return
    }

    if (!editingId) {
      setSelectedReading(null)
      setIsViewing(false)
    }
    pendingResultRef.current = ''

    setRitualPhase('loading')
    try {
      const prompt = buildSajuPrompt({ name, birthDate, birthTime, gender, calendarType })
      const text = await askGemini(prompt)
      pendingResultRef.current = text
      setRitualPhase('bursting')
    } catch (err) {
      setRitualPhase(null)
      setError(err.message || '해석 중 오류가 발생했습니다.')
    }
  }

  const handleBurstEnd = useCallback(async () => {
    const text = pendingResultRef.current
    pendingResultRef.current = ''
    setRitualPhase(null)

    if (!text) return

    if (!user) {
      const createdAt = new Date().toISOString()
      setSelectedReading({ id: 'local-temp', result: text, created_at: createdAt })
      setDraftResult(text)
      setIsViewing(true)
      saveGuestSession({
        profile: savedProfile && hasCompleteProfile(savedProfile) ? savedProfile : null,
        result: text,
        createdAt,
      })
      return
    }

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from('saju_readings')
        .update({ result: text })
        .eq('id', editingId)
        .select(READING_SELECT)
        .single()

      if (updateError) {
        console.error(updateError)
        setError('해석은 완료됐지만 수정 저장에 실패했습니다. 결과는 오른쪽에 잠시 보여 드립니다.')
        setSelectedReading({ id: editingId, result: text })
        setDraftResult(text)
        setIsViewing(true)
        return
      }

      setSelectedReading(data)
      setDraftResult(data.result ?? '')
      setEditingId(null)
      setIsViewing(true)
      await loadReadings()
      return
    }

    const { data, error: saveError } = await supabase
      .from('saju_readings')
      .insert({ result: text, user_id: user.id })
      .select(READING_SELECT)
      .single()

    if (saveError) {
      console.error(saveError)
      setError('해석은 완료됐지만 저장에 실패했습니다. 결과는 오른쪽에 잠시 보여 드립니다.')
      setSelectedReading({ id: 'local-temp', result: text })
      setDraftResult(text)
      setIsViewing(true)
      return
    }

    setSelectedReading(data)
    setDraftResult(data.result ?? '')
    setIsViewing(true)
    await loadReadings()
    await loadReadingCount()
  }, [editingId, loadReadings, loadReadingCount, savedProfile, user])

  const isBusy = ritualPhase === 'loading' || ritualPhase === 'bursting'
  const formLocked = isBusy || isViewing || isSaving || isDeleting
  const isEditing = Boolean(editingId)
  const profileComplete = hasCompleteProfile(savedProfile)
  const canMutate =
    Boolean(user) &&
    selectedReading &&
    selectedReading.id !== 'local-temp' &&
    !isBusy &&
    !isSaving &&
    !isDeleting
  const forceOnboard = Boolean(user) && profileReady && !profileComplete
  const showOnboardModal = profileModal === 'onboard' || forceOnboard
  const isGuestLocked = !user && Boolean(selectedReading?.result)

  if (!authReady) {
    return (
      <div className="auth-screen">
        <div className="talisman auth-card">
          <TalismanCorners />
          <Mascot pose="meet" size="sm" still className="auth-card__mascot" />
          <p className="auth-card__caption">세션을 확인하는 중…</p>
        </div>
      </div>
    )
  }

  const displayName = user ? getUserDisplayName(user) : ''
  const avatarUrl = user ? getUserAvatarUrl(user) : ''
  const sajuName = savedProfile?.name || displayName || '손님'
  const visibleResult = isGuestLocked
    ? previewReadingText(selectedReading?.result)
    : selectedReading?.result

  return (
    <>
    <div className="app-shell">
      <header className="auth-bar" aria-label="계정">
        {user ? (
          <>
            <button
              type="button"
              className="auth-bar__user auth-bar__user--button"
              onClick={openProfileEditor}
              disabled={!profileComplete || isBusy || profileSaving}
              aria-haspopup="dialog"
            >
              {avatarUrl ? (
                <img className="auth-bar__avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="auth-bar__avatar auth-bar__avatar--fallback" aria-hidden="true">
                  {sajuName.slice(0, 1)}
                </span>
              )}
              <div className="auth-bar__meta">
                <span className="auth-bar__name">{sajuName}</span>
                {user.email && <span className="auth-bar__email">{user.email}</span>}
              </div>
            </button>
            <div className="auth-bar__actions">
              <button
                type="button"
                className="auth-bar__profile"
                onClick={openProfileEditor}
                disabled={!profileComplete || isBusy || profileSaving}
              >
                프로필
              </button>
              <button
                type="button"
                className="auth-bar__signout"
                onClick={handleSignOut}
                disabled={authBusy || isBusy}
              >
                {authBusy ? '처리 중…' : '로그아웃'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="auth-bar__user">
              <span className="auth-bar__avatar auth-bar__avatar--fallback" aria-hidden="true">
                냥
              </span>
              <div className="auth-bar__meta">
                <span className="auth-bar__name">{sajuName}</span>
                <span className="auth-bar__email">풀이는 먼저, 기록은 로그인 후다냥</span>
              </div>
            </div>
            <div className="auth-bar__actions">
              <button
                type="button"
                className="auth-google auth-google--bar"
                onClick={handleGoogleSignIn}
                disabled={authBusy || isBusy}
              >
                <GoogleGlyph />
                <span>{authBusy ? '이동 중…' : 'Google로 계속하기'}</span>
              </button>
            </div>
          </>
        )}
      </header>

      <aside className="sidebar sidebar--records" aria-label="저장된 사주 목록">
        <div className="talisman sidebar__frame">
          <TalismanCorners />

          <p className="sidebar__seal">符</p>
          <p className="sidebar__title">記錄</p>
          <p className="sidebar__caption">사주 기록</p>

          <div className="sidebar__divider" aria-hidden="true" />

          {listLoading ? (
            <p className="sidebar__empty">기록을 불러오는 중…</p>
          ) : listError ? (
            <div className="sidebar__empty-block">
              <p className="sidebar__empty">{listError}</p>
              <button type="button" className="sidebar__retry" onClick={loadReadings}>
                다시 불러오기
              </button>
            </div>
          ) : readings.length === 0 ? (
            <p className="sidebar__empty">
              {user ? '아직 기록이 없다냥' : '손님의 기록은 아직 없다냥'}
              <span className="sidebar__empty-hint">
                {user
                  ? '첫 사주를 풀어 부적을 남겨 보라냥'
                  : '로그인하면 풀이를 남겨 두겠다냥'}
              </span>
            </p>
          ) : (
            <ul className="sidebar__list">
              {readings.map((reading) => (
                <li key={reading.id}>
                  <button
                    type="button"
                    className={`sidebar__item${selectedReading?.id === reading.id ? ' sidebar__item--active' : ''}`}
                    onClick={() => handleSelectReading(reading)}
                    disabled={isBusy || isSaving || isDeleting}
                  >
                    <span className="sidebar__item-mark" aria-hidden="true">
                      ✦
                    </span>
                    <span className="sidebar__item-date">{formatReadingWhen(reading.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className={`talisman app${isViewing ? ' app--viewing' : ''}${isEditing ? ' app--editing' : ''}`}>
        <TalismanCorners />

        <Mascot pose="bow" size="md" still className="app__mascot" />
        <span className="app__mark">宿命 · SAJU</span>
        <h1>무냥이의 사주풀이</h1>

        <section className="profile-card" aria-label="저장된 사주 정보">
          {!profileReady ? (
            <p className="profile-card__loading">사주 정보를 불러오는 중…</p>
          ) : profileComplete ? (
            <>
              <p className="profile-card__seal">命</p>
              <h2 className="profile-card__name">{name}</h2>
              <p className="profile-card__meta">
                {formatMeta({ birthDate, birthTime, gender, calendarType })}
              </p>
              <button
                type="button"
                className="profile-card__edit"
                onClick={openProfileEditor}
                disabled={isBusy || isSaving || isDeleting}
              >
                프로필 수정
              </button>
            </>
          ) : (
            <>
              <p className="profile-card__seal">命</p>
              <p className="profile-card__empty">사주 정보가 아직 없다냥</p>
              <button
                type="button"
                className="profile-card__edit"
                onClick={() => setProfileModal('onboard')}
                disabled={isBusy}
              >
                정보 입력하기
              </button>
            </>
          )}
        </section>

        {isViewing && selectedReading && (
          <div className="app__view-banner" role="status">
            <p>
              {isGuestLocked ? (
                <>앞부분만 열려 있다냥. 나머지는 로그인하면 보여 주겠다냥</>
              ) : (
                <>
                  <strong>{name || '나'}</strong>의 기록을 보고 있습니다
                </>
              )}
            </p>
          </div>
        )}

        {isEditing && (
          <div className="app__view-banner app__view-banner--edit" role="status">
            <p>해석 내용을 수정 중입니다</p>
            <button type="button" onClick={handleCancelEdit} disabled={isBusy || isSaving}>
              수정 취소
            </button>
          </div>
        )}

        <form
          onSubmit={isEditing ? handleSaveMeta : handleAnalyze}
          className={formLocked && isViewing ? 'app__form--dim' : undefined}
        >
          {isEditing && (
            <div className="app__field app__field--result">
              <label htmlFor="draftResult">해석 내용</label>
              <textarea
                id="draftResult"
                value={draftResult}
                onChange={(e) => setDraftResult(e.target.value)}
                disabled={formLocked}
                rows={8}
              />
              <span className="app__hint">내용을 고친 뒤 저장하거나, 아래에서 다시 해석할 수 있습니다</span>
            </div>
          )}

          {isEditing ? (
            <div className="app__submit-row">
              <button type="submit" className="app__submit" disabled={formLocked}>
                {isSaving ? '저장 중…' : '해석 저장'}
              </button>
              <button
                type="button"
                className="app__submit app__submit--secondary"
                onClick={handleAnalyze}
                disabled={formLocked}
              >
                {isBusy ? '풀이 중…' : '다시 해석해 저장'}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="app__submit"
              disabled={formLocked}
            >
              {isBusy
                ? '풀이 중…'
                : isViewing
                  ? '열람 중'
                  : profileComplete
                    ? '사주 해석하기'
                    : '정보 입력하고 풀이하기'}
            </button>
          )}
        </form>

        {!isViewing && !isEditing && readingCount != null && (
          <p className="app__stat">
            <span className="app__stat-mark" aria-hidden="true">
              ✦
            </span>
            이때까지 총{' '}
            <strong>{readingCount.toLocaleString('ko-KR')}</strong>
            개의 사주가 생성되었습니다
          </p>
        )}

        {error && <p className="app__error">{error}</p>}
        {authError && <p className="app__error">{authError}</p>}
      </div>

      <aside className="sidebar sidebar--action" aria-label="새 사주 또는 해석 결과">
        {selectedReading ? (
          <article
            ref={readingPanelRef}
            key={selectedReading.id}
            className={`talisman reading-panel reading-panel--reveal${isGuestLocked ? ' reading-panel--gated' : ''}`}
            aria-label={`${name || '나'}의 사주 결과`}
          >
            <TalismanCorners />

            <header className="reading-panel__header">
              <Mascot pose="glare" size="md" line className="reading-panel__mascot" />
              <p className="reading-panel__mark">宿命 解讀</p>
              <h2 className="reading-panel__name">{name || '사주 결과'}</h2>
              <p className="reading-panel__meta">
                {formatMeta({ birthDate, birthTime, gender, calendarType })}
              </p>
              <button
                type="button"
                className="reading-panel__close"
                onClick={() => {
                  setSelectedReading(null)
                  setIsViewing(false)
                  setEditingId(null)
                  setDraftResult('')
                }}
                aria-label="결과 닫기"
              >
                닫기
              </button>
            </header>

            <div className="reading-panel__divider" aria-hidden="true" />

            <div className="reading-panel__body">
              <p className="reading-panel__result">{visibleResult}</p>
              {isGuestLocked && (
                <div className="reading-panel__gate">
                  <div className="reading-panel__fog" aria-hidden="true">
                    <p>팔자의 깊은 결이 안개 너머에 가려져 있다냥</p>
                    <p>대운과 세운, 약점과 재능의 속살이 여기 있다</p>
                    <p>아직 열어주지 않은 명이 남았다냥</p>
                    <p>호오… 이 자리는 로그인해야 보여 주겠다</p>
                  </div>
                  <div className="reading-panel__gate-card">
                    <Mascot pose="meet" size="sm" still className="reading-panel__gate-mascot" />
                    <p className="reading-panel__gate-title">여기까지는 그냥 보여 주겠다냥</p>
                    <p className="reading-panel__gate-lead">
                      나머지 운명도 보려면 이름을 남겨라냥
                    </p>
                    <button
                      type="button"
                      className="auth-google"
                      onClick={handleGoogleSignIn}
                      disabled={authBusy}
                    >
                      <GoogleGlyph />
                      <span>{authBusy ? 'Google로 이동 중…' : 'Google로 나머지 보기'}</span>
                    </button>
                    {authError && <p className="reading-panel__gate-error">{authError}</p>}
                  </div>
                </div>
              )}
            </div>

            <footer className="reading-panel__footer">
              <div className="reading-panel__actions">
                {isGuestLocked ? (
                  <button type="button" className="reading-panel__new" onClick={handleNewReading}>
                    <span aria-hidden="true">+</span> 새 사주 만들기
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="reading-panel__action"
                      onClick={handleShare}
                      disabled={!canMutate || !selectedReading.share_token}
                    >
                      공유
                    </button>
                    <button
                      type="button"
                      className="reading-panel__action"
                      onClick={handleStartEdit}
                      disabled={!canMutate || isEditing}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="reading-panel__action reading-panel__action--danger"
                      onClick={handleDelete}
                      disabled={!canMutate}
                    >
                      {isDeleting ? '삭제 중…' : '삭제'}
                    </button>
                    <button type="button" className="reading-panel__new" onClick={handleNewReading}>
                      <span aria-hidden="true">+</span> 새 사주 만들기
                    </button>
                  </>
                )}
              </div>
            </footer>
          </article>
        ) : (
          <div
            className={`talisman new-panel${newPanelPulse ? ' new-panel--pulse' : ''}`}
            onAnimationEnd={() => setNewPanelPulse(false)}
          >
            <TalismanCorners />
            <p className="new-panel__seal">始</p>
            <p className="new-panel__title">開運</p>
            <p className="new-panel__caption">새 사주</p>
            <div className="new-panel__divider" aria-hidden="true" />
            <button
              type="button"
              className="sidebar__new new-panel__button"
              onClick={handleNewReading}
              disabled={isBusy}
            >
              <span className="sidebar__new-plus" aria-hidden="true">
                +
              </span>
              <span>새 사주 만들기</span>
            </button>
            <p className="new-panel__hint">
              가운데에서 명을 풀어보라냥
              <br />
              {user ? '왼쪽 기록에서 날짜를 눌러 보라냥' : '나머지 풀이는 로그인하면 열린다냥'}
            </p>
          </div>
        )}
      </aside>
    </div>

      {ritualPhase && (
        <LoadingRitual phase={ritualPhase} onBurstEnd={handleBurstEnd} />
      )}

      {toast && (
        <div
          key={toast.id}
          className={`app-toast${toast.leaving ? ' app-toast--out' : ''}`}
          role="status"
          aria-live="polite"
          onAnimationEnd={(event) => {
            if (event.animationName === 'toast-out') setToast(null)
          }}
        >
          {toast.message}
        </div>
      )}

      {(showOnboardModal || profileModal === 'edit') && (
        <ProfileModal
          key={showOnboardModal ? 'onboard' : 'edit'}
          mode={showOnboardModal ? 'onboard' : 'edit'}
          initial={{ name, birthDate, birthTime, gender, calendarType }}
          nameFallback={displayName}
          isSaving={profileSaving}
          onSave={handleSaveProfile}
          onCancel={forceOnboard ? undefined : () => setProfileModal(null)}
        />
      )}
    </>
  )
}

export default App
