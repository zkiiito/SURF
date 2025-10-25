import { useState, useEffect, useRef, FormEvent } from 'react'
import { useUserStore } from '@/stores/userStore'
import { useWaveStore } from '@/stores/waveStore'
import { useAppStore } from '@/stores/appStore'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'

export default function EditWave() {
  const editingWaveId = useAppStore(state => state.editingWaveId)
  const closeEditWave = useAppStore(state => state.closeEditWave)
  const allUsers = useUserStore(state => state.allUsers())
  const currentUser = useUserStore(state => state.currentUser())
  const getWave = useWaveStore(state => state.getWave)
  
  const titleInputRef = useRef<HTMLInputElement>(null)
  
  const [title, setTitle] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [showInviteButton, setShowInviteButton] = useState(true)

  const isEditing = editingWaveId !== null
  const currentWave = editingWaveId ? getWave(editingWaveId) : null

  useEffect(() => {
    const handleInviteCodeReady = (event: Event) => {
      const detail = (event as CustomEvent).detail as { waveId: string; code: string }
      if (detail.waveId === editingWaveId) {
        setShowInviteButton(false)
        setInviteCode(`${window.location.protocol}//${window.location.host}/invite/${detail.code}`)
      }
    }

    window.addEventListener('inviteCodeReady', handleInviteCodeReady)
    return () => window.removeEventListener('inviteCodeReady', handleInviteCodeReady)
  }, [editingWaveId])

  useEffect(() => {
    setInviteCode('')
    setShowInviteButton(true)
    
    if (currentWave) {
      setTitle(currentWave.title)
      setSelectedUserIds([...currentWave.userIds])
    } else {
      setTitle('')
      setSelectedUserIds(currentUser ? [currentUser._id] : [])
    }
    
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }, [currentWave, currentUser])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (currentWave) {
      communicator.updateWave(currentWave._id, title, selectedUserIds)
    } else {
      communicator.createWave(title, selectedUserIds)
    }
    
    closeEditWave()
  }

  const handleGetInviteCode = (e: React.MouseEvent) => {
    e.preventDefault()
    if (currentWave) {
      communicator.getInviteCode(currentWave._id)
    }
  }

  const handleUserSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions)
    setSelectedUserIds(options.map(opt => opt.value))
  }

  return (
    <div id="editwave" className="overlay">
      <div className="overlay-title">
        <a className="close button R" href="#" onClick={(e) => { e.preventDefault(); closeEditWave() }}>
          {t('Close')}
        </a>
        <h2 className="R">{isEditing ? t('Edit conversation') : t('Add conversation')}</h2>
      </div>
      <div className="overlay-body">
        <h2 className="R">{isEditing ? t('Edit conversation') : t('Add conversation')}</h2>
        <form method="post" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="editwave-title" className="R">{t('Title')}</label>
            <div className="right">
              <input 
                id="editwave-title" 
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="normal" 
                name="title" 
                type="text" 
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="editwave-users" className="R">{t('Participants')}</label>
            <div className="right">
              <select 
                id="editwave-users" 
                value={selectedUserIds}
                onChange={handleUserSelection}
                className="normal" 
                multiple
                size={5}
              >
                {allUsers.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.9em', color: '#666' }}>Hold Ctrl/Cmd to select multiple users</p>
            </div>
          </div>
          
          <div className="right">
            <button id="editwave-submit" type="submit" className="button R">
              {isEditing ? t('Save') : t('Create')}
            </button>
            {isEditing && showInviteButton && (
              <button 
                id="editwave-invite" 
                type="button"
                className="button R" 
                onClick={handleGetInviteCode}
              >
                {t('Get invite code')}
              </button>
            )}
          </div>
          <br style={{ clear: 'both' }} />
          
          {inviteCode && (
            <div id="editwave-invitecode-block">
              <label htmlFor="editwave-invitecode" className="R">{t('Invite URL')}</label>
              <div className="right">
                <input 
                  id="editwave-invitecode" 
                  className="normal" 
                  type="text" 
                  readOnly 
                  value={inviteCode}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

