<template>
  <div>
    <TheHeader />
    
    <div id="container">
      <WaveList />
      
      <div id="wave-container">
        <EmptyState v-if="waveStore.allWaves.length === 0" />
        <RouterView v-else />
      </div>
    </div>

    <!-- Overlays -->
    <div id="darken" v-if="showOverlay" @click="appStore.closeAllOverlays"></div>
    <EditWave v-if="appStore.showEditWave" />
    <EditUser v-if="appStore.showEditUser" />
    <Disconnected v-if="appStore.showDisconnected" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useWaveStore } from '@/stores/wave'
import { useMessageStore } from '@/stores/message'
import { communicator } from '@/services/communicator'
import { initI18n } from '@/utils/i18n'
import TheHeader from '@/components/TheHeader.vue'
import WaveList from '@/components/WaveList.vue'
import EmptyState from '@/components/EmptyState.vue'
import EditWave from '@/components/EditWave.vue'
import EditUser from '@/components/EditUser.vue'
import Disconnected from '@/components/Disconnected.vue'

const appStore = useAppStore()
const waveStore = useWaveStore()
const messageStore = useMessageStore()
const router = useRouter()

const showOverlay = computed(() => 
  appStore.showEditWave || appStore.showEditUser || appStore.showDisconnected
)

// Handle window resize for mobile detection
function handleResize() {
  appStore.setMobile(window.innerWidth < 1000)
}

// Handle keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  const nodeName = (e.target as HTMLElement).nodeName
  
  if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
    return
  }
  
  // Space bar - scroll to next unread
  if (e.keyCode === 32 && waveStore.currentWaveId) {
    e.preventDefault();
    // Cast to HTMLElement to access blur() method
    (document.activeElement as HTMLElement)?.blur()
    
    const nextUnread = messageStore.getNextUnreadInWave(waveStore.currentWaveId)
    if (nextUnread) {
      // Emit event for wave component to handle scrolling
      window.dispatchEvent(new CustomEvent('scrollToNextUnread'))
    }
  }
}

// Update page title
watch(() => appStore.pageTitle, (newTitle) => {
  document.title = newTitle
})

// Update favicon with unread count
watch(() => messageStore.unreadCount, (count) => {
  updateFavicon(count)
})

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

// Navigate to last wave after ready
watch(() => appStore.ready, (isReady) => {
  if (isReady) {
    const lastWave = waveStore.activeWaves[waveStore.activeWaves.length - 1]
    if (lastWave) {
      router.push(`/wave/${lastWave._id}`)
    }
  }
})

onMounted(() => {
  // Initialize i18n
  initI18n()
  
  // Initialize communicator
  communicator.initialize()
  
  // Set up event listeners
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeyDown)
  
  // Initial mobile check
  handleResize()
  
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
    }).catch(() => {
      // Silently fail
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeyDown)
  communicator.disconnect()
})
</script>

<style>
/* Mobile styles */
body.mobile #wave-list {
  left: -55%;
  transition: left 0.3s ease;
}

body.mobile #wave-list.open {
  left: 0;
}
</style>

