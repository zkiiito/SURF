import './WaveContainer.css'
import { observer } from 'mobx-react-lite'
import MessageView from './MessageView'
import { Wave } from './WaveStore'
import UserView from './UserView'

const WaveContainer = observer(({ wave }: { wave: Wave }) => {
  const offlineUsers = wave.users.filter(
    (user) => user.status !== 'online'
  ).length
  return (
    <div className="wave">
      <div className="wavetop">
        <h2 className="wave-title">{wave.title}</h2>
        <p className="heads">
          {wave.users
            .filter((user) => user.status === 'online')
            .map((user) => (
              <UserView user={user} />
            ))}
          {offlineUsers > 0 && (
            <p className="offline-list">
              +<span className="count">{offlineUsers}</span>
              <span className="mhide"> offline</span>
            </p>
          )}
        </p>
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
              {wave.rootMessages.map((message) => (
                <MessageView message={message} key={message._id} />
              ))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default WaveContainer
