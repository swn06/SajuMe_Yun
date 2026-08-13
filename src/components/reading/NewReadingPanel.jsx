import TalismanCorners from '../ui/TalismanCorners.jsx'
import './reading.css'

export default function NewReadingPanel({ user, isBusy, pulse, onPulseEnd, onNewReading }) {
  return (
    <div
      className={`talisman new-panel${pulse ? ' new-panel--pulse' : ''}`}
      onAnimationEnd={onPulseEnd}
    >
      <TalismanCorners />
      <p className="new-panel__seal">始</p>
      <p className="new-panel__title">開運</p>
      <p className="new-panel__caption">새 사주</p>
      <div className="new-panel__divider" aria-hidden="true" />
      <button
        type="button"
        className="sidebar__new new-panel__button"
        onClick={onNewReading}
        disabled={isBusy}
        data-ga-event="new_reading"
        data-ga-location="new_panel"
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
  )
}
