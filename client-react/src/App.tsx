import './App.css'
import Header from './Header'
import WaveContainer from './WaveContainer'
import WaveList from './WaveList'

import socketIO from 'socket.io-client'
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import WaveStore from './WaveStore'
const socket = socketIO('http://localhost:8000', {
  withCredentials: true,
})

const App = observer(({ store }: { store: WaveStore }) => {
  useEffect(() => {
    socket.on('init', (data) => {
      console.log(data)
      store.waves = data.waves
      store.users = [...data.users, data.me]
      // setUsers([...data.users, data.me])
      store.currentUser = data.me
    })

    return () => {
      socket.off('init')
    }
  })

  return (
    <div className="App">
      <Header currentUser={store.currentUser} />
      <div id="container">
        <WaveList />
        <WaveContainer />
      </div>

      <div id="darken"></div>
    </div>
  )
})

export default App
