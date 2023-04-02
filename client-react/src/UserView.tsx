import { observer } from 'mobx-react-lite'
import { User } from './WaveStore'

const UserView = observer(({ user }: { user?: User }) => {
  if (user) {
    return (
      <img
        className={user.status}
        src={user.avatar}
        alt={user.name}
        title={user.name}
      />
    )
  }
  return <br />
})

export default UserView
