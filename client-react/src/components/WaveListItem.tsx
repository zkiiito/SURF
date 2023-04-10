import { observer } from 'mobx-react-lite'
import './WaveListItem.css'
import { Link } from 'react-router-dom'
import { Wave } from '../store/Wave'

const WaveListItem = observer(({ wave }: { wave: Wave }) => {
  const unreadCount = wave.messages.filter((m) => m.unread).length
  return (
    <Link
      to={`wave/${wave._id} `}
      className={
        'waveitem ' +
        (unreadCount > 0 ? 'updated ' : '') +
        (wave.isActive ? 'open ' : '')
      }
    >
      <h2>{wave.title}</h2>
      <p className="meta mhide">
        <span className="usercount R">{wave.userIds.length} participants</span>{' '}
        {unreadCount > 0 && (
          <span className="piros">| {unreadCount} new messages</span>
        )}
      </p>
    </Link>
  )
})

export default WaveListItem
