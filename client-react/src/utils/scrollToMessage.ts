import { useWaveStore } from '@/stores/waveStore'

export function scrollToMessage(messageId: string) {
  const messageEl = document.getElementById(`msg-${messageId}`)
  if (!messageEl) return

  const tableEl = messageEl.querySelector('table')
  if (!tableEl) return

  // Get the scrollable container
  const container = messageEl.closest('.waves-container')
  if (!container) return

  // Get position relative to container (like jQuery's .position().top)
  const containerRect = container.getBoundingClientRect()
  const messageRect = messageEl.getBoundingClientRect()
  const positionTop = messageRect.top - containerRect.top
  const containerHeight = containerRect.height

  // Only scroll if message is outside the visible area (matching Backbone behavior)
  if (positionTop < 0 || positionTop > containerHeight) {
    const scrollTop = positionTop + container.scrollTop - containerHeight * 0.3
    container.scrollTop = scrollTop
  }

  // Focus the table element (triggers CSS :focus styling)
  tableEl.focus()

  // Mark as read by triggering a click
  tableEl.click()
  
  // Set as current message for next unread navigation
  useWaveStore.getState().setCurrentMessage(messageId)
}

