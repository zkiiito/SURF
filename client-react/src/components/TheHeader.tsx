import { useUserStore } from '@/stores/userStore'
import { useAppStore } from '@/stores/appStore'
import { t } from '@/utils/i18n'
import UserAvatar from './UserAvatar'

export default function TheHeader() {
  const currentUser = useUserStore(state => state.currentUser())
  const openEditUser = useAppStore(state => state.openEditUser)
  const isMobile = useAppStore(state => state.isMobile)
  const toggleWaveList = useAppStore(state => state.toggleWaveList)

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isMobile) {
      toggleWaveList()
    }
  }

  return (
    <div id="header">
      <h1>SURF</h1>
      <a href="#" onClick={handleLogoClick}>
        <img id="header-logo" src="/images/surf-logo.png" alt="SURF" />
      </a>
      {currentUser && (
        <div id="usermenu">
          <span id="currentuser">
            <UserAvatar user={currentUser} />
            <p className="currentuser_name">{currentUser.name}</p>
          </span>
          <a className="button edituser" href="#" onClick={(e) => { e.preventDefault(); openEditUser() }}>
            <span className="R mhide">{t('Edit profile')}</span>
            <span className="mshow">⚙</span>
          </a>
        </div>
      )}
    </div>
  )
}

