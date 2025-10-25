import type { Message } from '@/types'
import { useMessageStore } from '@/stores/messageStore'
import { useUserStore } from '@/stores/userStore'
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

export default function MessageItem({ 
  message, 
  openReplyFormId = null,
  onOpenReplyForm,
  onCloseReplyForm
}: Props) {
  const isReplyFormOpen = openReplyFormId === message._id
  
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

  const formattedDate = new Date(message.created_at).toLocaleString()

  const formattedMessage = () => {
    let msg = message.message
    msg = stripTags(msg, '<b><i><u><a><br>')
    msg = nl2br(msg)
    msg = msg.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank">$1</a>'
    )
    return msg
  }

  const handleRead = () => {
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
    <div className="message" id={`msg-${message._id}`}>
      <table 
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
        </tbody>
      </table>
      
      {message.linkPreview && shouldShowLinkPreview && (
        <table>
          <tbody>
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
          </tbody>
        </table>
      )}
      
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
}

