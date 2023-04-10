import './App.css'
import Header from './Header'
import WaveList from './components/WaveList'

import { observer } from 'mobx-react-lite'
import WaveStore from './store/WaveStore'
import { Navigate, useParams } from 'react-router-dom'
import WaveContainer from './components/WaveContainer'
import WaveContainerEmpty from './components/WaveContainerEmpty'
import { sortMessages } from './store/Message'

const App = observer(({ store }: { store: WaveStore }) => {
  const { waveId } = useParams()
  store.activateWave(waveId)

  const [lastMessage] = store.messages.slice().sort(sortMessages).slice(-1)

  return (
    <div className="App">
      <Header currentUser={store.currentUser} />
      <div id="container">
        <WaveList waves={store.waves} />
        {!waveId && store.ready && store.messages.length > 0 && (
          <Navigate to={'wave/' + lastMessage.waveId} />
        )}
        {store.waves.length === 0 && <WaveContainerEmpty />}
        {store.waves.map((wave) => (
          <WaveContainer wave={wave} key={'container_' + wave._id} />
        ))}
      </div>

      <div id="darken"></div>
    </div>
  )
})

export default App
