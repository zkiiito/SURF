import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './user'
import { useWaveStore } from './wave'
import { useMessageStore } from './message'

export const useAppStore = defineStore('app', () => {
  const ready = ref(false)
  const isMobile = ref(false)
  const showWaveList = ref(true)
  const showDisconnected = ref(false)
  const shouldReconnect = ref(true)

  // Overlay states
  const showEditWave = ref(false)
  const showEditUser = ref(false)
  const editingWaveId = ref<string | null>(null)

  const unreadCount = computed(() => {
    const messageStore = useMessageStore()
    return messageStore.unreadCount
  })

  const pageTitle = computed(() => {
    if (!ready.value) return 'SURF'
    const count = unreadCount.value
    return count > 0 ? `[${count}] SURF` : 'SURF'
  })

  function setReady() {
    ready.value = true
  }

  function setMobile(mobile: boolean) {
    isMobile.value = mobile
  }

  function toggleWaveList() {
    showWaveList.value = !showWaveList.value
  }

  function openEditWave(waveId: string | null = null) {
    editingWaveId.value = waveId
    showEditWave.value = true
  }

  function closeEditWave() {
    showEditWave.value = false
    editingWaveId.value = null
  }

  function openEditUser() {
    showEditUser.value = true
  }

  function closeEditUser() {
    showEditUser.value = false
  }

  function closeAllOverlays() {
    showEditWave.value = false
    showEditUser.value = false
    showDisconnected.value = false
    editingWaveId.value = null
  }

  function handleDisconnect(reconnect: boolean) {
    shouldReconnect.value = reconnect
    showDisconnected.value = true
  }

  function reset() {
    ready.value = false
    isMobile.value = false
    showWaveList.value = true
    showDisconnected.value = false
    shouldReconnect.value = true
    showEditWave.value = false
    showEditUser.value = false
    editingWaveId.value = null

    // Reset all other stores
    const userStore = useUserStore()
    const waveStore = useWaveStore()
    const messageStore = useMessageStore()
    
    userStore.reset()
    waveStore.reset()
    messageStore.reset()
  }

  return {
    ready,
    isMobile,
    showWaveList,
    showDisconnected,
    shouldReconnect,
    showEditWave,
    showEditUser,
    editingWaveId,
    unreadCount,
    pageTitle,
    setReady,
    setMobile,
    toggleWaveList,
    openEditWave,
    closeEditWave,
    openEditUser,
    closeEditUser,
    closeAllOverlays,
    handleDisconnect,
    reset
  }
})

