import { observer } from 'mobx-react-lite'
import UserView from './UserView'
import { Message } from './WaveStore'
import './MessageView.css'

const MessageView = observer(({ message }: { message: Message }) => {
  return (
    <div className="message" id="msg-{{id}}">
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
        {message.messages.map((reply) => (
          <MessageView message={reply} key={reply._id} />
        ))}
      </div>
      {false && (
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
})

export default MessageView
