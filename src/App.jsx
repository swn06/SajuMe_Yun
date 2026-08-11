import { useCallback, useRef, useState } from 'react'
import './App.css'
import { buildSajuPrompt } from './prompt.js'
import LoadingRitual from './LoadingRitual.jsx'

// fetch만 사용 — gemini
async function askGemini(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY가 .env에 없습니다. 개발 서버를 재시작해 주세요.')
  }

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

function App() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  /** null | 'loading' | 'bursting' */
  const [ritualPhase, setRitualPhase] = useState(null)
  const pendingResultRef = useRef('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function handleAnalyze(e) {
    e.preventDefault()
    setError('')
    setResult('')
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

  const handleBurstEnd = useCallback(() => {
    setResult(pendingResultRef.current)
    pendingResultRef.current = ''
    setRitualPhase(null)
  }, [])

  const isBusy = ritualPhase === 'loading' || ritualPhase === 'bursting'

  return (
    <div className="app">
      <span className="app__mark">宿命 · SAJU</span>
      <h1>무냥이의 사주풀이</h1>

      <form onSubmit={handleAnalyze}>
        <div>
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            disabled={isBusy}
          />
        </div>

        <div>
          <label htmlFor="birthDate">생년월일</label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            disabled={isBusy}
          />
        </div>

        <div>
          <label htmlFor="birthTime">태어난 시간</label>
          <input
            id="birthTime"
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            disabled={isBusy}
          />
        </div>

        <div>
          <span>성별</span>
          <label>
            <input
              type="radio"
              name="gender"
              value="male"
              checked={gender === 'male'}
              onChange={(e) => setGender(e.target.value)}
              disabled={isBusy}
            />
            남성
          </label>
          <label>
            <input
              type="radio"
              name="gender"
              value="female"
              checked={gender === 'female'}
              onChange={(e) => setGender(e.target.value)}
              disabled={isBusy}
            />
            여성
          </label>
        </div>

        <div>
          <label htmlFor="calendarType">양력 / 음력</label>
          <select
            id="calendarType"
            value={calendarType}
            onChange={(e) => setCalendarType(e.target.value)}
            disabled={isBusy}
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </div>

        <button type="submit" disabled={isBusy}>
          {isBusy ? '풀이 중...' : '사주 해석하기'}
        </button>
      </form>

      {error && <p className="app__error">{error}</p>}

      {result && (
        <section className="app__result app__result--reveal">
          <h2>해석 결과</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{result}</p>
        </section>
      )}

      {ritualPhase && (
        <LoadingRitual phase={ritualPhase} onBurstEnd={handleBurstEnd} />
      )}
    </div>
  )
}

export default App
