import type { User } from '@/types'

/**
 * Handles @ mention autocomplete in a textarea
 * When user types @name and presses Tab, it autocompletes to matching wave user(s)
 * 
 * @param textarea - The textarea element
 * @param message - Current message value
 * @param setMessage - State setter for message
 * @param users - Array of wave users to match against
 */
export function mentionUser(
  textarea: HTMLTextAreaElement | null,
  message: string,
  setMessage: (value: string) => void,
  users: User[]
): void {
  if (!textarea) return

  const caretPos = textarea.selectionEnd || 0
  const atpos = message.lastIndexOf('@', caretPos - 1)

  // Check if @ exists and is within 50 chars of cursor
  if (atpos === -1 || caretPos - atpos >= 50) return

  const search = message.substring(atpos + 1, caretPos).toLowerCase()
  
  // Filter users whose names start with the search string
  const matchingUsers = users.filter(user =>
    user.name.toLowerCase().startsWith(search)
  )

  if (matchingUsers.length === 0) return

  let replace: string
  let replaceSelect = 0

  if (matchingUsers.length === 1) {
    // Single match: use the full name
    replace = matchingUsers[0].name
  } else {
    // Multiple matches: find common prefix
    replace = matchingUsers[0].name.substring(0, search.length)
    
    // Expand the common prefix as far as all users match
    while (replace.length < matchingUsers[0].name.length) {
      const testPrefix = matchingUsers[0].name.substring(0, replace.length + 1)
      const allMatch = matchingUsers.every(user =>
        user.name.substring(0, testPrefix.length).toLowerCase() === testPrefix.toLowerCase()
      )
      
      if (allMatch) {
        replace = testPrefix
      } else {
        break
      }
    }
    
    // Add ? to indicate more options and set selection
    replace = replace + '?'
    replaceSelect = 1
  }

  // Update the message with the replacement
  const newMessage = message.substring(0, atpos + 1) + replace + message.substring(caretPos)
  setMessage(newMessage)

  // Set cursor position after React re-renders
  const selectionStart = atpos + 1 + replace.length - replaceSelect
  const selectionEnd = atpos + 1 + replace.length
  
  // Use setTimeout to set selection after React updates the textarea value
  setTimeout(() => {
    textarea.selectionStart = selectionStart
    textarea.selectionEnd = selectionEnd
    textarea.focus()
  }, 0)
}
