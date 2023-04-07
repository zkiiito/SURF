import { observer } from 'mobx-react-lite'
import { Wave } from './WaveStore'
import { Link } from 'react-router-dom'

const WaveListView = observer(({ wave }: { wave: Wave }) => {
  return (
    <Link to={`wave/${wave._id} `} className="waveitem">
      <h2>{wave.title}</h2>
      <p className="meta mhide">
        <span className="usercount R">{wave.userIds.length} participants</span>{' '}
        <span className="piros">
          {wave.messages.filter((m) => m.unread).length}
        </span>
      </p>
    </Link>
  )
})

export default WaveListView