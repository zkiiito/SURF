import { useWaveStore } from '@/stores/waveStore'
import { useMessageStore } from '@/stores/messageStore'
import { scrollToMessage } from './scrollToMessage'

export function nextUnread(waveId: string) {
  const next = useMessageStore.getState().getNextUnreadInWave(waveId, useWaveStore.getState().currentMessageId)
  if (next) {
    scrollToMessage(next._id)
  } else {
    const container = document.querySelector('.waves-container')
    if (container) container.scrollTop = container.scrollHeight
  }
}
