import TalismanCorners from '../ui/TalismanCorners.jsx'
import Mascot from '../ui/Mascot.jsx'
import './auth.css'

export default function AuthScreen() {
  return (
    <div className="auth-screen">
      <div className="talisman auth-card">
        <TalismanCorners />
        <Mascot pose="meet" size="sm" still className="auth-card__mascot" />
        <p className="auth-card__caption">세션을 확인하는 중…</p>
      </div>
    </div>
  )
}
