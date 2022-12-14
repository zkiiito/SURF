import './App.css'
import Header from './Header'
import WaveContainer from './WaveContainer'
import WaveList from './WaveList'

function App() {
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
