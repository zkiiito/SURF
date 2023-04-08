import { observer } from 'mobx-react-lite'
import UserView from './UserView'
import WaveStore, { Message } from './WaveStore'
import './MessageView.css'
import { runInAction } from 'mobx'

const MessageView = observer(
  ({ message, store }: { message: Message; store: WaveStore }) => {
    const wave = store.waves.find((w) => w._id === message.waveId)

    function clickHandler(e?: any) {
      readMessage()
      setCurrent()
    }

    function readMessage() {
      if (message.unread) {
        runInAction(() => {
          message.unread = false
        })
        store.readMessage(message)
      }
    }

    function setCurrent() {
      if (wave) {
        runInAction(() => {
          wave.currentMessage = message
        })
      }
    }

    return (
      <div className="message" onClick={clickHandler}>
        <table
          className={
            (wave?.currentMessage === message ? 'selected ' : '') +
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
