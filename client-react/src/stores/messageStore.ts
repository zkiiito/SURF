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
  
  getNextUnreadInWave: (waveId, currentMessageId) => {
    const findUnreadInReplies = (messageId: string): Message | null => {
      const replies = get().getReplies(messageId)
      for (const reply of replies) {
        if (reply.unread) return reply
        const nestedUnread = findUnreadInReplies(reply._id)
        if (nestedUnread) return nestedUnread
      }
      return null
    }

    // If we have a current message, start from there
    if (currentMessageId) {
      const currentMsg = get().getMessage(currentMessageId)
      if (currentMsg) {
        // First check replies of current message
        const unreadInReplies = findUnreadInReplies(currentMessageId)
        if (unreadInReplies) return unreadInReplies

        // Find all root messages after current message's root
        const rootMessages = get().getRootMessagesByWave(waveId)
        const currentRoot = currentMsg.parentId 
          ? get().getMessage(currentMsg.parentId)
          : currentMsg
        
        if (currentRoot) {
          const currentRootIndex = rootMessages.findIndex(m => m._id === currentRoot._id)
          
          // Check remaining root messages and their threads
          for (let i = currentRootIndex + 1; i < rootMessages.length; i++) {
            const rootMsg = rootMessages[i]
            if (rootMsg.unread) return rootMsg
            const unreadInThread = findUnreadInReplies(rootMsg._id)
            if (unreadInThread) return unreadInThread
          }
          
          // Wrap around to beginning
          for (let i = 0; i <= currentRootIndex; i++) {
            const rootMsg = rootMessages[i]
            if (rootMsg.unread) return rootMsg
            const unreadInThread = findUnreadInReplies(rootMsg._id)
            if (unreadInThread) return unreadInThread
          }
        }
      }
    }

    // No current message, just find first unread
    const rootMessages = get().getRootMessagesByWave(waveId)
    for (const rootMsg of rootMessages) {
      if (rootMsg.unread) return rootMsg
      const unreadInThread = findUnreadInReplies(rootMsg._id)
      if (unreadInThread) return unreadInThread
    }

    return null
  },
  
  reset: () => set({ messages: new Map(), replies: new Map() })
}))

