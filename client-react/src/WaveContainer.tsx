import './WaveContainer.css'
import { observer } from 'mobx-react-lite'
import MessageView from './MessageView'
import { Wave } from './WaveStore'

const WaveContainer = observer(({ wave: { rootMessages } }: { wave: Wave }) => {
  return (
    <div className="Wave-Container">
      {rootMessages.map((message) => (
        <MessageView message={message} key={message._id} />
      ))}
    </div>
  )
})

export default WaveContainer
