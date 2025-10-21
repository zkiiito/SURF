import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

export const useUserStore = defineStore('user', () => {
  const users = ref<Map<string, User>>(new Map())
  const currentUserId = ref<string | null>(null)

  const currentUser = computed(() => {
    if (!currentUserId.value) return null
    return users.value.get(currentUserId.value) || null
  })

  const allUsers = computed(() => Array.from(users.value.values()))

  const onlineUsers = computed(() =>
    allUsers.value.filter(user => user.status === 'online')
  )

  const offlineUsers = computed(() =>
    allUsers.value.filter(user => user.status === 'offline')
  )

  function addUser(user: User) {
    users.value.set(user._id, user)
  }

  function addUsers(userList: User[]) {
    userList.forEach(user => addUser(user))
  }

  function updateUser(userId: string, updates: Partial<User>) {
    const user = users.value.get(userId)
    if (user) {
      users.value.set(userId, { ...user, ...updates })
    }
  }

  function removeUser(userId: string) {
    users.value.delete(userId)
  }

  function getUser(userId: string): User | undefined {
    return users.value.get(userId)
  }

  function setCurrentUser(userId: string) {
    currentUserId.value = userId
  }

  function initCurrentUser(user: User) {
    addUser(user)
    setCurrentUser(user._id)
    loadLocalAttributes()
  }

  function loadLocalAttributes() {
    if (!currentUser.value) return

    const showPictures = localStorage.getItem('showPictures')
    const showVideos = localStorage.getItem('showVideos')
    const showLinkPreviews = localStorage.getItem('showLinkPreviews')

    if (showPictures !== null) {
      currentUser.value.showPictures = showPictures === 'true'
    } else {
      currentUser.value.showPictures = true
    }

    if (showVideos !== null) {
      currentUser.value.showVideos = showVideos === 'true'
    } else {
      currentUser.value.showVideos = true
    }

    if (showLinkPreviews !== null) {
      currentUser.value.showLinkPreviews = showLinkPreviews === 'true'
    } else {
      currentUser.value.showLinkPreviews = true
    }
  }

  function saveLocalAttributes() {
    if (!currentUser.value) return

    localStorage.setItem('showPictures', String(currentUser.value.showPictures ?? true))
    localStorage.setItem('showVideos', String(currentUser.value.showVideos ?? true))
    localStorage.setItem('showLinkPreviews', String(currentUser.value.showLinkPreviews ?? true))
  }

  function reset() {
    users.value.clear()
    currentUserId.value = null
  }

  return {
    users,
    currentUserId,
    currentUser,
    allUsers,
    onlineUsers,
    offlineUsers,
    addUser,
    addUsers,
    updateUser,
    removeUser,
    getUser,
    setCurrentUser,
    initCurrentUser,
    loadLocalAttributes,
    saveLocalAttributes,
    reset
  }
})

