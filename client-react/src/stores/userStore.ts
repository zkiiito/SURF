import { create } from 'zustand'
import type { User } from '@/types'

const localAttributes = ['showPictures', 'showVideos', 'showLinkPreviews'] as const

interface UserState {
  users: Map<string, User>
  currentUserId: string | null
  
  // Computed
  currentUser: () => User | null
  allUsers: () => User[]
  onlineUsers: () => User[]
  offlineUsers: () => User[]
  
  // Actions
  addUser: (user: User) => void
  addUsers: (users: User[]) => void
  updateUser: (userId: string, updates: Partial<User>) => void
  removeUser: (userId: string) => void
  getUser: (userId: string) => User | undefined
  setCurrentUser: (userId: string) => void
  initCurrentUser: (user: User) => void
  loadLocalAttributes: () => void
  saveLocalAttributes: () => void
  reset: () => void
}

export const useUserStore = create<UserState>((set, get) => ({
  users: new Map(),
  currentUserId: null,
  
  currentUser: () => {
    const { users, currentUserId } = get()
    if (!currentUserId) return null
    return users.get(currentUserId) || null
  },
  
  allUsers: () => Array.from(get().users.values()),
  
  onlineUsers: () => get().allUsers().filter(user => user.status === 'online'),
  
  offlineUsers: () => get().allUsers().filter(user => user.status === 'offline'),
  
  addUser: (user) => set((state) => {
    const newUsers = new Map(state.users)
    newUsers.set(user._id, user)
    return { users: newUsers }
  }),
  
  addUsers: (userList) => {
    userList.forEach(user => get().addUser(user))
  },
  
  updateUser: (userId, updates) => set((state) => {
    const user = state.users.get(userId)
    if (!user) return state
    
    const newUsers = new Map(state.users)
    newUsers.set(userId, { ...user, ...updates })
    return { users: newUsers }
  }),
  
  removeUser: (userId) => set((state) => {
    const newUsers = new Map(state.users)
    newUsers.delete(userId)
    return { users: newUsers }
  }),
  
  getUser: (userId) => get().users.get(userId),
  
  setCurrentUser: (userId) => set({ currentUserId: userId }),
  
  initCurrentUser: (user) => {
    get().addUser(user)
    set({ currentUserId: user._id })
    get().loadLocalAttributes()
  },
  
  loadLocalAttributes: () => {
    const currentUser = get().currentUser()
    if (!currentUser) return
    
    const preferences = { showPictures: false, showVideos: false, showLinkPreviews: false }
    try {
      for (const attribute of localAttributes) {
        // Keep Backbone's per-user keys. Adopt the old React global setting
        // only once, so it cannot become another account's preference too.
        const key = currentUser._id + attribute
        const value = localStorage.getItem(key) ?? localStorage.getItem(attribute)
        preferences[attribute] = value === '1' || value === 'true'
        localStorage.setItem(key, preferences[attribute] ? '1' : '0')
        localStorage.removeItem(attribute)
      }
    } catch {
      // Browsers can deny storage; keep in-memory preferences usable.
    }
    get().updateUser(currentUser._id, preferences)
  },
  
  saveLocalAttributes: () => {
    const currentUser = get().currentUser()
    if (!currentUser) return
    
    try {
      for (const attribute of localAttributes) {
        localStorage.setItem(currentUser._id + attribute, currentUser[attribute] ? '1' : '0')
      }
    } catch {
      // Saving locally is optional when browser storage is unavailable.
    }
  },
  
  reset: () => set({ users: new Map(), currentUserId: null })
}))
