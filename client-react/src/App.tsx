import './App.css'
import Header from './Header'
import WaveList from './WaveList'

import socketIO from 'socket.io-client'
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import WaveStore from './WaveStore'
import { Outlet } from 'react-router-dom'
const socket = socketIO('http://localhost:8000', {
  withCredentials: true,
  autoConnect: false,
})

const App = observer(({ store }: { store: WaveStore }) => {
  useEffect(() => {
    console.log('useEffect')
    socket.on('init', (data) => {
      console.log('init', data)
      store.login(data.waves, data.users, data.me)
      // setUsers([...data.users, data.me])
    })

    socket.connect()

    return () => {
      socket.off('init')
    }
  })

  return (
    <div className="App">
      <Header currentUser={store.currentUser} />
      <div id="container">
        <WaveList waves={store.waves} />
        <Outlet />
      </div>

      <div id="darken"></div>
    </div>
  )
})

export default App
