import { observer } from 'mobx-react-lite'
import './WaveListItem.css'
import { Wave } from './WaveStore'
import { Link } from 'react-router-dom'

const WaveListItem = observer(({ wave }: { wave: Wave }) => {
  const unreadCount = wave.messages.filter((m) => m.unread).length
  return (
    // updated class add/remove
    // open class: when active
    <Link
      to={`wave/${wave._id} `}
      className={'waveitem ' + (unreadCount > 0 ? 'updated' : '')}
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
