import { useDoubleTap } from '@/hooks/useDoubleTap'
import { useRef, useEffect, useImperativeHandle, useMemo, memo, type Ref, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { Message } from '@/types'
import { useMessageStore } from '@/stores/messageStore'
import { useUserStore } from '@/stores/userStore'
import { useWaveStore } from '@/stores/waveStore'
import { useAppStore } from '@/stores/appStore'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'
import UserAvatar from './UserAvatar'
import MessageReplyForm from './MessageReplyForm'
import { useMessageUser } from '@/hooks/useMessageUser'

const URL_REGEX = /((https?:\/\/|www\.)\S+)/
const URL_PICTURE_REGEX = /\.(jpg|png|gif)(\?.*)?$/i
const URL_VIDEO_REGEX = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]+).*/i
const URL_VIDEO_REGEX_YOUTUBE = /.*youtu.*/i

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function parseMessageContent(
  text: string,
  shouldShowPictures: boolean,
  shouldShowVideos: boolean
): ReactNode[] {
  const nodes: ReactNode[] = []
  const lines = text.split('\n')

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) {
      nodes.push(<br key={`br-${lineIdx}`} />)
    }

    const tokens = line.split(' ')
    tokens.forEach((token, tokenIdx) => {
      if (tokenIdx > 0) {
        nodes.push(' ')
      }

      const matched = token.match(URL_REGEX)
      if (!matched) {
        nodes.push(token)
        return
      }

      const matchedUrl = matched[0]
      const matchIdx = matched.index ?? 0
      const before = token.substring(0, matchIdx)
      const after = token.substring(matchIdx + matchedUrl.length)
      const fullUrl = matchedUrl.startsWith('http') ? matchedUrl : 'http://' + matchedUrl
      const urlText = matchedUrl.length > 53 ? matchedUrl.substring(0, 50) + '...' : matchedUrl
      const key = `${lineIdx}-${tokenIdx}`

      if (before) nodes.push(before)

      const videoMatch = URL_VIDEO_REGEX.exec(fullUrl)

      if (shouldShowPictures && matchedUrl.match(URL_PICTURE_REGEX)) {
        nodes.push(
          <span key={`img-${key}`}>
            <br />
            <a href={fullUrl} target="_blank" rel="noreferrer">
              <img className="message-img" src={fullUrl} alt="" />
            </a>
          </span>
        )
      } else if (shouldShowVideos && videoMatch && videoMatch[2] && URL_VIDEO_REGEX_YOUTUBE.test(matchedUrl)) {
        nodes.push(
          <span key={`yt-${key}`}>
            <br />
            <iframe
              width="420"
              height="315"
              src={`https://youtube.com/embed/${videoMatch[2]}`}
              allowFullScreen
            />
          </span>
        )
      } else {
        nodes.push(
          <a key={`link-${key}`} href={fullUrl} target="_blank" rel="noreferrer">{urlText}</a>
        )
      }

      if (after) nodes.push(after)
    })
  })

  return nodes
}

export interface MessageItemRef {
  scrollIntoView: () => void
  focus: () => void
}

interface Props {
  message: Message
  ref?: Ref<MessageItemRef>
}

