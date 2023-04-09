import './Header.css'
import logo from './assets/surf-logo.png'
import UserView from './components/UserView'
import { observer } from 'mobx-react-lite'
import { User } from './store/User'

const Header = observer(({ currentUser }: { currentUser?: User }) => {
  return (
    <div className="Header">
      <h1>SURF</h1>
      <img className="Header-Logo" src={logo} alt="Header logo" />
      <div id="usermenu">
        <div id="currentUser">
          <UserView user={currentUser} />
          <p className="currentuser_name">{currentUser?.name}</p>
        </div>
        <button className="button edituser">
          <span className="R mhide">Edit profile</span>
          <span className="mshow">⚙</span>
        </button>
      </div>
    </div>
  )
})

export default Header
