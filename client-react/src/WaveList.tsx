import { observer } from 'mobx-react-lite'
import './WaveList.css'
import { Wave } from './WaveStore'
import WaveListItem from './WaveListItem'

const WaveList = observer(({ waves = [] }: { waves: Wave[] }) => {
  return (
    <div className="WaveList">
      <button className="button WaveList-addwave">
        <span className="R mhide">Add conversation +</span>
        <span className="R mshow">Add+</span>
      </button>
      <div className="WaveList-active"></div>
      {waves.map((wave) => (
        <WaveListItem wave={wave} key={wave._id} />
      ))}
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
