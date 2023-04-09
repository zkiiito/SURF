import './WaveContainer.css'
import { observer } from 'mobx-react-lite'
import MessageView from './MessageView'
import { Wave } from './WaveStore'
import UserView from './UserView'
import WaveReplyForm from './WaveReplyForm'
import { useEffect } from 'react'

const WaveContainer = observer(({ wave }: { wave: Wave }) => {
  useEffect(() => {
    const onSpace = (ev: KeyboardEvent) => {
      if (ev.key === ' ') {
        ev.preventDefault()
        wave.jumpToNextUnread()
      }
    }
    window.addEventListener('keydown', onSpace, false)
    return () => {
      window.removeEventListener('keydown', onSpace, false)
    }
  }, [])

  const offlineUserCount = wave.users.filter(
    (user) => user.status !== 'online'
  ).length

  function nextUnread(e?: any) {
    wave.jumpToNextUnread()
  }

  function readAllMessages(e?: any) {
    wave.readAllMessages()
  }

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
          {offlineUserCount > 0 && (
            <div className="offline-list">
              +<span className="count">{offlineUserCount}</span>
              <span className="mhide"> offline</span>
            </div>
          )}
        </div>
        <div className="buttons">
          <button className="button gounread R mhide" onClick={nextUnread}>
            Next unread
          </button>
          <button className="button editwave R mhide">Edit</button>
          <button className="button readall R mhide" onClick={readAllMessages}>
            All read
          </button>
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
            <MessageView message={message} wave={wave} key={message._id} />
          ))}
        </div>
        <WaveReplyForm wave={wave} />
      </div>
    </div>
  )
})

export default WaveContainer
