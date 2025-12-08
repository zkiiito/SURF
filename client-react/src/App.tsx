import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppStore } from './stores/appStore'
import { useWaveStore } from './stores/waveStore'
import { useMessageStore } from './stores/messageStore'
import { communicator } from './services/communicator'
import { initI18n } from './utils/i18n'
import { scrollToMessage } from './utils/scrollToMessage'
import TheHeader from './components/TheHeader'
import WaveList from './components/WaveList'
import EmptyState from './components/EmptyState'
import EditWave from './components/EditWave'
import EditUser from './components/EditUser'
import Disconnected from './components/Disconnected'
import '../public/css/style.css'
import './App.css'

function App() {
  const showEditWave = useAppStore(state => state.showEditWave)
  const showEditUser = useAppStore(state => state.showEditUser)
  const showDisconnected = useAppStore(state => state.showDisconnected)
  const closeAllOverlays = useAppStore(state => state.closeAllOverlays)
  const setMobile = useAppStore(state => state.setMobile)
  const pageTitle = useAppStore(state => state.pageTitle())
  const unreadCount = useMessageStore(state => state.unreadCount())
  const allWaves = useWaveStore(state => state.allWaves())

  const showOverlay = showEditWave || showEditUser || showDisconnected

  useEffect(() => {
    // Initialize i18n
    initI18n()
    
    // Initialize communicator
    communicator.initialize()
    
    // Handle window resize
    const handleResize = () => {
      setMobile(window.innerWidth < 1000)
    }
    
    // Initial mobile check
    handleResize()
    window.addEventListener('resize', handleResize)
    
    // Handle space key to jump to next unread
    const handleKeyDown = (e: KeyboardEvent) => {
      const nodeName = (e.target as HTMLElement).nodeName
      
      // Ignore if typing in input or textarea
      if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
        return
      }
      
      if (e.code === 'Space') {
        e.preventDefault()
        const currentWaveId = useWaveStore.getState().currentWaveId
        if (currentWaveId) {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
          const currentMessageId = useWaveStore.getState().currentMessageId
          const nextUnread = useMessageStore.getState().getNextUnreadInWave(
            currentWaveId,
            currentMessageId || undefined
          )
          if (nextUnread) {
            scrollToMessage(nextUnread._id)
          }
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    
    // Handle ESC key to close overlays
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        closeAllOverlays()
      }
    }
    
    document.addEventListener('keydown', handleEscKey)
    
    // Error logging
    window.onerror = (message, file, line) => {
      const data = {
        prefix: 'JSERROR',
        errorMessage: `${message} in ${file} on line ${line}. URL: ${window.location.href} BROWSER: ${navigator.userAgent}`
      }
      
      fetch('/logError', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(() => {})
    }
    
    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleEscKey)
      communicator.disconnect()
    }
  }, [setMobile, closeAllOverlays])

  // Update page title
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  // Update favicon
  useEffect(() => {
    updateFavicon(unreadCount)
  }, [unreadCount])

  function updateFavicon(count: number) {
    const canvas = document.createElement('canvas')
    const img = new Image()
    img.src = '/images/surf-ico.png'
    
    img.onload = () => {
      canvas.width = 35
      canvas.height = 35
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      ctx.drawImage(img, 0, 0)
      
      if (count > 0) {
        const txt = count > 99 ? '99+' : count.toString()
        
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = 0.7
        ctx.fillRect(34 - txt.length * 9, 21, txt.length * 9 + 1, 14)
        
        ctx.globalAlpha = 1
        ctx.fillStyle = '#847099'
        ctx.font = 'bold 16px sans-serif'
        ctx.fillText(txt, 35 - 9 * txt.length, 35)
      }
      
      const link = document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'shortcut icon'
      link.href = canvas.toDataURL('image/x-icon')
      
      const oldLink = document.querySelector('link[rel="shortcut icon"]')
      if (oldLink) oldLink.remove()
      document.head.appendChild(link)
    }
  }

  return (
    <>
      <TheHeader />
      
      <div id="container">
        <WaveList />
        
        <div id="wave-container">
          {allWaves.length === 0 ? <EmptyState /> : <Outlet />}
        </div>
      </div>

      {showOverlay && <div id="darken" onClick={closeAllOverlays}></div>}
      {showEditWave && <EditWave />}
      {showEditUser && <EditUser />}
      {showDisconnected && <Disconnected />}
    </>
  )
}

export default App
