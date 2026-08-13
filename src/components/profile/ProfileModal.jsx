import { useEffect, useRef, useState } from 'react'
import TalismanCorners from '../ui/TalismanCorners.jsx'
import '../../styles/form.css'
import './profile.css'

export default function ProfileModal({
  mode,
  initial,
  nameFallback = '',
  isSaving = false,
  onSave,
  onCancel,
}) {
  const nameInputRef = useRef(null)
  const [name, setName] = useState(initial?.name || nameFallback || '')
  const [birthDate, setBirthDate] = useState(initial?.birthDate || '')
  const [birthTime, setBirthTime] = useState(initial?.birthTime || '')
  const [gender, setGender] = useState(initial?.gender || '')
  const [calendarType, setCalendarType] = useState(initial?.calendarType || 'solar')
  const [error, setError] = useState('')

  const isOnboard = mode === 'onboard'

  useEffect(() => {
    nameInputRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' && !isSaving) {
        onCancel?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSaving, onCancel])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim() || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 필수입니다.')
      return
    }
    setError('')
    try {
      await onSave({
        name: name.trim(),
        birthDate,
        birthTime,
        gender,
        calendarType,
      })
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.')
    }
  }

  return (
    <div
      className="profile-modal"
      role="presentation"
      onClick={() => {
        if (!isSaving) onCancel?.()
      }}
    >
      <div
        className="talisman profile-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <TalismanCorners />
        <p className="profile-modal__seal">命</p>
        <span className="profile-modal__mark">宿命 · PROFILE</span>
        <h2 id="profile-modal-title" className="profile-modal__title">
          {isOnboard ? '사주 정보 입력' : '프로필 수정'}
        </h2>
        <p className="profile-modal__lead">
          {isOnboard
            ? '사주를 풀려면 네 명이 필요하다냥. 생년월일을 적으면 바로 풀어 주겠다냥.'
            : '저장된 사주 정보를 고치면 이후 풀이에 바로 반영된다냥.'}
        </p>
        <div className="profile-modal__divider" aria-hidden="true" />

        <form className="profile-modal__form" onSubmit={handleSubmit}>
          <div className="app__field">
            <label htmlFor="profile-name">이름</label>
            <input
              ref={nameInputRef}
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              disabled={isSaving}
              autoComplete="name"
              required
            />
          </div>

          <div className="app__field">
            <label htmlFor="profile-birthDate">생년월일</label>
            <input
              id="profile-birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className="app__field">
            <label htmlFor="profile-birthTime">태어난 시간</label>
            <input
              id="profile-birthTime"
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              disabled={isSaving}
            />
            <span className="app__hint">모르면 비워도 됩니다</span>
          </div>

          <div className="app__field app__field--choice">
            <span id="profile-gender-label">성별</span>
            <div className="app__chips" role="group" aria-labelledby="profile-gender-label">
              <button
                type="button"
                className={`app__chip${gender === 'male' ? ' app__chip--active' : ''}`}
                onClick={() => setGender('male')}
                disabled={isSaving}
                aria-pressed={gender === 'male'}
              >
                남성
              </button>
              <button
                type="button"
                className={`app__chip${gender === 'female' ? ' app__chip--active' : ''}`}
                onClick={() => setGender('female')}
                disabled={isSaving}
                aria-pressed={gender === 'female'}
              >
                여성
              </button>
            </div>
          </div>

          <div className="app__field app__field--choice">
            <span id="profile-calendar-label">양력 / 음력</span>
            <div className="app__chips" role="group" aria-labelledby="profile-calendar-label">
              <button
                type="button"
                className={`app__chip${calendarType === 'solar' ? ' app__chip--active' : ''}`}
                onClick={() => setCalendarType('solar')}
                disabled={isSaving}
                aria-pressed={calendarType === 'solar'}
              >
                양력
              </button>
              <button
                type="button"
                className={`app__chip${calendarType === 'lunar' ? ' app__chip--active' : ''}`}
                onClick={() => setCalendarType('lunar')}
                disabled={isSaving}
                aria-pressed={calendarType === 'lunar'}
              >
                음력
              </button>
            </div>
          </div>

          {error && <p className="profile-modal__error">{error}</p>}

          <div className="profile-modal__actions">
            <button
              type="submit"
              className="app__submit"
              disabled={isSaving}
              data-ga-event="profile_save"
              data-ga-location="profile_modal"
            >
              {isSaving ? '저장 중…' : isOnboard ? '저장하고 시작하겠다냥' : '프로필 저장'}
            </button>
            {onCancel && (
              <button
                type="button"
                className="app__submit app__submit--secondary"
                onClick={onCancel}
                disabled={isSaving}
                data-ga-event="profile_cancel"
                data-ga-location="profile_modal"
              >
                취소
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
