import { useState, useRef, useEffect, ClipboardEvent, FormEvent, KeyboardEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { Message } from '@/types'
import { useUserStore } from '@/stores/userStore'
import { useWaveStore } from '@/stores/waveStore'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'
import { mentionUser } from '@/utils/mentionUser'

const MAX_FILES = 10

interface Props {
  message: Message
  onCancel: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function MessageReplyForm({ message, onCancel }: Props) {
  const [replyMessage, setReplyMessage] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const messageUser = useUserStore(state => {
    const user = state.getUser(message.userId)
    return user || { name: 'Unknown' }
  })
  const waveUsers = useWaveStore(useShallow(state => state.getWaveUsers(message.waveId)))

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const addFiles = (incoming: File[]) => {
    setPendingFiles(prev => [...prev, ...incoming].slice(0, MAX_FILES))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (uploading) return

    if (pendingFiles.length > 0) {
      setUploading(true)
      try {
        await communicator.uploadFiles(pendingFiles, message.waveId, replyMessage, message._id)
        setPendingFiles([])
        setReplyMessage('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (err) {
        alert((err as Error).message)
      } finally {
        setUploading(false)
        textareaRef.current?.focus()
      }
      return
    }

    if (!replyMessage.trim()) return
    communicator.sendMessage(replyMessage, message.waveId, message._id)
    setReplyMessage('')
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) addFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    const pasted: File[] = []
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) pasted.push(file)
      }
    }
    if (pasted.length > 0) {
      e.preventDefault()
      addFiles(pasted)
    }
  }

  const removeFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const atLimit = pendingFiles.length >= MAX_FILES

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
          placeholder={pendingFiles.length > 0 ? t('Add caption (optional)') : `${t('Reply to message')} ${messageUser.name}`}
          className="R"
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={uploading}
        />
        {pendingFiles.length > 0 && (
          <ul className="attachment-chips">
            {pendingFiles.map((f, i) => (
              <li key={`${f.name}-${i}`} className="attachment-chip">
                📎 {f.name} ({formatBytes(f.size)})
                <a href="#" className="button cancel" onClick={(e) => { e.preventDefault(); removeFile(i) }}>✕</a>
              </li>
            ))}
          </ul>
        )}
        <p className="inline-help mhide">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            type="button"
            className="button attach R"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || atLimit}
            title={atLimit ? t('Maximum 10 files') : t('Attach file')}
          >
            📎
          </button>
          <button
            type="submit"
            className="button sendmsg R"
            disabled={uploading || (pendingFiles.length === 0 && !replyMessage.trim())}
          >
            {uploading ? t('Uploading...') : t('Save message')}
          </button>
          <span className="R hint">{t('Press Return to send, Shift-Return to break line.')}</span>
        </p>
      </form>
    </div>
  )
}

