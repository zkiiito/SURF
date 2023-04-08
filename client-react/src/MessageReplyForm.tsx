import './WaveReplyForm.css'

const MessageReplyForm = () => {
  return (
    <div className="notification replyform">
      <p>
        <a className="button threadend cancel" href="">
          <span className="R">Cancel</span> ⤴
        </a>
      </p>
      <form className="add-message threadend" method="post">
        <textarea
          name="message"
          placeholder="Reply to {{ user.name }}'s message"
          className="R"
        ></textarea>
        <p className="inline-help mhide">
          <button type="submit" className="button sendmsg R">
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
