import { useState, useEffect, FormEvent } from 'react'
import { useUserStore } from '@/stores/userStore'
import { useAppStore } from '@/stores/appStore'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'

const avatars = ['head1', 'head2', 'head3', 'head4', 'head5', 'head6']

export default function EditUser() {
  const currentUser = useUserStore(state => state.currentUser())
  const closeEditUser = useAppStore(state => state.closeEditUser)
  const updateUser = useUserStore(state => state.updateUser)
  const saveLocalAttributes = useUserStore(state => state.saveLocalAttributes)

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('head1')
  const [showPictures, setShowPictures] = useState(true)
  const [showVideos, setShowVideos] = useState(true)
  const [showLinkPreviews, setShowLinkPreviews] = useState(true)

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name)
      setAvatar(currentUser.avatar)
      setShowPictures(currentUser.showPictures ?? true)
      setShowVideos(currentUser.showVideos ?? true)
      setShowLinkPreviews(currentUser.showLinkPreviews ?? true)
    }
  }, [currentUser])

  const notificationStatus = () => {
    if (!('Notification' in window)) {
      return t('Not supported')
    }
    return Notification.permission === 'granted' ? t('Enabled') : t('Disabled')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    
    communicator.updateUser(name, avatar)
    
    updateUser(currentUser._id, {
      showPictures,
      showVideos,
      showLinkPreviews
    })
    
    saveLocalAttributes()
    closeEditUser()
  }

  const testNotification = () => {
    if (!('Notification' in window)) {
      alert(t('Not supported'))
      return
    }
    
    if (Notification.permission === 'granted') {
      new Notification('SURF Test', {
        body: 'Notifications are working!',
        icon: '/images/surf-ico.png'
      })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('SURF Test', {
            body: 'Notifications are working!',
            icon: '/images/surf-ico.png'
          })
        }
      })
    }
  }

  return (
    <div id="edituser" className="overlay">
      <div className="overlay-title">
        <a className="close button R" href="#" onClick={(e) => { e.preventDefault(); closeEditUser() }}>
          {t('Close')}
        </a>
        <h2 className="R">{t('Edit profile')}</h2>
      </div>
      <div className="overlay-body">
        <h2 className="R">{t('Edit profile')}</h2>
        <form method="post" onSubmit={handleSubmit}>
          <div className="edituser-name-row">
            <label htmlFor="edituser-name" className="R">{t('Name')}</label>
            <div className="right">
              <input 
                id="edituser-name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="normal" 
                name="name" 
                type="text" 
                maxLength={30} 
                required
              />
            </div>
          </div>
          
          <div className="ediutuser-avatar-row">
            <label htmlFor="edituser-avatar-cb" className="R">{t('Avatar')}</label>
            <div className="right">
              {avatars.map(avatarName => (
                <div key={avatarName} className="avatar">
                  <label>
                    <img src={`/images/${avatarName}.png`} width="80" alt={avatarName} /><br />
                    <input 
                      type="radio" 
                      value={avatarName} 
                      checked={avatar === avatarName}
                      onChange={(e) => setAvatar(e.target.value)}
                      name="edituser-avatar-cb" 
                      required
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="edituser-notification-row">
            <label className="R">{t('Notifications')}</label>
            <div className="right">
              <span id="edituser-notification-status">{notificationStatus()}</span>
              <button type="button" id="edituser-notification-test" className="R" onClick={testNotification}>
                {t('Test')}
              </button>
            </div>
          </div>
          
          <div className="edituser-localsettings-row">
            <label className="R">Local settings</label>
            <div className="right">
              <label>
                <input 
                  type="checkbox" 
                  id="edituser-show-pictures" 
                  checked={showPictures}
                  onChange={(e) => setShowPictures(e.target.checked)}
                />
                {t('Show pictures')}
              </label><br style={{ clear: 'both' }} />
              <label>
                <input 
                  type="checkbox" 
                  id="edituser-show-videos" 
                  checked={showVideos}
                  onChange={(e) => setShowVideos(e.target.checked)}
                />
                {t('Show videos')}
              </label><br style={{ clear: 'both' }} />
              <label>
                <input 
                  type="checkbox" 
                  id="edituser-show-linkpreviews" 
                  checked={showLinkPreviews}
                  onChange={(e) => setShowLinkPreviews(e.target.checked)}
                />
                {t('Show link previews')}
              </label>
            </div>
          </div>
          
          <div className="right">
            <button id="edituser-submit" type="submit" className="button R">
              {t('Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

