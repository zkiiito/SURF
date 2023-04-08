import { useParams } from 'react-router-dom'
import './WaveContainer.css'
import { observer } from 'mobx-react-lite'
import WaveContainer from './WaveContainer'
import WaveStore from './WaveStore'

const WaveContainerProxy = observer(({ store }: { store: WaveStore }) => {
  const { waveId } = useParams()
  const wave = store.waves.find((wave) => wave._id === waveId)
  if (wave) {
    return <WaveContainer wave={wave} store={store} />
  }
  return <div />
})

export default WaveContainerProxy
