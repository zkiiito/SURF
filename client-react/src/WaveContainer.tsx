import { useParams } from 'react-router-dom'
import './WaveContainer.css'

function WaveContainer() {
  const { waveId } = useParams()
  return (
    <div className="Wave-Container">
      <span>{waveId}</span>
    </div>
  )
}

export default WaveContainer
