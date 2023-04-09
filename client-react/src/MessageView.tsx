import { observer } from 'mobx-react-lite'
import UserView from './UserView'
import WaveStore, { Message, Wave } from './WaveStore'
import './MessageView.css'
import { runInAction } from 'mobx'
import MessageReplyForm from './MessageReplyForm'

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

    return (
      <div
        className="message"
        onClick={clickHandler}
        onDoubleClick={toggleRepliedMessage}
      >
        <table
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
                  <span className="message-formatted">{message.message}</span>
                </p>
              </td>
            </tr>
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
