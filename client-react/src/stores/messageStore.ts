import { create } from 'zustand'
import type { Message, LinkPreview } from '@/types'

interface MessageState {
  messages: Map<string, Message>
  replies: Map<string, string[]>
  
  // Computed
  allMessages: () => Message[]
  unreadMessages: () => Message[]
  unreadCount: () => number
  
  // Actions
  addMessage: (message: Message) => void
  addMessages: (messages: Message[]) => void
  getMessage: (messageId: string) => Message | undefined
  getMessagesByWave: (waveId: string) => Message[]
  getRootMessagesByWave: (waveId: string) => Message[]
  getReplies: (messageId: string) => Message[]
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  markAsRead: (messageId: string) => void
  markAllAsReadInWave: (waveId: string) => void
  removeMessagesByWave: (waveId: string) => void
  addLinkPreview: (messageId: string, linkPreview: LinkPreview) => void
  getNextUnreadInWave: (waveId: string, afterMessageId?: string) => Message | null
  reset: () => void
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: new Map(),
  replies: new Map(),
  
  allMessages: () => Array.from(get().messages.values()),
  
  unreadMessages: () => get().allMessages().filter(msg => msg.unread),
  
  unreadCount: () => get().unreadMessages().length,
  
  addMessage: (message) => set((state) => {
    const newMessages = new Map(state.messages)
    newMessages.set(message._id, message)
    
    // Track parent-child relationships
    const newReplies = new Map(state.replies)
    if (message.parentId) {
      const parentReplies = newReplies.get(message.parentId) || []
      if (!parentReplies.includes(message._id)) {
        newReplies.set(message.parentId, [...parentReplies, message._id])
      }
    }
    
    return { messages: newMessages, replies: newReplies }
  }),
  
  addMessages: (messageList) => {
    messageList.forEach(msg => get().addMessage(msg))
  },
  
  getMessage: (messageId) => get().messages.get(messageId),
  
  getMessagesByWave: (waveId) => {
    return get().allMessages().filter(msg => msg.waveId === waveId)
  },
  
  getRootMessagesByWave: (waveId) => {
    return get().allMessages()
      .filter(msg => msg.waveId === waveId && msg.parentId === null)
      .sort((a, b) => a.created_at - b.created_at)
  },
  
  getReplies: (messageId) => {
    const replyIds = get().replies.get(messageId) || []
    return replyIds
      .map(id => get().messages.get(id))
      .filter((msg): msg is Message => msg !== undefined)
      .sort((a, b) => a.created_at - b.created_at)
  },
  
  updateMessage: (messageId, updates) => set((state) => {
    const message = state.messages.get(messageId)
    if (!message) return state
    
    const newMessages = new Map(state.messages)
    newMessages.set(messageId, { ...message, ...updates })
    return { messages: newMessages }
  }),
  
  markAsRead: (messageId) => {
    get().updateMessage(messageId, { unread: false })
  },
  
  markAllAsReadInWave: (waveId) => {
    get().getMessagesByWave(waveId).forEach(msg => {
      if (msg.unread) {
        get().markAsRead(msg._id)
      }
    })
  },
  
  removeMessagesByWave: (waveId) => set((state) => {
    const waveMessages = get().getMessagesByWave(waveId)
    const newMessages = new Map(state.messages)
    const newReplies = new Map(state.replies)
    
    waveMessages.forEach(msg => {
      newMessages.delete(msg._id)
      if (msg.parentId) {
        const parentReplies = newReplies.get(msg.parentId) || []
        newReplies.set(msg.parentId, parentReplies.filter(id => id !== msg._id))
      }
    })
    
    return { messages: newMessages, replies: newReplies }
  }),
  
  addLinkPreview: (messageId, linkPreview) => {
    get().updateMessage(messageId, { linkPreview })
  },
  
  getNextUnreadInWave: (waveId, afterMessageId) => {
    const waveMessages = get().getRootMessagesByWave(waveId)
    const unread = waveMessages.filter(msg => msg.unread)
    
    if (afterMessageId) {
      const afterMsg = get().messages.get(afterMessageId)
      if (afterMsg) {
        const afterTime = afterMsg.created_at
        const nextUnread = unread.find(msg => msg.created_at > afterTime)
        return nextUnread || unread[0] || null
      }
    }
    
    return unread[0] || null
  },
  
  reset: () => set({ messages: new Map(), replies: new Map() })
}))

