import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react'
import type { Message } from '@/types'
import { useUserStore } from '@/stores/userStore'
import { useWaveStore } from '@/stores/waveStore'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'
import { mentionUser } from '@/utils/mentionUser'

interface Props {
  message: Message
  onCancel: () => void
}

export default function MessageReplyForm({ message, onCancel }: Props) {
  const [replyMessage, setReplyMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const messageUser = useUserStore(state => {
    const user = state.getUser(message.userId)
    return user || { name: 'Unknown' }
  })
  const waveUsers = useWaveStore(state => state.getWaveUsers(message.waveId))

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!replyMessage.trim()) return
    
    communicator.sendMessage(replyMessage, message.waveId, message._id)
    setReplyMessage('')
    
    // Keep the form open and refocus
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      mentionUser(textareaRef.current, replyMessage, setReplyMessage, waveUsers)
    }
  }

  return (
    <div className="notification replyform">
      <p>
        <a className="button cancel" href="#" onClick={(e) => { e.preventDefault(); onCancel() }}>
          <span className="R">{t('Cancel')}</span> ⤴
        </a>
      </p>
      <form className="add-message threadend" method="post" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          name="message"
          placeholder={`${t('Reply to message')} ${messageUser.name}`}
          className="R"
          onKeyDown={handleKeyDown}
        />
        <p className="inline-help mhide">
          <button type="submit" className="button sendmsg R">
            {t('Save message')}
          </button>
          <span className="R hint">{t('Press Return to send, Shift-Return to break line.')}</span>
        </p>
      </form>
    </div>
  )
}

