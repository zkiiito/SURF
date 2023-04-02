import { useLoaderData } from 'react-router-dom'
import './WaveContainer.css'

// @ts-ignore
export async function loader({ params }) {
  return params.waveId
}

function WaveContainer() {
  const waveId = useLoaderData() as string
  return (
    <div className="Wave-Container">
      <span>{waveId}</span>
    </div>
  )
}

export default WaveContainer
