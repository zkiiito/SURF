import { create } from 'zustand'
import type { User } from '@/types'

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
    
    const showPictures = localStorage.getItem('showPictures')
    const showVideos = localStorage.getItem('showVideos')
    const showLinkPreviews = localStorage.getItem('showLinkPreviews')
    
    get().updateUser(currentUser._id, {
      showPictures: showPictures !== null ? showPictures === 'true' : true,
      showVideos: showVideos !== null ? showVideos === 'true' : true,
      showLinkPreviews: showLinkPreviews !== null ? showLinkPreviews === 'true' : true
    })
  },
  
  saveLocalAttributes: () => {
    const currentUser = get().currentUser()
    if (!currentUser) return
    
    localStorage.setItem('showPictures', String(currentUser.showPictures ?? true))
    localStorage.setItem('showVideos', String(currentUser.showVideos ?? true))
    localStorage.setItem('showLinkPreviews', String(currentUser.showLinkPreviews ?? true))
  },
  
  reset: () => set({ users: new Map(), currentUserId: null })
}))

