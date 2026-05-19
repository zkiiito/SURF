import { useState, useRef, FormEvent, KeyboardEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { communicator } from '@/services/communicator'
import { useWaveStore } from '@/stores/waveStore'
import { t } from '@/utils/i18n'
import { mentionUser } from '@/utils/mentionUser'

interface Props {
  waveId: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function WaveReplyForm({ waveId }: Props) {
  const [message, setMessage] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const waveUsers = useWaveStore(useShallow(state => state.getWaveUsers(waveId)))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (uploading) return

    if (pendingFile) {
      setUploading(true)
      try {
        await communicator.uploadFile(pendingFile, waveId, message, null)
        setPendingFile(null)
        setMessage('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (err) {
        alert((err as Error).message)
      } finally {
        setUploading(false)
        textareaRef.current?.focus()
      }
      return
    }

    if (!message.trim()) return
    communicator.sendMessage(message, waveId, null)
    setMessage('')
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPendingFile(file)
  }

  const clearFile = () => {
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="notification replyform">
      <form className="add-message" method="post" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          name="message"
          placeholder={pendingFile ? t('Add caption (optional)') : t('Add message')}
          className="R"
          onKeyDown={handleKeyDown}
          disabled={uploading}
        />
        {pendingFile && (
          <p className="attachment-chip">
            📎 {pendingFile.name} ({formatBytes(pendingFile.size)})
            <a href="#" className="button cancel" onClick={(e) => { e.preventDefault(); clearFile() }}>✕</a>
          </p>
        )}
        <p className="inline-help mhide">
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            type="button"
            className="button attach R"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title={t('Attach file')}
          >
            📎
          </button>
          <button type="submit" className="button sendmsg R" disabled={uploading || (!pendingFile && !message.trim())}>
            {uploading ? t('Uploading...') : t('Save message')}
          </button>
          <span className="R hint">{t('Press Return to send, Shift-Return to break line.')}</span>
        </p>
      </form>
    </div>
  )
}

