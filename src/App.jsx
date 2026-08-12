import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { buildSajuPrompt } from './prompt.js'
import LoadingRitual from './LoadingRitual.jsx'
import { supabase } from './lib/supabase.js'

const READING_SELECT =
  'id, name, birth_date, birth_time, gender, calendar_type, result, created_at'

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

function formatGender(value) {
  if (value === 'male') return '남성'
  if (value === 'female') return '여성'
  return value
}

function formatCalendar(value) {
  if (value === 'solar') return '양력'
  if (value === 'lunar') return '음력'
  return value
}

function formatMeta(reading) {
  const parts = [
    reading.birth_date,
    reading.birth_time ? String(reading.birth_time).slice(0, 5) : null,
    formatGender(reading.gender),
    formatCalendar(reading.calendar_type),
  ].filter(Boolean)
  return parts.join(' · ')
}

function timeInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function App() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  /** null | 'loading' | 'bursting' */
  const [ritualPhase, setRitualPhase] = useState(null)
  const pendingResultRef = useRef('')
  const nameInputRef = useRef(null)
  const readingPanelRef = useRef(null)

  const [error, setError] = useState('')
  const [readings, setReadings] = useState([])
  const [listError, setListError] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [selectedReading, setSelectedReading] = useState(null)
  const [isViewing, setIsViewing] = useState(false)
  /** null | uuid — 수정 중인 기록 id */
  const [editingId, setEditingId] = useState(null)
  const [draftResult, setDraftResult] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadReadings = useCallback(async () => {
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
    loadReadings()
  }, [loadReadings])

  useEffect(() => {
    if (!selectedReading) return
    readingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedReading?.id])

  function fillFormFromReading(reading) {
    setName(reading.name ?? '')
    setBirthDate(reading.birth_date ?? '')
    setBirthTime(timeInputValue(reading.birth_time))
    setGender(reading.gender ?? '')
    setCalendarType(reading.calendar_type || 'solar')
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
    setName('')
    setBirthDate('')
    setBirthTime('')
    setGender('')
    setCalendarType('solar')
    setSelectedReading(null)
    setIsViewing(false)
    setEditingId(null)
    setDraftResult('')
    setError('')
    pendingResultRef.current = ''
    window.requestAnimationFrame(() => nameInputRef.current?.focus())
  }

  function handleStartEdit() {
    if (!selectedReading || selectedReading.id === 'local-temp') return
    fillFormFromReading(selectedReading)
    setEditingId(selectedReading.id)
    setDraftResult(selectedReading.result ?? '')
    setIsViewing(false)
    setError('')
    window.requestAnimationFrame(() => nameInputRef.current?.focus())
  }

  function handleCancelEdit() {
    if (!editingId) return
    const current = readings.find((r) => r.id === editingId) || selectedReading
    setEditingId(null)
    if (current) {
      setSelectedReading(current)
      setDraftResult(current.result ?? '')
      setIsViewing(true)
    }
    setError('')
  }

  async function handleSaveMeta(e) {
    e.preventDefault()
    if (!editingId) return

    if (!name || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 필수입니다.')
      return
    }

    setIsSaving(true)
    setError('')

    const payload = {
      name,
      birth_date: birthDate,
      birth_time: birthTime || null,
      gender,
      calendar_type: calendarType,
      result: draftResult,
    }

    const { data, error: updateError } = await supabase
      .from('saju_readings')
      .update(payload)
      .eq('id', editingId)
      .select(READING_SELECT)
      .single()

    setIsSaving(false)

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
  }

  async function handleDelete() {
    if (!selectedReading || selectedReading.id === 'local-temp') return
    if (!window.confirm(`「${selectedReading.name}」 기록을 삭제할까요?`)) return

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

  async function handleAnalyze(e) {
    e.preventDefault()
    setError('')
    if (!editingId) {
      setSelectedReading(null)
      setIsViewing(false)
    }
    pendingResultRef.current = ''

    if (!name || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 필수입니다.')
      return
    }

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

    const payload = {
      name,
      birth_date: birthDate,
      birth_time: birthTime || null,
      gender,
      calendar_type: calendarType,
      result: text,
    }

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from('saju_readings')
        .update(payload)
        .eq('id', editingId)
        .select(READING_SELECT)
        .single()

      if (updateError) {
        console.error(updateError)
        setError('해석은 완료됐지만 수정 저장에 실패했습니다. 결과는 오른쪽에 잠시 보여 드립니다.')
        setSelectedReading({ id: editingId, ...payload })
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
      .insert(payload)
      .select(READING_SELECT)
      .single()

    if (saveError) {
      console.error(saveError)
      setError('해석은 완료됐지만 저장에 실패했습니다. 결과는 오른쪽에 잠시 보여 드립니다.')
      setSelectedReading({ id: 'local-temp', ...payload })
      setDraftResult(text)
      setIsViewing(true)
      return
    }

    setSelectedReading(data)
    setDraftResult(data.result ?? '')
    setIsViewing(true)
    await loadReadings()
  }, [name, birthDate, birthTime, gender, calendarType, editingId, loadReadings])

  const isBusy = ritualPhase === 'loading' || ritualPhase === 'bursting'
  const formLocked = isBusy || isViewing || isSaving || isDeleting
  const isEditing = Boolean(editingId)
  const canMutate =
    selectedReading && selectedReading.id !== 'local-temp' && !isBusy && !isSaving && !isDeleting

  return (
    <div className="app-shell">
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
              아직 기록이 없습니다
              <span className="sidebar__empty-hint">첫 사주를 풀어 부적을 남겨 보세요</span>
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
                    {reading.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className={`talisman app${isViewing ? ' app--viewing' : ''}${isEditing ? ' app--editing' : ''}`}>
        <TalismanCorners />

        <span className="app__mark">宿命 · SAJU</span>
        <h1>무냥이의 사주풀이</h1>

        {isViewing && selectedReading && (
          <div className="app__view-banner" role="status">
            <p>
              <strong>{selectedReading.name}</strong>의 기록을 보고 있습니다
            </p>
          </div>
        )}

        {isEditing && (
          <div className="app__view-banner app__view-banner--edit" role="status">
            <p>
              <strong>{name || '기록'}</strong>을 수정 중입니다
            </p>
            <button type="button" onClick={handleCancelEdit} disabled={isBusy || isSaving}>
              수정 취소
            </button>
          </div>
        )}

        <form
          onSubmit={isEditing ? handleSaveMeta : handleAnalyze}
          className={formLocked && isViewing ? 'app__form--dim' : undefined}
        >
          <div className="app__field">
            <label htmlFor="name">이름</label>
            <input
              ref={nameInputRef}
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              disabled={formLocked}
              autoComplete="name"
            />
          </div>

          <div className="app__field">
            <label htmlFor="birthDate">생년월일</label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={formLocked}
            />
          </div>

          <div className="app__field">
            <label htmlFor="birthTime">태어난 시간</label>
            <input
              id="birthTime"
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              disabled={formLocked}
            />
            <span className="app__hint">모르면 비워도 됩니다</span>
          </div>

          <div className="app__field app__field--choice">
            <span id="gender-label">성별</span>
            <div className="app__chips" role="group" aria-labelledby="gender-label">
              <button
                type="button"
                className={`app__chip${gender === 'male' ? ' app__chip--active' : ''}`}
                onClick={() => setGender('male')}
                disabled={formLocked}
                aria-pressed={gender === 'male'}
              >
                남성
              </button>
              <button
                type="button"
                className={`app__chip${gender === 'female' ? ' app__chip--active' : ''}`}
                onClick={() => setGender('female')}
                disabled={formLocked}
                aria-pressed={gender === 'female'}
              >
                여성
              </button>
            </div>
          </div>

          <div className="app__field app__field--choice">
            <span id="calendar-label">양력 / 음력</span>
            <div className="app__chips" role="group" aria-labelledby="calendar-label">
              <button
                type="button"
                className={`app__chip${calendarType === 'solar' ? ' app__chip--active' : ''}`}
                onClick={() => setCalendarType('solar')}
                disabled={formLocked}
                aria-pressed={calendarType === 'solar'}
              >
                양력
              </button>
              <button
                type="button"
                className={`app__chip${calendarType === 'lunar' ? ' app__chip--active' : ''}`}
                onClick={() => setCalendarType('lunar')}
                disabled={formLocked}
                aria-pressed={calendarType === 'lunar'}
              >
                음력
              </button>
            </div>
          </div>

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
                {isSaving ? '저장 중…' : '정보·해석 저장'}
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
            <button type="submit" className="app__submit" disabled={formLocked}>
              {isBusy ? '풀이 중…' : isViewing ? '열람 중' : '사주 해석하기'}
            </button>
          )}
        </form>

        {error && <p className="app__error">{error}</p>}

        {ritualPhase && (
          <LoadingRitual phase={ritualPhase} onBurstEnd={handleBurstEnd} />
        )}
      </div>

      <aside className="sidebar sidebar--action" aria-label="새 사주 또는 해석 결과">
        {selectedReading ? (
          <article
            ref={readingPanelRef}
            key={selectedReading.id}
            className="talisman reading-panel reading-panel--reveal"
            aria-label={`${selectedReading.name}의 사주 결과`}
          >
            <TalismanCorners />

            <header className="reading-panel__header">
              <p className="reading-panel__seal">解</p>
              <p className="reading-panel__mark">宿命 解讀</p>
              <h2 className="reading-panel__name">{selectedReading.name}</h2>
              <p className="reading-panel__meta">{formatMeta(selectedReading)}</p>
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
              <p className="reading-panel__result">{selectedReading.result}</p>
            </div>

            <footer className="reading-panel__footer">
              <div className="reading-panel__actions">
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
              </div>
            </footer>
          </article>
        ) : (
          <div className="talisman new-panel">
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
              가운데에서 사주를 풀거나
              <br />
              왼쪽 기록에서 이름을 눌러 보세요
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

export default App
