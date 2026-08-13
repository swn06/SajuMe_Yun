import { formatMeta } from '../../lib/format.js'
import './profile.css'

export default function ProfileCard({
  profileReady,
  profileComplete,
  name,
  birthDate,
  birthTime,
  gender,
  calendarType,
  isBusy,
  isSaving,
  isDeleting,
  onEdit,
  onOnboard,
}) {
  return (
    <section className="profile-card" aria-label="저장된 사주 정보">
      {!profileReady ? (
        <p className="profile-card__loading">사주 정보를 불러오는 중…</p>
      ) : profileComplete ? (
        <>
          <p className="profile-card__seal">命</p>
          <h2 className="profile-card__name">{name}</h2>
          <p className="profile-card__meta">
            {formatMeta({ birthDate, birthTime, gender, calendarType })}
          </p>
          <button
            type="button"
            className="profile-card__edit"
            onClick={onEdit}
            disabled={isBusy || isSaving || isDeleting}
            data-ga-event="profile_open"
            data-ga-location="profile_card"
          >
            프로필 수정
          </button>
        </>
      ) : (
        <>
          <p className="profile-card__seal">命</p>
          <p className="profile-card__empty">사주 정보가 아직 없다냥</p>
          <button
            type="button"
            className="profile-card__edit"
            onClick={onOnboard}
            disabled={isBusy}
            data-ga-event="profile_open"
            data-ga-location="profile_card_empty"
          >
            정보 입력하기
          </button>
        </>
      )}
    </section>
  )
}
