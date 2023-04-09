import { useState } from 'react'
import './WaveReplyForm.css'
import { Message, Wave } from './WaveStore'

const MessageReplyForm = ({
  message,
  wave,
}: {
  message: Message
  wave: Wave
}) => {
  const [messageText, setMessageText] = useState('')

  function sendMessage(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault()
    wave.sendMessage(messageText, message._id)
    setMessageText('')
  }

  function handleKeydown(e: any) {
    if (!e.shiftKey && 13 === e.keyCode) {
      //enter
      e.preventDefault()
      sendMessage()
    } else if (32 === e.keyCode && ' ' === messageText) {
      //space
      e.preventDefault()
      wave.jumpToNextUnread()
    } else if (!e.shiftKey && 9 === e.keyCode) {
      //tab
      // e.preventDefault();
      // this.mentionUser();
    }
    e.stopPropagation()
  }

  function closeReply(e?: any) {
    wave.setRepliedMessage(undefined)
  }

  return (
    <div className="notification replyform">
      <p>
        <button className="button threadend cancel" onClick={closeReply}>
          <span className="R">Cancel</span> ⤴
        </button>
      </p>
      <form className="add-message threadend" method="post">
        <textarea
          name="message"
          placeholder={'Reply to ' + message.user?.name + "'s message"}
          className="R"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeydown}
          autoFocus
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

export default MessageReplyForm
