import './App.css'
import Header from './Header'
import WaveList from './WaveList'

import { observer } from 'mobx-react-lite'
import WaveStore from './WaveStore'
import { Outlet } from 'react-router-dom'

const App = observer(({ store }: { store: WaveStore }) => {
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
