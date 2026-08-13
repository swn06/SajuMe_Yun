import TalismanCorners from '../ui/TalismanCorners.jsx'
import { formatReadingWhen } from '../../lib/format.js'
import './reading.css'

export default function ReadingList({
  user,
  readings,
  selectedReading,
  listLoading,
  listError,
  isBusy,
  isSaving,
  isDeleting,
  onRetry,
  onSelect,
}) {
  return (
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
            <button
              type="button"
              className="sidebar__retry"
              onClick={onRetry}
              data-ga-event="reading_list_retry"
              data-ga-location="sidebar"
            >
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
                    onClick={() => onSelect(reading)}
                    disabled={isBusy || isSaving || isDeleting}
                    data-ga-event="select_content"
                    data-ga-location="sidebar"
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
  )
}
