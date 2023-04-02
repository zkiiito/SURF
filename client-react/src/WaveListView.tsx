import { observer } from 'mobx-react-lite'
import { WaveType } from './WaveStore'

const WaveListView = observer(({ wave }: { wave: WaveType }) => {
  return (
    <a className="waveitem" href="#wave/{{ wave.id }}">
      <h2>{wave.title}</h2>
      <p className="meta mhide">
        <span className="usercount R">usercount participants</span>{' '}
        <span className="piros">unreadPosts</span>
      </p>
    </a>
  )
})

export default WaveListView
