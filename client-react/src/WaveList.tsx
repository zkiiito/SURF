import './WaveList.css'

function WaveList() {
  return (
    <div className="WaveList">
      <button className="button WaveList-addwave">
        <span className="R mhide">Add conversation +</span>
        <span className="R mshow">Add+</span>
      </button>
      <div className="WaveList-active"></div>
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
}

export default WaveList
