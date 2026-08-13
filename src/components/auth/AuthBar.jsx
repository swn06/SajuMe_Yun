import GoogleGlyph from '../ui/GoogleGlyph.jsx'
import './auth.css'

export default function AuthBar({
  user,
  sajuName,
  avatarUrl,
  profileComplete,
  isBusy,
  profileSaving,
  authBusy,
  onOpenProfile,
  onSignOut,
  onGoogleSignIn,
}) {
  return (
    <header className="auth-bar" aria-label="계정">
      {user ? (
        <>
            <button
              type="button"
              className="auth-bar__user auth-bar__user--button"
              onClick={onOpenProfile}
              disabled={!profileComplete || isBusy || profileSaving}
              aria-haspopup="dialog"
              data-ga-event="profile_open"
              data-ga-location="header_user"
            >
            {avatarUrl ? (
              <img className="auth-bar__avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="auth-bar__avatar auth-bar__avatar--fallback" aria-hidden="true">
                {sajuName.slice(0, 1)}
              </span>
            )}
            <div className="auth-bar__meta">
              <span className="auth-bar__name">{sajuName}</span>
              {user.email && <span className="auth-bar__email">{user.email}</span>}
            </div>
          </button>
          <div className="auth-bar__actions">
            <button
              type="button"
              className="auth-bar__profile"
              onClick={onOpenProfile}
              disabled={!profileComplete || isBusy || profileSaving}
              data-ga-event="profile_open"
              data-ga-location="header"
            >
              프로필
            </button>
            <button
              type="button"
              className="auth-bar__signout"
              onClick={onSignOut}
              disabled={authBusy || isBusy}
              data-ga-event="logout"
              data-ga-location="header"
            >
              {authBusy ? '처리 중…' : '로그아웃'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="auth-bar__user">
            <span className="auth-bar__avatar auth-bar__avatar--fallback" aria-hidden="true">
              냥
            </span>
            <div className="auth-bar__meta">
              <span className="auth-bar__name">{sajuName}</span>
              <span className="auth-bar__email">풀이는 먼저, 기록은 로그인 후다냥</span>
            </div>
          </div>
          <div className="auth-bar__actions">
            <button
              type="button"
              className="auth-google auth-google--bar"
              onClick={() => onGoogleSignIn('header')}
              disabled={authBusy || isBusy}
              data-ga-event="login_click"
              data-ga-location="header"
            >
              <GoogleGlyph />
              <span>{authBusy ? '이동 중…' : 'Google로 계속하기'}</span>
            </button>
          </div>
        </>
      )}
    </header>
  )
}
