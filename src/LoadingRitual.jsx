import { useEffect } from 'react'
import burstImg from './assets/munyang-burst.png'
import danceImg from './assets/munyang-dance.png'
import './LoadingRitual.css'

/**
 * phase: 'loading' | 'bursting'
 * onBurstEnd: called after burst animation finishes
 */
export default function LoadingRitual({ phase, onBurstEnd }) {
  useEffect(() => {
    if (phase !== 'bursting' || !onBurstEnd) return undefined
    const timer = window.setTimeout(onBurstEnd, 1200)
    return () => window.clearTimeout(timer)
  }, [phase, onBurstEnd])

  return (
    <div
      className={`ritual ritual--${phase}`}
      role="status"
      aria-live="polite"
      aria-label={phase === 'loading' ? '사주 풀이 중' : '사주 풀이 완료'}
    >
      <div className="ritual__stage">
        <div className="ritual__cat-wrap">
          <img
            className="ritual__dance"
            src={danceImg}
            alt=""
            draggable={false}
          />
          <span className="ritual__spark ritual__spark--1" aria-hidden="true" />
          <span className="ritual__spark ritual__spark--2" aria-hidden="true" />
          <span className="ritual__spark ritual__spark--3" aria-hidden="true" />
          <span className="ritual__spark ritual__spark--4" aria-hidden="true" />
          <span className="ritual__spark ritual__spark--5" aria-hidden="true" />
        </div>

        <img
          className="ritual__burst"
          src={burstImg}
          alt=""
          draggable={false}
        />

        <div className="ritual__shards" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className={`ritual__shard ritual__shard--${i + 1}`} />
          ))}
        </div>
      </div>

      {phase === 'loading' && (
        <p className="ritual__caption">
          사주 보는 중이다냥<span className="ritual__dots">~</span>
        </p>
      )}
    </div>
  )
}
