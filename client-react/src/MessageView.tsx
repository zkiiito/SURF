import { observer } from 'mobx-react-lite'
import UserView from './UserView'
import { Message } from './WaveStore'

const MessageView = observer(({ message }: { message: Message }) => {
  return (
    <div>
      <UserView user={message.user} />
      <span>
        {message.message} {message.messages.length}
      </span>
      <div>
        {message.messages.map((reply) => (
          <MessageView message={reply} key={reply._id} />
        ))}
      </div>
    </div>
  )
})

export default MessageView
