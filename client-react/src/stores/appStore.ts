import { create } from 'zustand'
import { useMessageStore } from './messageStore'
import { useUserStore } from './userStore'
import { useWaveStore } from './waveStore'

interface AppState {
  ready: boolean
  isMobile: boolean
  showWaveList: boolean
  showDisconnected: boolean
  shouldReconnect: boolean
  showEditWave: boolean
  showEditUser: boolean
  editingWaveId: string | null
  
  // Computed
  unreadCount: () => number
  pageTitle: () => string
  
  // Actions
  setReady: () => void
  setMobile: (mobile: boolean) => void
  toggleWaveList: () => void
  openEditWave: (waveId?: string | null) => void
  closeEditWave: () => void
  openEditUser: () => void
  closeEditUser: () => void
  closeAllOverlays: () => void
  handleDisconnect: (reconnect: boolean) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  isMobile: false,
  showWaveList: true,
  showDisconnected: false,
  shouldReconnect: true,
  showEditWave: false,
  showEditUser: false,
  editingWaveId: null,
  
  unreadCount: () => useMessageStore.getState().unreadCount(),
  
  pageTitle: () => {
    if (!get().ready) return 'SURF'
    const count = get().unreadCount()
    return count > 0 ? `[${count}] SURF` : 'SURF'
  },
  
  setReady: () => set({ ready: true }),
  
  setMobile: (mobile) => set({ isMobile: mobile }),
  
  toggleWaveList: () => set((state) => ({ showWaveList: !state.showWaveList })),
  
  openEditWave: (waveId = null) => set({ editingWaveId: waveId, showEditWave: true }),
  
  closeEditWave: () => set({ showEditWave: false, editingWaveId: null }),
  
  openEditUser: () => set({ showEditUser: true }),
  
  closeEditUser: () => set({ showEditUser: false }),
  
  closeAllOverlays: () => set({
    showEditWave: false,
    showEditUser: false,
    showDisconnected: false,
    editingWaveId: null
  }),
  
  handleDisconnect: (reconnect) => set({
    shouldReconnect: reconnect,
    showDisconnected: true
  }),
  
  reset: () => {
    set({
      ready: false,
      isMobile: false,
      showWaveList: true,
      showDisconnected: false,
      shouldReconnect: true,
      showEditWave: false,
      showEditUser: false,
      editingWaveId: null
    })
    
    // Reset all other stores
    useUserStore.getState().reset()
    useWaveStore.getState().reset()
    useMessageStore.getState().reset()
  }
}))

