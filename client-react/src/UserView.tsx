import { observer } from 'mobx-react-lite'
import { User } from './WaveStore'
import './UserView.css'

const UserView = observer(({ user }: { user?: User }) => {
  if (user) {
    return (
      <div className="user">
        <img
          className={user.status}
          src={user.avatar}
          alt={user.name}
          title={user.name}
        />
      </div>
    )
  }
  return <br />
})

export default UserView
