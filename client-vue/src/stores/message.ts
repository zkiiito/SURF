import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, LinkPreview } from '@/types'

export const useMessageStore = defineStore('message', () => {
  const messages = ref<Map<string, Message>>(new Map())
  const replies = ref<Map<string, string[]>>(new Map()) // parentId -> childIds

  const allMessages = computed(() => Array.from(messages.value.values()))

  const unreadMessages = computed(() =>
    allMessages.value.filter(msg => msg.unread)
  )

  const unreadCount = computed(() => unreadMessages.value.length)

  function addMessage(message: Message) {
    messages.value.set(message._id, message)

    // Track parent-child relationships
    if (message.parentId) {
      const parentReplies = replies.value.get(message.parentId) || []
      if (!parentReplies.includes(message._id)) {
        replies.value.set(message.parentId, [...parentReplies, message._id])
      }
    }
  }

  function addMessages(messageList: Message[]) {
    messageList.forEach(msg => addMessage(msg))
  }

  function getMessage(messageId: string): Message | undefined {
    return messages.value.get(messageId)
  }

  function getMessagesByWave(waveId: string): Message[] {
    return allMessages.value.filter(msg => msg.waveId === waveId)
  }

  function getRootMessagesByWave(waveId: string): Message[] {
    return allMessages.value
      .filter(msg => msg.waveId === waveId && msg.parentId === null)
      .sort((a, b) => a.created_at - b.created_at)
  }

  function getReplies(messageId: string): Message[] {
    const replyIds = replies.value.get(messageId) || []
    return replyIds
      .map(id => messages.value.get(id))
      .filter((msg): msg is Message => msg !== undefined)
      .sort((a, b) => a.created_at - b.created_at)
  }

  function updateMessage(messageId: string, updates: Partial<Message>) {
    const message = messages.value.get(messageId)
    if (message) {
      messages.value.set(messageId, { ...message, ...updates })
    }
  }

  function markAsRead(messageId: string) {
    updateMessage(messageId, { unread: false })
  }

  function markAllAsReadInWave(waveId: string) {
    getMessagesByWave(waveId).forEach(msg => {
      if (msg.unread) {
        markAsRead(msg._id)
      }
    })
  }

  function removeMessagesByWave(waveId: string) {
    const waveMessages = getMessagesByWave(waveId)
    waveMessages.forEach(msg => {
      messages.value.delete(msg._id)
      if (msg.parentId) {
        const parentReplies = replies.value.get(msg.parentId) || []
        replies.value.set(
          msg.parentId,
          parentReplies.filter(id => id !== msg._id)
        )
      }
    })
  }

  function addLinkPreview(messageId: string, linkPreview: LinkPreview) {
    updateMessage(messageId, { linkPreview })
  }

  function getNextUnreadInWave(waveId: string, afterMessageId?: string): Message | null {
    const waveMessages = getRootMessagesByWave(waveId)
    const unread = waveMessages.filter(msg => msg.unread)

    if (afterMessageId) {
      const afterMsg = messages.value.get(afterMessageId)
      if (afterMsg) {
        const afterTime = afterMsg.created_at
        const nextUnread = unread.find(msg => msg.created_at > afterTime)
        return nextUnread || unread[0] || null
      }
    }

    return unread[0] || null
  }

  function reset() {
    messages.value.clear()
    replies.value.clear()
  }

  return {
    messages,
    allMessages,
    unreadMessages,
    unreadCount,
    addMessage,
    addMessages,
    getMessage,
    getMessagesByWave,
    getRootMessagesByWave,
    getReplies,
    updateMessage,
    markAsRead,
    markAllAsReadInWave,
    removeMessagesByWave,
    addLinkPreview,
    getNextUnreadInWave,
    reset
  }
})

