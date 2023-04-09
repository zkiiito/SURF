import { MouseEventHandler, useState } from 'react'
import './WaveReplyForm.css'
import { Wave } from './WaveStore'

const WaveReplyForm = ({ wave }: { wave: Wave }) => {
  const [messageText, setMessageText] = useState('')

  function sendMessage(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault()
    wave.sendMessage(messageText)
    setMessageText('')
  }

  function handleKeydown(e: any) {
    if (!e.shiftKey && 13 === e.keyCode) {
      //enter
      e.preventDefault()
      sendMessage()
    } else if (32 === e.keyCode && ' ' === messageText) {
      //space
      // e.preventDefault();
      // this.scrollToNextUnread();
    } else if (!e.shiftKey && 9 === e.keyCode) {
      //tab
      // e.preventDefault();
      // this.mentionUser();
    }
    e.stopPropagation()
  }

  return (
    <div className="notification replyform">
      <form className="add-message" method="post">
        <textarea
          name="message"
          placeholder="Add message"
          className="R"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeydown}
        ></textarea>
        <p className="inline-help mhide">
          <button
            type="button"
            className="button sendmsg R"
            onClick={sendMessage}
          >
            Save message
          </button>{' '}
          <span className="R hint">
            Press Return to send, Shift-Return to break line.
          </span>
        </p>
      </form>
    </div>
  )
}

export default WaveReplyForm
