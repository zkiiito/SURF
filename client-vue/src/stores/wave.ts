import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Wave } from '@/types'
import { useMessageStore } from './message'
import { useUserStore } from './user'

export const useWaveStore = defineStore('wave', () => {
  const waves = ref<Map<string, Wave>>(new Map())
  const currentWaveId = ref<string | null>(null)

  const allWaves = computed(() => Array.from(waves.value.values()))

  const activeWaves = computed(() =>
    allWaves.value
      .filter(wave => !wave.archived)
      .sort((a, b) => a._id.localeCompare(b._id))
  )

  const archivedWaves = computed(() =>
    allWaves.value
      .filter(wave => wave.archived)
      .sort((a, b) => a._id.localeCompare(b._id))
  )

  const currentWave = computed(() => {
    if (!currentWaveId.value) return null
    return waves.value.get(currentWaveId.value) || null
  })

  function addWave(wave: Wave) {
    waves.value.set(wave._id, { ...wave, current: false })
  }

  function addWaves(waveList: Wave[]) {
    waveList.forEach(wave => addWave(wave))
  }

  function getWave(waveId: string): Wave | undefined {
    return waves.value.get(waveId)
  }

  function updateWave(waveId: string, updates: Partial<Wave>) {
    const wave = waves.value.get(waveId)
    if (wave) {
      waves.value.set(waveId, { ...wave, ...updates })
    }
  }

  function removeWave(waveId: string) {
    waves.value.delete(waveId)
    
    // Clean up messages for this wave
    const messageStore = useMessageStore()
    messageStore.removeMessagesByWave(waveId)
    
    if (currentWaveId.value === waveId) {
      currentWaveId.value = null
    }
  }

  function setCurrentWave(waveId: string | null) {
    // Unmark previous current wave
    if (currentWaveId.value) {
      updateWave(currentWaveId.value, { current: false })
    }

    // Set new current wave
    currentWaveId.value = waveId
    if (waveId) {
      updateWave(waveId, { current: true })
    }
  }

  function getWaveUsers(waveId: string) {
    const wave = waves.value.get(waveId)
    if (!wave) return []

    const userStore = useUserStore()
    return wave.userIds
      .map(userId => userStore.getUser(userId))
      .filter((user): user is NonNullable<typeof user> => user !== undefined)
  }

  function getWaveUserNames(waveId: string): string {
    const users = getWaveUsers(waveId)
    return users.map(u => u.name).join(', ')
  }

  function getWaveUnreadCount(waveId: string): number {
    const messageStore = useMessageStore()
    const messages = messageStore.getMessagesByWave(waveId)
    return messages.filter(msg => msg.unread).length
  }

  function checkAndArchive(waveId: string) {
    const messageStore = useMessageStore()
    const messages = messageStore.getMessagesByWave(waveId)
    
    if (messages.length === 0) return

    // Find the most recent message
    const latestMessage = messages.reduce((latest, msg) => 
      msg.created_at > latest.created_at ? msg : latest
    )

    const daysSinceLastMessage = (Date.now() - latestMessage.created_at) / (1000 * 60 * 60 * 24)
    
    if (daysSinceLastMessage > 7) {
      updateWave(waveId, { archived: true })
    } else {
      updateWave(waveId, { archived: false })
    }
  }

  function reset() {
    waves.value.clear()
    currentWaveId.value = null
  }

  return {
    waves,
    currentWaveId,
    allWaves,
    activeWaves,
    archivedWaves,
    currentWave,
    addWave,
    addWaves,
    getWave,
    updateWave,
    removeWave,
    setCurrentWave,
    getWaveUsers,
    getWaveUserNames,
    getWaveUnreadCount,
    checkAndArchive,
    reset
  }
})

