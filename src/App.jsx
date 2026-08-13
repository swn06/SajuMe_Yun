import './App.css'
import { useSajuApp } from './hooks/useSajuApp.js'
import AuthScreen from './components/auth/AuthScreen.jsx'
import AuthBar from './components/auth/AuthBar.jsx'
import ReadingList from './components/reading/ReadingList.jsx'
import SajuWorkspace from './components/reading/SajuWorkspace.jsx'
import ReadingPanel from './components/reading/ReadingPanel.jsx'
import NewReadingPanel from './components/reading/NewReadingPanel.jsx'
import LoadingRitual from './components/ritual/LoadingRitual.jsx'
import ProfileModal from './components/profile/ProfileModal.jsx'
import Toast from './components/ui/Toast.jsx'

export default function App() {
  const app = useSajuApp()

  if (!app.authReady) {
    return <AuthScreen />
  }

  return (
    <>
      <div className="app-shell">
        <AuthBar {...app.authBar} />
        <ReadingList {...app.readingList} />
        <SajuWorkspace {...app.workspace} />
        <aside className="sidebar sidebar--action" aria-label="새 사주 또는 해석 결과">
          {app.readingPanel ? (
            <ReadingPanel key={app.selectedReading.id} {...app.readingPanel} />
          ) : (
            <NewReadingPanel {...app.newPanel} />
          )}
        </aside>
      </div>

      {app.ritualPhase && (
        <LoadingRitual phase={app.ritualPhase} onBurstEnd={app.handleBurstEnd} />
      )}

      <Toast toast={app.toast} onDismiss={app.dismissToast} />

      {(app.showOnboardModal || app.profileModal === 'edit') && (
        <ProfileModal
          key={app.showOnboardModal ? 'onboard' : 'edit'}
          mode={app.showOnboardModal ? 'onboard' : 'edit'}
          initial={{
            name: app.name,
            birthDate: app.birthDate,
            birthTime: app.birthTime,
            gender: app.gender,
            calendarType: app.calendarType,
          }}
          nameFallback={app.displayName}
          isSaving={app.profileSaving}
          onSave={app.handleSaveProfile}
          onCancel={app.forceOnboard ? undefined : app.closeProfileModal}
        />
      )}
    </>
  )
}
