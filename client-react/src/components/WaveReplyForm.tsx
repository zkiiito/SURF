import { useState, useRef, FormEvent, KeyboardEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { communicator } from '@/services/communicator'
import { useWaveStore } from '@/stores/waveStore'
import { t } from '@/utils/i18n'
import { mentionUser } from '@/utils/mentionUser'

interface Props {
  waveId: string
}

export default function WaveReplyForm({ waveId }: Props) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const waveUsers = useWaveStore(useShallow(state => state.getWaveUsers(waveId)))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    
    communicator.sendMessage(message, waveId, null)
    setMessage('')
    
    // Keep the form open and refocus
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      mentionUser(textareaRef.current, message, setMessage, waveUsers)
    }
  }

  return (
    <div className="notification replyform">
      <form className="add-message" method="post" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          name="message"
          placeholder={t('Add message')}
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

