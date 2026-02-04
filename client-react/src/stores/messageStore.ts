import { create } from 'zustand'
import type { Message, LinkPreview } from '@/types'

/**
 * Extract a sortable number from MongoDB ObjectId for chronological ordering.
 * ObjectId format: 4-byte timestamp + 5-byte random + 3-byte counter
 * We use timestamp + (counter % 1000) / 1000 for sub-second ordering.
 */
function getSortableId(messageId: string): number {
  if (messageId.length === 24) {
    const timestamp = parseInt(messageId.substring(0, 8), 16)
    const increment = parseInt(messageId.substring(18, 24), 16)
    return timestamp + (increment % 1000) / 1000
  }
  return 0
}

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
  getNextUnreadInWave: (waveId: string, currentMessageId?: string | null) => Message | null
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
    /**
     * Recursive function to find next unread message.
     * Matches original Backbone logic from message.model.js getNextUnread().
     * 
     * @param messageId - Message to check
     * @param minId - Only consider messages with sortableId > minId
     * @param downOnly - If true, only search children, don't go up to parent
     * @param checkedIds - Set of already checked message IDs to prevent loops
     */
    const getNextUnread = (
      messageId: string,
      minId: number,
      downOnly: boolean,
      checkedIds: Set<string>
    ): Message | null => {
      const sortableId = getSortableId(messageId)
      
      // Prevent infinite loops
      if (checkedIds.has(messageId)) {
        return null
      }
      checkedIds.add(messageId)
      
      const message = get().getMessage(messageId)
      if (!message) return null
      
      // Check if this message is unread and after minId
      if (sortableId > minId && message.unread) {
        return message
      }
      
      // Check children (replies) recursively
      const replies = get().getReplies(messageId)
      for (const reply of replies) {
        const nextUnread = getNextUnread(reply._id, minId, true, checkedIds)
        if (nextUnread) return nextUnread
      }
      
      // If not downOnly, go up to parent and check siblings
      if (!downOnly && message.parentId) {
        const parentUnread = getNextUnread(message.parentId, 0, false, checkedIds)
        if (parentUnread) return parentUnread
      }
      
      return null
    }
    
    /**
     * Get the root message ID for a given message (traverses up the tree)
     */
    const getRootId = (messageId: string): string => {
      const message = get().getMessage(messageId)
      if (!message) return messageId
      if (message.parentId) {
        return getRootId(message.parentId)
      }
      return messageId
    }
    
    let minId = 0
    
    // If we have a current message, start the search from there
    if (currentMessageId) {
      const currentMsg = get().getMessage(currentMessageId)
      if (currentMsg) {
        minId = getSortableId(currentMessageId)
        
        // First check from current message: its children, then up to parents recursively
        const checkedIds = new Set<string>()
        const nextUnread = getNextUnread(currentMessageId, minId, false, checkedIds)
        if (nextUnread) return nextUnread
        
        // Get the root message's sortable ID for filtering root messages
        const rootId = getRootId(currentMessageId)
        minId = getSortableId(rootId)
      }
    }
    
    // Check all root messages after the current root
    const rootMessages = get().getRootMessagesByWave(waveId)
    const rootsAfterCurrent = rootMessages.filter(msg => getSortableId(msg._id) > minId)
    
    for (const rootMsg of rootsAfterCurrent) {
      const checkedIds = new Set<string>()
      const nextUnread = getNextUnread(rootMsg._id, minId, true, checkedIds)
      if (nextUnread) return nextUnread
    }
    
    // Wrap around: check root messages from the beginning (before current)
    if (minId > 0) {
      const rootsBeforeCurrent = rootMessages.filter(msg => getSortableId(msg._id) <= minId)
      
      for (const rootMsg of rootsBeforeCurrent) {
        const checkedIds = new Set<string>()
        const nextUnread = getNextUnread(rootMsg._id, 0, true, checkedIds)
        if (nextUnread) return nextUnread
      }
    }
    
    return null
  },
  
  reset: () => set({ messages: new Map(), replies: new Map() })
}))

