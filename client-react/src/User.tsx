import { observer } from 'mobx-react-lite'
import { UserType } from './WaveStore'

const User = observer(({ user }: { user?: UserType }) => {
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

export default User
