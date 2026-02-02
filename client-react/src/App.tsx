import { useEffect, useRef, useCallback } from 'react'
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
import '../public/css/token-input.css'
import './App.css'

function App() {
  const ready = useAppStore(state => state.ready)
  const isMobile = useAppStore(state => state.isMobile)
  const showEditWave = useAppStore(state => state.showEditWave)
  const showEditUser = useAppStore(state => state.showEditUser)
  const showDisconnected = useAppStore(state => state.showDisconnected)
  const closeAllOverlays = useAppStore(state => state.closeAllOverlays)
  const setMobile = useAppStore(state => state.setMobile)
  const setShowWaveList = useAppStore(state => state.setShowWaveList)
  const pageTitle = useAppStore(state => state.pageTitle())
  const unreadCount = useMessageStore(state => state.unreadCount())
  // Subscribe directly to waves Map to ensure re-render when waves are added
  const waves = useWaveStore(state => state.waves)
  const allWaves = Array.from(waves.values())

  const showOverlay = showEditWave || showEditUser || showDisconnected

  // Swipe gesture handling
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current
    
    // Only trigger swipe if horizontal movement is greater than vertical
    // and the swipe is at least 50px
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - show wave list
        setShowWaveList(true)
      } else {
        // Swipe left - hide wave list
        setShowWaveList(false)
      }
    }
    
    touchStartX.current = null
    touchStartY.current = null
  }, [setShowWaveList])

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

  // Mobile: add body class and swipe listeners
  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('mobile')
      document.addEventListener('touchstart', handleTouchStart, { passive: true })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })
    } else {
      document.body.classList.remove('mobile')
    }
    
    return () => {
      document.body.classList.remove('mobile')
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, handleTouchStart, handleTouchEnd])

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

  if (!ready) {
    return (
      <>
        <TheHeader />
        <div id="container">
          <div id="loading-state">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </>
    )
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
