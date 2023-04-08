import { observer } from 'mobx-react-lite'
import UserView from './UserView'
import WaveStore, { Message, Wave } from './WaveStore'
import './MessageView.css'
import { runInAction } from 'mobx'

const MessageView = observer(
  ({ message, wave }: { message: Message; wave: Wave }) => {
    function clickHandler(e?: any) {
      e.stopPropagation()
      wave.setCurrentMessage(message)
    }

    return (
      <div className="message" onClick={clickHandler}>
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
                <button className="button reply">↩</button>
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
