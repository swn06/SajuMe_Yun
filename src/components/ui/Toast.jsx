import './Toast.css'

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null

  return (
    <div
      key={toast.id}
      className={`app-toast${toast.leaving ? ' app-toast--out' : ''}`}
      role="status"
      aria-live="polite"
      onAnimationEnd={(event) => {
        if (event.animationName === 'toast-out') onDismiss()
      }}
    >
      {toast.message}
    </div>
  )
}
