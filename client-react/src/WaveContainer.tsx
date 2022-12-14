import './WaveContainer.css'

function WaveContainer() {
  return (
    <div className="Wave-Container">
      <div className="empty" data-style="display: none">
        <div className="feedback">
          <h2 className="R">You have no conversations.</h2>
          <button className="button addwave R">Add conversation +</button>
        </div>
      </div>
    </div>
  )
}

export default WaveContainer
