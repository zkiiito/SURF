import { useEffect, useRef } from 'react'
import { useMessageStore } from '@/stores/messageStore'
import { useUserStore } from '@/stores/userStore'
import { useWaveStore } from '@/stores/waveStore'
import { useAppStore } from '@/stores/appStore'
import { communicator } from '@/services/communicator'
import { scrollToMessage } from '@/utils/scrollToMessage'
import { t } from '@/utils/i18n'

export function useMentionNotifications() {
  const ready = useAppStore(state => state.ready)
  const messages = useMessageStore(state => state.messages)
  const users = useUserStore(state => state.users)
  const currentUserId = useUserStore(state => state.currentUserId)
  const waves = useWaveStore(state => state.waves)
  const notified = useRef(new Set<string>())
  const active = useRef(new Map<Notification, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    notified.current.clear()
    return () => {
      active.current.forEach((timer, notification) => {
        clearTimeout(timer)
        notification.close()
      })
      active.current.clear()
    }
  }, [currentUserId])

  useEffect(() => {
    const me = currentUserId ? users.get(currentUserId) : undefined
    if (!ready || !me?.name || !('Notification' in window) || Notification.permission !== 'granted') return

    for (const message of messages.values()) {
      if (!message.unread || message.userId === me._id || notified.current.has(message._id) ||
          !message.message.includes(`@${me.name}`)) continue
      const wave = waves.get(message.waveId)
      if (!wave) continue
      const author = users.get(message.userId)
      if (!author) {
        communicator.getUser(message.userId)
        continue
      }

      notified.current.add(message._id)
      try {
        const notification = new Notification(t('{{ participantName }} mentioned you in {{ waveName }}!', {
          participantName: author.name, waveName: wave.title,
        }), { body: message.message, tag: `mention-${message._id}`, icon: '/images/surf-ico.png' })
        notification.onclick = () => {
          if (useUserStore.getState().currentUserId !== me._id || !useWaveStore.getState().getWave(message.waveId)) return
          window.focus()
          if (useWaveStore.getState().currentWaveId === message.waveId) {
            scrollToMessage(message._id)
          } else {
            window.location.hash = `/wave/${message.waveId}?message=${message._id}`
          }
          notification.close()
        }
        const timer = setTimeout(() => {
          notification.close()
          active.current.delete(notification)
        }, 5000)
        active.current.set(notification, timer)
      } catch {
        // Some mobile browsers expose Notification but reject its constructor.
      }
    }
  }, [ready, messages, users, currentUserId, waves])
}
