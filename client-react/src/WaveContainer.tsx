import './WaveContainer.css'
import { observer } from 'mobx-react-lite'
import MessageView from './MessageView'
import WaveStore, { Wave } from './WaveStore'
import UserView from './UserView'
import WaveReplyForm from './WaveReplyForm'

const WaveContainer = observer(
  ({ wave, store }: { wave: Wave; store: WaveStore }) => {
    const offlineUsers = wave.users.filter(
      (user) => user.status !== 'online'
    ).length
    return (
      <div className="wave">
        <div className="wavetop">
          <h2 className="wave-title">{wave.title}</h2>
          <div className="heads">
            {wave.users
              .filter((user) => user.status === 'online')
              .map((user) => (
                <UserView user={user} />
              ))}
            {offlineUsers > 0 && (
              <div className="offline-list">
                +<span className="count">{offlineUsers}</span>
                <span className="mhide"> offline</span>
              </div>
            )}
          </div>
          <div className="buttons">
            <button className="button gounread R mhide">Next unread</button>
            <button className="button editwave R mhide">Edit</button>
            <button className="button readall R mhide">All read</button>
            <button className="button quit">
              <span className="R mhide">Leave conversation</span>
              <span className="mshow">✖</span>
            </button>
          </div>
        </div>
        <div className="waves-container">
          <div className="messages">
            <div className="notification getprevmessages">
              <p>
                <a className="getprevmessages R" href="#">
                  Earlier messages
                </a>
              </p>
            </div>
            {wave.rootMessages.map((message) => (
              <MessageView message={message} store={store} key={message._id} />
            ))}
          </div>
          <WaveReplyForm store={store} wave={wave} />
        </div>
      </div>
    )
  }
)

export default WaveContainer
