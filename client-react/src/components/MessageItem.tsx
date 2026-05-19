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

const URL_REGEX = /((https?:\/\/|www\.)\S+)/
const URL_PICTURE_REGEX = /\.(jpg|png|gif)(\?.*)?$/i
const URL_VIDEO_REGEX = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]+).*/i
const URL_VIDEO_REGEX_YOUTUBE = /.*youtu.*/i

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
  
  const messageUser = useUserStore(state => {
    const user = state.getUser(message.userId)
    return user || {
      _id: message.userId,
      name: 'Unknown',
      avatar: 'head1',
      status: 'offline' as const
    }
  })
  
  const replies = useMessageStore(useShallow(state => state.getReplies(message._id)))
  const currentUser = useUserStore(state => state.currentUser())
  const shouldShowLinkPreview = currentUser?.showLinkPreviews ?? true
  const shouldShowPictures = currentUser?.showPictures ?? true
  const shouldShowVideos = currentUser?.showVideos ?? true

  const formattedDate = new Date(message.created_at).toLocaleString()

  // Request link preview for URLs in the message
  useEffect(() => {
    if (!shouldShowLinkPreview || message.linkPreview) return

    const urlRegexGlobal = /((https?:\/\/|www\.)\S+)/g
    const matches = message.message.match(urlRegexGlobal)
    if (matches && matches.length > 0) {
      const url = matches[0]
      const fullUrl = url.startsWith('http') ? url : 'http://' + url

      // Don't request preview for images or videos
      if (!URL_PICTURE_REGEX.test(fullUrl) && !URL_VIDEO_REGEX.test(fullUrl)) {
        communicator.getLinkPreview(fullUrl, message._id)
      }
    }
  }, [message._id, message.message, message.linkPreview, shouldShowLinkPreview])

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

  const handleDoubleClick = (e: React.MouseEvent) => {
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
          
          {message.linkPreview && shouldShowLinkPreview && (
            <tr>
              <td className="message-header"></td>
              <td className="message-linkpreview message-body">
                <a href={message.linkPreview.url} target="_blank" rel="noreferrer">
                  <b>{message.linkPreview.title}</b><br />
                  {message.linkPreview.image && (
                    <><img src={message.linkPreview.image} className="message-img" alt="" /><br /></>
                  )}
                  <span>{message.linkPreview.description}</span>
                </a>
              </td>
            </tr>
          )}
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

