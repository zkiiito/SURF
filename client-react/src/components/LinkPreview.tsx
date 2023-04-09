import { LinkPreviewDTO } from '../store/Message'

const LinkPreview = ({ linkPreview }: { linkPreview: LinkPreviewDTO }) => {
  if (linkPreview.url === 'youtube') {
    return (
      <tr>
        <td className="message-header"></td>
        <td className="message-linkpreview message-body">
          <iframe
            width="420"
            height="315"
            src={'https://youtube.com/embed/' + linkPreview.image}
            style={{ border: 0 }}
            allowFullScreen
          ></iframe>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td className="message-header"></td>
      <td className="message-linkpreview message-body">
        <a href={linkPreview.url} target="_blank">
          {linkPreview.title && <b>{linkPreview.title}</b>}
          {linkPreview.title && <br />}
          {linkPreview.image && (
            <img src={linkPreview.image} className="message-img" />
          )}
          {linkPreview.image && <br />}
          {linkPreview.description && <span>{linkPreview.description}</span>}
        </a>
      </td>
    </tr>
  )
}

export default LinkPreview
