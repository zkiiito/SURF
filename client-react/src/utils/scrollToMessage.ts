export function scrollToMessage(messageId: string) {
  const messageEl = document.getElementById(`msg-${messageId}`)
  if (!messageEl) return

  const tableEl = messageEl.querySelector('table')
  if (!tableEl) return

  // Get the scrollable container
  const container = messageEl.closest('.waves-container')
  if (!container) return

  // Calculate scroll position (30% from top like Backbone version)
  const rect = messageEl.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const scrollTop = rect.top - containerRect.top + container.scrollTop - containerRect.height * 0.3

  // Scroll to the message
  container.scrollTop = scrollTop

  // Focus the table element (triggers CSS :focus styling)
  tableEl.focus()

  // Mark as read by triggering a click
  tableEl.click()
}

