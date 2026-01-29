import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { Message } from '@/types'
import { useMessageStore } from '@/stores/messageStore'
import { useUserStore } from '@/stores/userStore'
import { useWaveStore } from '@/stores/waveStore'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'
import { nl2br, stripTags } from '@/utils/text'
import UserAvatar from './UserAvatar'
import MessageReplyForm from './MessageReplyForm'

interface Props {
  message: Message
  openReplyFormId?: string | null
  onOpenReplyForm?: (messageId: string) => void
  onCloseReplyForm?: () => void
}

export interface MessageItemRef {
  scrollIntoView: () => void
  focus: () => void
}

const MessageItem = forwardRef<MessageItemRef, Props>(({ 
  message, 
  openReplyFormId = null,
  onOpenReplyForm,
  onCloseReplyForm
}, ref) => {
  const isReplyFormOpen = openReplyFormId === message._id
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
  
  const replies = useMessageStore(state => state.getReplies(message._id))
  const currentUser = useUserStore(state => state.currentUser())
  const shouldShowLinkPreview = currentUser?.showLinkPreviews ?? true
  const shouldShowPictures = currentUser?.showPictures ?? true
  const shouldShowVideos = currentUser?.showVideos ?? true

  const formattedDate = new Date(message.created_at).toLocaleString()

  // Request link preview for URLs in the message
  useEffect(() => {
    if (!shouldShowLinkPreview || message.linkPreview) return

    const urlRegex = /((https?:\/\/|www\.)\S+)/g
    const urlPictureRegex = /\.(jpg|png|gif)(\?.*)?$/i
    const urlVideoRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]+).*/i
    
    const matches = message.message.match(urlRegex)
    if (matches && matches.length > 0) {
      const url = matches[0]
      let fullUrl = url.startsWith('http') ? url : 'http://' + url
      
      // Don't request preview for images or videos
      if (!urlPictureRegex.test(fullUrl) && !urlVideoRegex.test(fullUrl)) {
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

  const formattedMessage = () => {
    let msg = message.message
    const urlRegex = /((https?:\/\/|www\.)\S+)/g
    const urlPictureRegex = /\.(jpg|png|gif)(\?.*)?$/i
    const urlVideoRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]+).*/i
    const urlVideoRegexYoutube = /.*youtu.*/i

    // Escape HTML
    msg = msg.replace(/</g, '&lt;')
    msg = msg.replace(/>/g, '&gt;')
    msg = msg.replace(/\n/g, ' \n')
    msg = stripTags(msg)
    
    // Process URLs
    const parts = msg.split(' ')
    for (let i = 0; i < parts.length; i++) {
      const matched = parts[i].match(urlRegex)
      if (matched) {
        let url = matched[0]
        let urlText = url.length > 53 ? url.substr(0, 50) + '...' : url
        url = url.startsWith('http') ? url : 'http://' + url

        if (shouldShowPictures && url.match(urlPictureRegex)) {
          // Show image
          parts[i] = parts[i].replace(matched[0], 
            `<br><a href="${url}" target="_blank"><img class="message-img" src="${url}"></a>`)
        } else if (shouldShowVideos && url.match(urlVideoRegex) && url.match(urlVideoRegexYoutube)) {
          // Show YouTube video
          const videoMatch = urlVideoRegex.exec(url)
          if (videoMatch && videoMatch[2]) {
            parts[i] = parts[i].replace(matched[0], 
              `<br><iframe width="420" height="315" src="https://youtube.com/embed/${videoMatch[2]}" frameborder="0" allowfullscreen></iframe>`)
          }
        } else {
          // Show link
          parts[i] = parts[i].replace(matched[0], 
            `<a href="${url}" target="_blank">${urlText}</a>`)
        }
      }
    }

    msg = parts.join(' ')
    msg = nl2br(msg)
    
    return msg
  }

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
      onCloseReplyForm?.()
    } else {
      onOpenReplyForm?.(message._id)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onOpenReplyForm?.(message._id)
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
                <span className="author">{messageUser.name}:</span>
                <span 
                  className="message-formatted" 
                  dangerouslySetInnerHTML={{ __html: formattedMessage() }}
                />
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
            openReplyFormId={openReplyFormId}
            onOpenReplyForm={onOpenReplyForm}
            onCloseReplyForm={onCloseReplyForm}
          />
        ))}
      </div>
      
      {isReplyFormOpen && (
        <MessageReplyForm
          message={message}
          onCancel={() => onCloseReplyForm?.()}
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
})

MessageItem.displayName = 'MessageItem'

export default MessageItem

