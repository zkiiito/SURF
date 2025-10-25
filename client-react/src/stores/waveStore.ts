import { create } from 'zustand'
import type { Wave } from '@/types'
import { useMessageStore } from './messageStore'
import { useUserStore } from './userStore'

interface WaveState {
  waves: Map<string, Wave>
  currentWaveId: string | null
  
  // Computed
  allWaves: () => Wave[]
  activeWaves: () => Wave[]
  archivedWaves: () => Wave[]
  currentWave: () => Wave | null
  
  // Actions
  addWave: (wave: Wave) => void
  addWaves: (waves: Wave[]) => void
  getWave: (waveId: string) => Wave | undefined
  updateWave: (waveId: string, updates: Partial<Wave>) => void
  removeWave: (waveId: string) => void
  setCurrentWave: (waveId: string | null) => void
  getWaveUsers: (waveId: string) => any[]
  getWaveUserNames: (waveId: string) => string
  getWaveUnreadCount: (waveId: string) => number
  checkAndArchive: (waveId: string) => void
  reset: () => void
}

export const useWaveStore = create<WaveState>((set, get) => ({
  waves: new Map(),
  currentWaveId: null,
  
  allWaves: () => Array.from(get().waves.values()),
  
  activeWaves: () => get().allWaves()
    .filter(wave => !wave.archived)
    .sort((a, b) => a._id.localeCompare(b._id)),
  
  archivedWaves: () => get().allWaves()
    .filter(wave => wave.archived)
    .sort((a, b) => a._id.localeCompare(b._id)),
  
  currentWave: () => {
    const { currentWaveId } = get()
    if (!currentWaveId) return null
    return get().waves.get(currentWaveId) || null
  },
  
  addWave: (wave) => set((state) => {
    const newWaves = new Map(state.waves)
    newWaves.set(wave._id, { ...wave, current: false })
    return { waves: newWaves }
  }),
  
  addWaves: (waveList) => {
    waveList.forEach(wave => get().addWave(wave))
  },
  
  getWave: (waveId) => get().waves.get(waveId),
  
  updateWave: (waveId, updates) => set((state) => {
    const wave = state.waves.get(waveId)
    if (!wave) return state
    
    const newWaves = new Map(state.waves)
    newWaves.set(waveId, { ...wave, ...updates })
    return { waves: newWaves }
  }),
  
  removeWave: (waveId) => set((state) => {
    const newWaves = new Map(state.waves)
    newWaves.delete(waveId)
    
    // Clean up messages for this wave
    useMessageStore.getState().removeMessagesByWave(waveId)
    
    return {
      waves: newWaves,
      currentWaveId: state.currentWaveId === waveId ? null : state.currentWaveId
    }
  }),
  
  setCurrentWave: (waveId) => {
    // Unmark previous current wave
    const { currentWaveId } = get()
    if (currentWaveId) {
      get().updateWave(currentWaveId, { current: false })
    }
    
    // Set new current wave
    if (waveId) {
      get().updateWave(waveId, { current: true })
    }
    
    set({ currentWaveId: waveId })
  },
  
  getWaveUsers: (waveId) => {
    const wave = get().waves.get(waveId)
    if (!wave) return []
    
    const userStore = useUserStore.getState()
    // Remove duplicates by using a Set of user IDs first
    const uniqueUserIds = Array.from(new Set(wave.userIds))
    return uniqueUserIds
      .map(userId => userStore.getUser(userId))
      .filter((user): user is NonNullable<typeof user> => user !== undefined)
  },
  
  getWaveUserNames: (waveId) => {
    const users = get().getWaveUsers(waveId)
    return users.map(u => u.name).join(', ')
  },
  
  getWaveUnreadCount: (waveId) => {
    const messageStore = useMessageStore.getState()
    const messages = messageStore.getMessagesByWave(waveId)
    return messages.filter(msg => msg.unread).length
  },
  
  checkAndArchive: (waveId) => {
    const messageStore = useMessageStore.getState()
    const messages = messageStore.getMessagesByWave(waveId)
    
    if (messages.length === 0) return
    
    // Find the most recent message
    const latestMessage = messages.reduce((latest, msg) =>
      msg.created_at > latest.created_at ? msg : latest
    )
    
    const daysSinceLastMessage = (Date.now() - latestMessage.created_at) / (1000 * 60 * 60 * 24)
    
    if (daysSinceLastMessage > 7) {
      get().updateWave(waveId, { archived: true })
    } else {
      get().updateWave(waveId, { archived: false })
    }
  },
  
  reset: () => set({ waves: new Map(), currentWaveId: null })
}))

