import { useEffect, useState } from 'react'
import Mascot from '../components/ui/Mascot.jsx'
import TalismanCorners from '../components/ui/TalismanCorners.jsx'
import { supabase } from '../lib/supabase.js'
import { formatMeta, isShareToken } from '../lib/format.js'
import { trackEvent } from '../lib/analytics.js'
import '../styles/form.css'
import '../components/reading/reading.css'

export default function SharedResult({ token }) {
  const [reading, setReading] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isShareToken(token)) {
        setStatus('missing')
        return
      }

      const { data, error: loadError } = await supabase.rpc('get_shared_reading', {
        p_token: token,
      })

      if (cancelled) return

      if (loadError) {
        console.error(loadError)
        setError(loadError.message || '결과를 불러오지 못했다냥.')
        setStatus('error')
        return
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        setStatus('missing')
        return
      }

      setReading(row)
      setStatus('ready')
      trackEvent('shared_result_view')
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="share-page">
      <article className="talisman reading-panel share-page__panel" aria-label="공유된 사주 결과">
        <TalismanCorners />

        {status === 'loading' && (
          <div className="share-page__state">
            <Mascot pose="reading" size="md" still />
            <p>명을 펼치는 중이다냥…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="share-page__state">
            <Mascot pose="bow" size="md" />
            <p>{error}</p>
            <a
              className="app__submit share-page__home"
              href="/"
              data-ga-event="cta_try_saju"
              data-ga-location="share_error"
              onClick={() => trackEvent('cta_try_saju', { source: 'error' })}
            >
              무냥이에게 가기
            </a>
          </div>
        )}

        {status === 'missing' && (
          <div className="share-page__state">
            <Mascot pose="bow" size="md" />
            <p>이 링크의 사주를 찾지 못했다냥.</p>
            <a
              className="app__submit share-page__home"
              href="/"
              data-ga-event="cta_try_saju"
              data-ga-location="share_missing"
              onClick={() => trackEvent('cta_try_saju', { source: 'missing' })}
            >
              무냥이에게 가기
            </a>
          </div>
        )}

        {status === 'ready' && reading && (
          <>
            <header className="reading-panel__header">
              <Mascot pose="glare" size="md" line className="reading-panel__mascot" />
              <p className="reading-panel__mark">宿命 解讀</p>
              <h1 className="reading-panel__name">{reading.name || '사주 결과'}</h1>
              <p className="reading-panel__meta">
                {formatMeta({
                  birthDate: reading.birth_date,
                  birthTime: reading.birth_time,
                  gender: reading.gender,
                  calendarType: reading.calendar_type,
                })}
              </p>
            </header>

            <div className="reading-panel__divider" aria-hidden="true" />

            <div className="reading-panel__body">
              <p className="reading-panel__result">{reading.result}</p>
            </div>

            <footer className="reading-panel__footer">
              <a
                className="app__submit share-page__home"
                href="/"
                data-ga-event="cta_try_saju"
                data-ga-location="share_result"
                onClick={() => trackEvent('cta_try_saju', { source: 'result' })}
              >
                나도 사주 보러 가기
              </a>
            </footer>
          </>
        )}
      </article>
    </div>
  )
}