const MessageItem = memo(function MessageItem({ 
  message, 
  ref
}: Props) {
  // Subscribe to only this message's reply form state
  const isReplyFormOpen = useAppStore(state => state.openReplyFormId === message._id)
  const openReplyForm = useAppStore(state => state.openReplyForm)
  const closeReplyForm = useAppStore(state => state.closeReplyForm)
  const tableRef = useRef<HTMLTableElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const messageUser = useMessageUser(message.userId)
  
  const replies = useMessageStore(useShallow(state => state.getReplies(message._id)))
  const currentUser = useUserStore(state => state.currentUser())
  const shouldShowLinkPreview = currentUser?.showLinkPreviews ?? false
  const shouldShowPictures = currentUser?.showPictures ?? false
  const shouldShowVideos = currentUser?.showVideos ?? false

  const formattedDate = new Date(message.created_at).toLocaleString()

  const requestedPreviews = useRef(new Set<string>())
  const previewUrls = useMemo(() => [...new Set(
    (message.message.match(/((https?:\/\/|www\.)\S+)/g) ?? [])
      .map(url => url.startsWith('http') ? url : 'http://' + url)
      .filter(url => !(shouldShowPictures && URL_PICTURE_REGEX.test(url)))
      .filter(url => !(shouldShowVideos && URL_VIDEO_REGEX.test(url) && URL_VIDEO_REGEX_YOUTUBE.test(url)))
  )], [message.message, shouldShowPictures, shouldShowVideos])

  useEffect(() => {
    if (!shouldShowLinkPreview) return
    for (const url of previewUrls) {
      if (message.linkPreviews?.some(preview => preview.url === url) || requestedPreviews.current.has(url)) continue
      requestedPreviews.current.add(url)
      communicator.getLinkPreview(url, message._id)
    }
  }, [message._id, message.linkPreviews, previewUrls, shouldShowLinkPreview])

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const parent = containerRef.current.closest('.waves-container')
        if (parent) {
          const parentRect = parent.getBoundingClientRect()
          const scrollTop = rect.top - parentRect.top + parent.scrollTop - parentRect.height * 0.3
          parent.scrollTop = scrollTop
        }
      }
    },
    focus: () => {
      tableRef.current?.focus()
    }
  }))

  const messageContent = useMemo(
    () => parseMessageContent(message.message, shouldShowPictures, shouldShowVideos),
    [message.message, shouldShowPictures, shouldShowVideos]
  )

  const handleRead = () => {
    useWaveStore.getState().setCurrentMessage(message._id)
    if (message.unread) {
      communicator.readMessage(message._id, message.waveId)
      useMessageStore.getState().markAsRead(message._id)
    }
  }

  const handleReply = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isReplyFormOpen) {
      closeReplyForm()
    } else {
      openReplyForm(message._id)
    }
  }

  const doubleTap = useDoubleTap(() => openReplyForm(message._id))

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('a, button, input, textarea, img, iframe, video')) return
    e.preventDefault()
    openReplyForm(message._id)
  }

  return (
    <div className="message" id={`msg-${message._id}`} ref={containerRef}>
      <table 
        ref={tableRef}
        className={message.unread ? 'unread' : ''} 
        tabIndex={-1} 
        onClick={handleRead}
        onDoubleClick={handleDoubleClick}
        {...doubleTap}
      >
        <tbody>
          <tr>
            <td className="message-header">
              <UserAvatar user={messageUser} />
            </td>
            <td className="message-body">
              <a className="button reply" href="#" onClick={handleReply}>↩</a>
              <p className="time">{formattedDate}</p>
              <p className="message-text">
                <span className="author">{messageUser.name}:</span>{' '}
                <span className="message-formatted">{messageContent}</span>
              </p>
            </td>
          </tr>
          
          {message.attachments?.map(att => {
            const downloadUrl = `/wave/${message.waveId}/file/${message._id}/${att.storageKey}`
            const isImage = att.mimeType.startsWith('image/') && shouldShowPictures
            return (
              <tr key={att.storageKey}>
                <td className="message-header"></td>
                <td className="message-attachment message-body">
                  {isImage ? (
                    <a href={downloadUrl} target="_blank" rel="noreferrer">
                      <img src={downloadUrl} className="message-img" alt={att.filename} />
                    </a>
                  ) : (
                    <a href={downloadUrl} target="_blank" rel="noreferrer" className="attachment-card">
                      📎 {att.filename}{' '}
                      <span className="attachment-size">({formatBytes(att.size)})</span>
                    </a>
                  )}
                </td>
              </tr>
            )
          })}

          {shouldShowLinkPreview && previewUrls.map(url => message.linkPreviews?.find(preview => preview.url === url)).filter(preview => preview !== undefined).map(preview => (
            <tr key={preview.url}>
              <td className="message-header"></td>
              <td className="message-linkpreview message-body">
                <a href={preview.url} target="_blank" rel="noreferrer">
                  <b>{preview.title}</b><br />
                  {preview.image && (
                    <><img src={preview.image} className="message-img" alt="" /><br /></>
                  )}
                  <span>{preview.description}</span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="replies">
        {replies.map(reply => (
          <MessageItem 
            key={reply._id} 
            message={reply}
          />
        ))}
      </div>
      
      {isReplyFormOpen && (
        <MessageReplyForm
          message={message}
          onCancel={closeReplyForm}
        />
      )}
      
      {!isReplyFormOpen && replies.length > 0 && (
        <div className="notification threadend">
          <p>
            <a className="button threadend" href="#" onClick={handleReply}>
              <span className="R">{t('Add message')}</span> ⤵
            </a>
          </p>
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if message changed - reply form state is handled by store subscription
  return prevProps.message === nextProps.message
})

export default MessageItem
