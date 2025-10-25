import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWaveStore } from '@/stores/waveStore'
import { useMessageStore } from '@/stores/messageStore'
import { useAppStore } from '@/stores/appStore'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'
import UserAvatar from '@/components/UserAvatar'
import MessageItem from '@/components/MessageItem'
import WaveReplyForm from '@/components/WaveReplyForm'

export default function WaveView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const wavesContainerRef = useRef<HTMLDivElement>(null)
  const [openReplyFormId, setOpenReplyFormId] = useState<string | null>(null)
  
  const wave = useWaveStore(state => id ? state.getWave(id) : undefined)
  const rootMessages = useMessageStore(state => 
    id ? state.getRootMessagesByWave(id) : []
  )
  const waveUsers = useWaveStore(state => id ? state.getWaveUsers(id) : [])
  const openEditWave = useAppStore(state => state.openEditWave)
  
  const offlineCount = waveUsers.filter(u => u.status === 'offline').length

  useEffect(() => {
    if (id) {
      useWaveStore.getState().setCurrentWave(id)
    }
    return () => {
      useWaveStore.getState().setCurrentWave(null)
    }
  }, [id])

  // Close all reply forms when wave changes
  useEffect(() => {
    setOpenReplyFormId(null)
  }, [id])

  const handleOpenReplyForm = (messageId: string) => {
    setOpenReplyFormId(messageId)
  }

  const handleCloseReplyForm = () => {
    setOpenReplyFormId(null)
  }

  const scrollToNextUnread = () => {
    if (!id) return
    
    const nextUnread = useMessageStore.getState().getNextUnreadInWave(id)
    if (nextUnread) {
      const messageEl = document.getElementById(`msg-${nextUnread._id}`)
      if (messageEl && wavesContainerRef.current) {
        const scrollTop = messageEl.offsetTop - wavesContainerRef.current.offsetTop
        wavesContainerRef.current.scrollTop = scrollTop
        
        communicator.readMessage(nextUnread._id, nextUnread.waveId)
        useMessageStore.getState().markAsRead(nextUnread._id)
      }
    } else {
      scrollToBottom()
    }
  }

  const scrollToBottom = () => {
    if (wavesContainerRef.current) {
      wavesContainerRef.current.scrollTop = wavesContainerRef.current.scrollHeight
    }
  }

  const handleReadAll = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!id) return
    
    useMessageStore.getState().markAllAsReadInWave(id)
    communicator.readAllMessages(id)
  }

  const handleQuit = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!wave) return
    
    const question = t('Do you want to leave conversation {{ title }}?\n\nIf you want to come back later, participants can invite you', {
      title: wave.title
    })
    
    if (confirm(question)) {
      communicator.quitWave(wave._id)
      useWaveStore.getState().removeWave(wave._id)
      
      const lastWave = useWaveStore.getState().activeWaves()[0]
      if (lastWave) {
        navigate(`/wave/${lastWave._id}`)
      } else {
        navigate('/')
      }
    }
  }

  const handleGetPreviousMessages = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!id) return
    
    const messages = useMessageStore.getState().getRootMessagesByWave(id)
    if (messages.length > 0) {
      const maxRootId = messages[0]._id
      communicator.getMessages(id, null, maxRootId)
    }
  }

  if (!wave) return null

  return (
    <div className="wave">
      <div className="wavetop">
        <h2 className="wave-title">{wave.title}</h2>
        <p className="heads">
          {waveUsers.map(user => (
            <UserAvatar key={user._id} user={user} />
          ))}
          {offlineCount > 0 && (
            <p className="offline-list">
              +<span className="count">{offlineCount}</span>
              <span className="mhide"> offline</span>
            </p>
          )}
        </p>
        <div className="buttons">
          <a className="button gounread R mhide" href="#" onClick={(e) => { e.preventDefault(); scrollToNextUnread() }}>
            {t('Next unread')}
          </a>
          <a className="button editwave R mhide" href="#" onClick={(e) => { e.preventDefault(); openEditWave(wave._id) }}>
            {t('Edit')}
          </a>
          <a className="button readall R mhide" href="#" onClick={handleReadAll}>
            {t('All read')}
          </a>
          <a className="button quit" href="#" onClick={handleQuit}>
            <span className="R mhide">{t('Leave conversation')}</span>
            <span className="mshow">✖</span>
          </a>
        </div>
      </div>
      
      <div className="waves-container" ref={wavesContainerRef}>
        <div className="messages">
          <div className="notification getprevmessages">
            <p>
              <a className="getprevmessages R" href="#" onClick={handleGetPreviousMessages}>
                {t('Earlier messages')}
              </a>
            </p>
          </div>
          
          {rootMessages.map(message => (
            <MessageItem 
              key={message._id} 
              message={message}
              isReplyFormOpen={openReplyFormId === message._id}
              onOpenReplyForm={handleOpenReplyForm}
              onCloseReplyForm={handleCloseReplyForm}
            />
          ))}
        </div>
        
        <WaveReplyForm waveId={wave._id} />
      </div>
    </div>
  )
}

