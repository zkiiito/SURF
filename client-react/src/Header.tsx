import './Header.css'
import logo from './assets/surf-logo.png'
import { useState } from 'react'
import User from './User'

function Header() {
  const [currentUser] = useState()

  return (
    <div className="Header">
      <h1>SURF</h1>
      <img className="Header-Logo" src={logo} alt="Header logo" />
      <div id="usermenu">
        <User user={currentUser ?? {}} />
        <button className="button edituser">
          <span className="R mhide">Edit profile</span>
          <span className="mshow">⚙</span>
        </button>
      </div>
    </div>
  )
}

export default Header
