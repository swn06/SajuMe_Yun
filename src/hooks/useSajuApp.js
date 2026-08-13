import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { getUserAvatarUrl, getUserDisplayName, signInWithGoogle, signOut } from '../lib/auth.js'
import {
  hasCompleteProfile,
  loadUserProfile,
  profilePayloadFromForm,
  upsertUserProfile,
} from '../lib/users.js'
import { sharedResultUrl, timeInputValue } from '../lib/format.js'
import {
  clearGuestSession,
  loadGuestSession,
  previewReadingText,
  saveGuestSession,
} from '../lib/guestSession.js'
import { buildSajuPrompt } from '../lib/prompt.js'
import { askGemini } from '../lib/gemini.js'
import {
  countSajuReadings,
  deleteReading,
  insertReading,
  listReadings,
  updateReadingResult,
} from '../lib/readings.js'
import { setAnalyticsUser, trackEvent } from '../lib/analytics.js'

export function useSajuApp() {
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
    try {
      const next = await countSajuReadings()
      if (next != null) setReadingCount(next)
    } catch (countError) {
      console.error(countError)
    }
  }, [])

  const loadReadings = useCallback(async () => {
    setListLoading(true)
    try {
      const next = await listReadings()
      setListError('')
      setReadings(next)
      setListLoading(false)
      return next
    } catch (loadError) {
      console.error(loadError)
      setListError(loadError.message || '목록을 불러오지 못했습니다.')
      setListLoading(false)
      return []
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      const nextUser = data.session?.user ?? null
      setUser(nextUser)
      setAuthReady(true)
      setAnalyticsUser(nextUser?.id ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setAuthReady(true)
      setAnalyticsUser(nextUser?.id ?? null)
      if (event === 'SIGNED_IN' && nextUser) {
        trackEvent('login', { method: 'google' })
      }
      if (event === 'SIGNED_OUT') {
        trackEvent('logout')
      }
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
          try {
            const data = await insertReading(user.id, guest.result)
            if (cancelled) return
            setSelectedReading(data)
            setDraftResult(data.result ?? '')
            setIsViewing(true)
            await loadReadings()
            if (!cancelled) await loadReadingCount()
          } catch (saveError) {
            console.error(saveError)
            if (cancelled) return
            setSelectedReading({ id: 'local-temp', result: guest.result })
            setDraftResult(guest.result)
            setIsViewing(true)
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
    if (!authReady) return undefined

    let cancelled = false
    ;(async () => {
      try {
        const next = await countSajuReadings()
        if (!cancelled && next != null) setReadingCount(next)
      } catch (countError) {
        console.error(countError)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authReady])

  useEffect(() => {
    if (!selectedReading?.id) return
    readingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedReading?.id])

  async function handleGoogleSignIn(source = 'unknown') {
    setAuthError('')
    setAuthBusy(true)
    trackEvent('login_click', { method: 'google', source })
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
      trackEvent('login_fail', { method: 'google', source })
      setAuthError(err.message || 'Google 로그인에 실패했습니다.')
    } finally {
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
    trackEvent('select_content', { content_type: 'saju_reading' })
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
    trackEvent('new_reading', { logged_in: Boolean(user) })
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
    trackEvent('reading_edit')
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
    const mode = profileModal === 'edit' ? 'edit' : 'onboard'
    trackEvent('profile_save', { mode, logged_in: Boolean(user) })
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
    trackEvent('profile_open', { source: 'edit' })
    setProfileModal('edit')
  }

  async function handleSaveMeta(e) {
    e.preventDefault()
    if (!editingId || !user) return

    setIsSaving(true)
    setError('')

    try {
      const data = await updateReadingResult(editingId, draftResult)
      setSelectedReading(data)
      setEditingId(null)
      setIsViewing(true)
      setDraftResult(data.result ?? '')
      await loadReadings()
      trackEvent('reading_save')
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

    try {
      await deleteReading(selectedReading.id)
      trackEvent('reading_delete')
    } catch (deleteError) {
      console.error(deleteError)
      setIsDeleting(false)
      setError(deleteError.message || '삭제에 실패했습니다.')
      return
    }

    setIsDeleting(false)
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
        trackEvent('share', { method: 'native', content_type: 'saju_reading' })
        return
      }
      await navigator.clipboard.writeText(url)
      trackEvent('share', { method: 'clipboard', content_type: 'saju_reading' })
      showToast('공유 링크를 복사했다냥')
    } catch (err) {
      if (err?.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(url)
        trackEvent('share', { method: 'clipboard', content_type: 'saju_reading' })
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
      trackEvent('profile_open', { source: 'analyze' })
      setProfileModal('onboard')
      return
    }

    if (!editingId) {
      setSelectedReading(null)
      setIsViewing(false)
    }
    pendingResultRef.current = ''

    trackEvent('saju_analyze', {
      logged_in: Boolean(user),
      is_reanalyze: Boolean(editingId),
      calendar_type: calendarType,
      gender,
    })
    setRitualPhase('loading')
    try {
      const prompt = buildSajuPrompt({ name, birthDate, birthTime, gender, calendarType })
      const text = await askGemini(prompt)
      pendingResultRef.current = text
      setRitualPhase('bursting')
    } catch (err) {
      setRitualPhase(null)
      trackEvent('saju_analyze_fail')
      setError(err.message || '해석 중 오류가 발생했습니다.')
    }
  }

  const handleBurstEnd = useCallback(async () => {
    const text = pendingResultRef.current
    pendingResultRef.current = ''
    setRitualPhase(null)

    if (!text) return

    trackEvent('saju_analyze_complete', {
      logged_in: Boolean(user),
      is_reanalyze: Boolean(editingId),
    })

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
      try {
        const data = await updateReadingResult(editingId, text)
        setSelectedReading(data)
        setDraftResult(data.result ?? '')
        setEditingId(null)
        setIsViewing(true)
        await loadReadings()
      } catch (updateError) {
        console.error(updateError)
        setError('해석은 완료됐지만 수정 저장에 실패했습니다. 결과는 오른쪽에 잠시 보여 드립니다.')
        setSelectedReading({ id: editingId, result: text })
        setDraftResult(text)
        setIsViewing(true)
      }
      return
    }

    try {
      const data = await insertReading(user.id, text)
      setSelectedReading(data)
      setDraftResult(data.result ?? '')
      setIsViewing(true)
      await loadReadings()
      await loadReadingCount()
    } catch (saveError) {
      console.error(saveError)
      setError('해석은 완료됐지만 저장에 실패했습니다. 결과는 오른쪽에 잠시 보여 드립니다.')
      setSelectedReading({ id: 'local-temp', result: text })
      setDraftResult(text)
      setIsViewing(true)
    }
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

  const displayName = user ? getUserDisplayName(user) : ''
  const avatarUrl = user ? getUserAvatarUrl(user) : ''
  const sajuName = savedProfile?.name || displayName || '손님'
  const visibleResult = isGuestLocked
    ? previewReadingText(selectedReading?.result)
    : selectedReading?.result

  function handleCloseReading() {
    trackEvent('reading_close')
    setSelectedReading(null)
    setIsViewing(false)
    setEditingId(null)
    setDraftResult('')
  }

  return {
    authReady,
    ritualPhase,
    handleBurstEnd,
    toast,
    dismissToast: () => setToast(null),
    selectedReading,
    showOnboardModal,
    profileModal,
    forceOnboard,
    closeProfileModal: () => setProfileModal(null),
    handleSaveProfile,
    displayName,
    name,
    birthDate,
    birthTime,
    gender,
    calendarType,
    profileSaving,
    authBar: {
      user,
      sajuName,
      avatarUrl,
      profileComplete,
      isBusy,
      profileSaving,
      authBusy,
      onOpenProfile: openProfileEditor,
      onSignOut: handleSignOut,
      onGoogleSignIn: handleGoogleSignIn,
    },
    readingList: {
      user,
      readings,
      selectedReading,
      listLoading,
      listError,
      isBusy,
      isSaving,
      isDeleting,
      onRetry: loadReadings,
      onSelect: handleSelectReading,
    },
    workspace: {
      isViewing,
      isEditing,
      name,
      birthDate,
      birthTime,
      gender,
      calendarType,
      profileReady,
      profileComplete,
      isBusy,
      isSaving,
      isDeleting,
      formLocked,
      draftResult,
      readingCount,
      error,
      authError,
      isGuestLocked,
      selectedReading,
      onOpenProfile: openProfileEditor,
      onOnboard: () => {
        trackEvent('profile_open', { source: 'card' })
        setProfileModal('onboard')
      },
      onCancelEdit: handleCancelEdit,
      onSaveMeta: handleSaveMeta,
      onAnalyze: handleAnalyze,
      onDraftChange: (e) => setDraftResult(e.target.value),
    },
    readingPanel: selectedReading
      ? {
          panelRef: readingPanelRef,
          selectedReading,
          name,
          birthDate,
          birthTime,
          gender,
          calendarType,
          visibleResult,
          isGuestLocked,
          canMutate,
          isEditing,
          isDeleting,
          authBusy,
          authError,
          onClose: handleCloseReading,
          onShare: handleShare,
          onStartEdit: handleStartEdit,
          onDelete: handleDelete,
          onNewReading: handleNewReading,
          onGoogleSignIn: handleGoogleSignIn,
        }
      : null,
    newPanel: {
      user,
      isBusy,
      pulse: newPanelPulse,
      onPulseEnd: () => setNewPanelPulse(false),
      onNewReading: handleNewReading,
    },
  }
}
