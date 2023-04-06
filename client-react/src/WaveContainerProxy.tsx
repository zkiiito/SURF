import { useParams } from 'react-router-dom'
import './WaveContainer.css'
import { observer } from 'mobx-react-lite'
import WaveContainer from './WaveContainer'
import { Wave } from './WaveStore'

const WaveContainerProxy = observer(({ waves }: { waves: Wave[] }) => {
  const { waveId } = useParams()
  const wave = waves.find((wave) => wave._id === waveId)
  if (wave) {
    return <WaveContainer wave={wave} />
  }
  return <div />
})

export default WaveContainerProxy
