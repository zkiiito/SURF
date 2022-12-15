import './App.css'
import Header from './Header'
import WaveContainer from './WaveContainer'
import WaveList from './WaveList'

import socketIO from 'socket.io-client'
import { useEffect, useState } from 'react'
const socket = socketIO('http://localhost:8000', {
  withCredentials: true,
})

function App() {
  const [status, setStatus] = useState('offline')
  const [waves, setWawes] = useState([])
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState()

  useEffect(() => {
    socket.on('init', (data) => {
      console.log(data)
      setWawes(data.waves)
      // setUsers([...data.users, data.me])
      setCurrentUser(data.me)
    })

    return () => {
      socket.off('init')
    }
  })

  return (
    <div className="App">
      <Header />
      <div id="container">
        <WaveList />
        <WaveContainer />
      </div>

      <div id="darken"></div>
    </div>
  )
}

export default App
