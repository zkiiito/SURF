import { useEffect, useLayoutEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useWaveStore } from '@/stores/waveStore'
import { useMessageStore } from '@/stores/messageStore'
import { useAppStore } from '@/stores/appStore'
import { communicator } from '@/services/communicator'
import { scrollToMessage } from '@/utils/scrollToMessage'
import { t } from '@/utils/i18n'
import UserAvatar from '@/components/UserAvatar'
import MessageItem from '@/components/MessageItem'
import WaveReplyForm from '@/components/WaveReplyForm'
import { useWaveUsers } from '@/hooks/useWaveUsers'

export default function WaveView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const notificationMessageId = searchParams.get('message')
  const wavesContainerRef = useRef<HTMLDivElement>(null)
  
  const wave = useWaveStore(state => id ? state.getWave(id) : undefined)
  const rootMessages = useMessageStore(useShallow(state => 
    id ? state.getRootMessagesByWave(id) : []
  ))
  const waveUsers = useWaveUsers(id)
  const openEditWave = useAppStore(state => state.openEditWave)
  const closeReplyForm = useAppStore(state => state.closeReplyForm)
  
  const offlineCount = waveUsers.filter(u => u.status === 'offline').length

  useLayoutEffect(() => {
    if (!id || !useWaveStore.getState().getWave(id)) return
    useWaveStore.getState().setCurrentWave(id)
    const store = useMessageStore.getState()
    const requested = notificationMessageId ? store.getMessage(notificationMessageId) : undefined
    const target = requested?.waveId === id ? requested : store.getNextUnreadInWave(id, undefined)
    let cancelled = false
    const container = wavesContainerRef.current
    const stopSettling = () => { cancelled = true }
    if (target) {
      scrollToMessage(target._id)
    } else if (container) {
      container.scrollTop = container.scrollHeight
      let lastScrollTop = container.scrollTop
      const settleBottom = () => {
        // Font and image loading can change initial message heights. Stop
        // following that layout once the reader moves away from our position.
        if (cancelled || container.scrollTop !== lastScrollTop) return
        container.scrollTop = container.scrollHeight
        lastScrollTop = container.scrollTop
      }
      void document.fonts.ready.then(settleBottom)
      container.querySelectorAll('img').forEach(image => {
        if (!image.complete) void image.decode().then(settleBottom, () => {})
      })
      container.addEventListener('wheel', stopSettling, { passive: true })
      container.addEventListener('pointerdown', stopSettling, { passive: true })
      container.addEventListener('keydown', stopSettling)
    }
    return () => {
      cancelled = true
      container?.removeEventListener('wheel', stopSettling)
      container?.removeEventListener('pointerdown', stopSettling)
      container?.removeEventListener('keydown', stopSettling)
      useWaveStore.getState().setCurrentWave(null)
    }
  }, [id, notificationMessageId])

  // Close all reply forms when wave changes
  useEffect(() => {
    closeReplyForm()
  }, [id, closeReplyForm])

  const scrollToNextUnread = () => {
    if (!id) return
    
    const currentMessageId = useWaveStore.getState().currentMessageId
    const nextUnread = useMessageStore.getState().getNextUnreadInWave(
      id, 
      currentMessageId || undefined
    )
    
    if (nextUnread) {
      scrollToMessage(nextUnread._id)
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
      
      navigate('/waves', { replace: true })
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

  if (!wave) return <Navigate to="/waves" replace />

  const handleWavetopClick = (e: React.MouseEvent) => {
    // Only handle clicks on the wavetop div itself, not on buttons or links
    if ((e.target as HTMLElement).closest('a, .button')) {
      return
    }
    e.preventDefault()
    scrollToNextUnread()
  }

  return (
    <div className="wave">
      <div className="wavetop" onClick={handleWavetopClick}>
        <h2 className="wave-title">{wave.title}</h2>
        <div className="heads">
          {waveUsers.map(user => (
            <UserAvatar key={user._id} user={user} />
          ))}
          {offlineCount > 0 && (
            <span className="offline-list">
              +<span className="count">{offlineCount}</span>
              <span className="mhide"> offline</span>
            </span>
          )}
        </div>
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
            />
          ))}
        </div>
        
        <WaveReplyForm key={wave._id} waveId={wave._id} />
      </div>
    </div>
  )
}
