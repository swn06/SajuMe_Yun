import TalismanCorners from '../ui/TalismanCorners.jsx'
import Mascot from '../ui/Mascot.jsx'
import GoogleGlyph from '../ui/GoogleGlyph.jsx'
import { formatMeta } from '../../lib/format.js'
import '../auth/auth.css'
import './reading.css'

export default function ReadingPanel({
  panelRef,
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
  onClose,
  onShare,
  onStartEdit,
  onDelete,
  onNewReading,
  onGoogleSignIn,
}) {
  return (
    <article
      ref={panelRef}
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
          onClick={onClose}
          aria-label="결과 닫기"
          data-ga-event="reading_close"
          data-ga-location="result_panel"
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
              <p className="reading-panel__gate-lead">나머지 운명도 보려면 이름을 남겨라냥</p>
              <button
                type="button"
                className="auth-google"
                onClick={() => onGoogleSignIn('result_gate')}
                disabled={authBusy}
                data-ga-event="login_click"
                data-ga-location="result_gate"
              >
                <GoogleGlyph />
                <span>{authBusy ? '로그인 중…' : 'Google로 나머지 보기'}</span>
              </button>
              {authError && <p className="reading-panel__gate-error">{authError}</p>}
            </div>
          </div>
        )}
      </div>

      <footer className="reading-panel__footer">
        <div className="reading-panel__actions">
          {isGuestLocked ? (
            <button
              type="button"
              className="reading-panel__new"
              onClick={onNewReading}
              data-ga-event="new_reading"
              data-ga-location="result_gate"
            >
              <span aria-hidden="true">+</span> 새 사주 만들기
            </button>
          ) : (
            <>
              <button
                type="button"
                className="reading-panel__action"
                onClick={onShare}
                disabled={!canMutate || !selectedReading.share_token}
                data-ga-event="share"
                data-ga-location="result_panel"
              >
                공유
              </button>
              <button
                type="button"
                className="reading-panel__action"
                onClick={onStartEdit}
                disabled={!canMutate || isEditing}
                data-ga-event="reading_edit"
                data-ga-location="result_panel"
              >
                수정
              </button>
              <button
                type="button"
                className="reading-panel__action reading-panel__action--danger"
                onClick={onDelete}
                disabled={!canMutate}
                data-ga-event="reading_delete"
                data-ga-location="result_panel"
              >
                {isDeleting ? '삭제 중…' : '삭제'}
              </button>
              <button
                type="button"
                className="reading-panel__new"
                onClick={onNewReading}
                data-ga-event="new_reading"
                data-ga-location="result_panel"
              >
                <span aria-hidden="true">+</span> 새 사주 만들기
              </button>
            </>
          )}
        </div>
      </footer>
    </article>
  )
}
