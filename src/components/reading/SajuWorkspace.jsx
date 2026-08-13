import TalismanCorners from '../ui/TalismanCorners.jsx'
import Mascot from '../ui/Mascot.jsx'
import ProfileCard from '../profile/ProfileCard.jsx'
import '../../styles/form.css'
import './workspace.css'

export default function SajuWorkspace({
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
  onOpenProfile,
  onOnboard,
  onCancelEdit,
  onSaveMeta,
  onAnalyze,
  onDraftChange,
}) {
  return (
    <div className={`talisman app${isViewing ? ' app--viewing' : ''}${isEditing ? ' app--editing' : ''}`}>
      <TalismanCorners />

      <Mascot pose="bow" size="md" still className="app__mascot" />
      <span className="app__mark">宿命 · SAJU</span>
      <h1>무냥이의 사주풀이</h1>

      <ProfileCard
        profileReady={profileReady}
        profileComplete={profileComplete}
        name={name}
        birthDate={birthDate}
        birthTime={birthTime}
        gender={gender}
        calendarType={calendarType}
        isBusy={isBusy}
        isSaving={isSaving}
        isDeleting={isDeleting}
        onEdit={onOpenProfile}
        onOnboard={onOnboard}
      />

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
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isBusy || isSaving}
            data-ga-event="reading_edit_cancel"
            data-ga-location="workspace"
          >
            수정 취소
          </button>
        </div>
      )}

      <form
        onSubmit={isEditing ? onSaveMeta : onAnalyze}
        className={formLocked && isViewing ? 'app__form--dim' : undefined}
      >
        {isEditing && (
          <div className="app__field app__field--result">
            <label htmlFor="draftResult">해석 내용</label>
            <textarea
              id="draftResult"
              value={draftResult}
              onChange={onDraftChange}
              disabled={formLocked}
              rows={8}
            />
            <span className="app__hint">내용을 고친 뒤 저장하거나, 아래에서 다시 해석할 수 있습니다</span>
          </div>
        )}

        {isEditing ? (
          <div className="app__submit-row">
            <button
              type="submit"
              className="app__submit"
              disabled={formLocked}
              data-ga-event="reading_save"
              data-ga-location="workspace"
            >
              {isSaving ? '저장 중…' : '해석 저장'}
            </button>
            <button
              type="button"
              className="app__submit app__submit--secondary"
              onClick={onAnalyze}
              disabled={formLocked}
              data-ga-event="saju_analyze"
              data-ga-location="workspace_reanalyze"
            >
              {isBusy ? '풀이 중…' : '다시 해석해 저장'}
            </button>
          </div>
        ) : (
          <button
            type="submit"
            className="app__submit"
            disabled={formLocked}
            data-ga-event="saju_analyze"
            data-ga-location="workspace"
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
          이때까지 총 <strong>{readingCount.toLocaleString('ko-KR')}</strong>
          개의 사주가 생성되었습니다
        </p>
      )}

      {error && <p className="app__error">{error}</p>}
      {authError && <p className="app__error">{authError}</p>}
    </div>
  )
}
