import { observer } from 'mobx-react-lite'
import './WaveList.css'
import { WaveType } from './WaveStore'
import WaveListView from './WaveListView'

const WaveList = observer(({ waves }: { waves?: WaveType[] }) => {
  return (
    <div className="WaveList">
      <button className="button WaveList-addwave">
        <span className="R mhide">Add conversation +</span>
        <span className="R mshow">Add+</span>
      </button>
      <div className="WaveList-active"></div>
      {waves ? waves.map((wave) => <WaveListView wave={wave} />) : ''}
      <div className="WaveList-archived"></div>
      <div className="WaveList-bottom">
        <p>
          SURF &copy; 2023{' '}
          <a
            href="http://zkiiito.github.io/SURF/"
            target="_blank"
            rel="noreferrer"
          >
            the SURF team
          </a>
        </p>
      </div>
    </div>
  )
})

export default WaveList
