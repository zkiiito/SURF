import { observer } from 'mobx-react-lite'
import UserView from './UserView'
import './MessageView.css'
import MessageReplyForm from './MessageReplyForm'
import { useEffect, useRef } from 'react'
import { Message } from '../store/Message'
import { Wave } from '../store/Wave'
import Linkify from 'linkify-react'
import LinkPreview from './LinkPreview'

const MessageView = observer(
  ({ message, wave }: { message: Message; wave: Wave }) => {
    function clickHandler(e?: any) {
      e.stopPropagation()
      wave.setCurrentMessage(message)
    }

    function setRepliedMessage(e?: any) {
      wave.setRepliedMessage(message)
    }

    function toggleRepliedMessage(e?: any) {
      e.stopPropagation()
      wave.setRepliedMessage(
        wave.repliedMessage === message ? undefined : message
      )
    }

    const scrollToRef = useRef(null)

    useEffect(() => {
      if (wave.currentMessage === message) {
        // @ts-ignore
        scrollToRef.current?.scrollIntoView({
          block: 'nearest',
          behvaior: 'smooth',
        })
      }
    })

    return (
      <div
        className="message"
        onClick={clickHandler}
        onDoubleClick={toggleRepliedMessage}
      >
        <table
          ref={scrollToRef}
          className={
            (wave.currentMessage === message ? 'selected ' : '') +
            (message.unread ? 'unread' : '')
          }
        >
          <tbody>
            <tr>
              <td className="message-header">
                <UserView user={message.user} />
              </td>
              <td className="message-body">
                <button className="button reply" onClick={toggleRepliedMessage}>
                  ↩
                </button>
                <p className="time">{message.createdAtFormatted}</p>
                <p className="message-text">
                  <span className="author">{message.user?.name}:</span>{' '}
                  <span
                    className="message-formatted"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    <Linkify options={{ truncate: 50, target: '_blank' }}>
                      {message.message}
                    </Linkify>
                  </span>
                </p>
              </td>
            </tr>
            {message.linkPreviews.map((linkPreview) => (
              <LinkPreview linkPreview={linkPreview} />
            ))}
          </tbody>
        </table>
        <div className="replies">
          {message.replies.map((reply) => (
            <MessageView message={reply} wave={wave} key={reply._id} />
          ))}
        </div>
        {message.messages.length > 0 && wave.repliedMessage !== message && (
          <div className="notification threadend">
            <p>
              <button className="button threadend" onClick={setRepliedMessage}>
                <span className="R">Add message</span> ⤵
              </button>
            </p>
          </div>
        )}
        {wave.repliedMessage === message && (
          <MessageReplyForm message={message} wave={wave} />
        )}
      </div>
    )
  }
)

export default MessageView
