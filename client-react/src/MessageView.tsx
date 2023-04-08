import { observer } from 'mobx-react-lite'
import UserView from './UserView'
import WaveStore, { Message } from './WaveStore'
import './MessageView.css'

const MessageView = observer(
  ({ message, store }: { message: Message; store: WaveStore }) => {
    function readMessage(e?: any) {
      e.preventDefault()
      if (message.unread) {
        message.unread = false
        store.readMessage(message)
      }
    }

    return (
      <div className="message" onClick={readMessage}>
        <table className={message.unread ? 'unread' : ''}>
          <tbody>
            <tr>
              <td className="message-header">
                <UserView user={message.user} />
              </td>
              <td className="message-body">
                <button className="button reply">↩</button>
                <p className="time">{message.created_at}</p>
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
            <MessageView message={reply} store={store} key={reply._id} />
          ))}
        </div>
        {message.messages.length > 0 && (
          <div className="notification threadend">
            <p>
              <button className="button threadend">
                <span className="R">Add message</span> ⤵
              </button>
            </p>
          </div>
        )}
      </div>
    )
  }
)

export default MessageView
