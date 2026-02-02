import { Link, useParams } from 'react-router-dom'
import type { Wave } from '@/types'
import { useWaveStore } from '@/stores/waveStore'
import { useMessageStore } from '@/stores/messageStore'
import { scrollToMessage } from '@/utils/scrollToMessage'
import { t } from '@/utils/i18n'

interface Props {
  wave: Wave
}

export default function WaveListItem({ wave }: Props) {
  const { id } = useParams<{ id: string }>()
  const userCount = wave.userIds.length
  const unreadCount = useWaveStore(state => state.getWaveUnreadCount(wave._id))
  const isOpen = id === wave._id

  const handleClick = (e: React.MouseEvent) => {
    // If clicking on the currently open wave, jump to next unread
    if (isOpen) {
      e.preventDefault()
      const currentMessageId = useWaveStore.getState().currentMessageId
      const nextUnread = useMessageStore.getState().getNextUnreadInWave(
        wave._id,
        currentMessageId || undefined
      )
      if (nextUnread) {
        scrollToMessage(nextUnread._id)
      }
    }
  }

  const classNames = ['waveitem']
  if (isOpen) classNames.push('open')
  if (unreadCount > 0) classNames.push('updated')

  return (
    <Link 
      to={`/wave/${wave._id}`} 
      className={classNames.join(' ')}
      onClick={handleClick}
    >
      <h2>{wave.title}</h2>
      <p className="meta mhide">
        <span className="usercount R">{userCount} {t('participants')}</span>
        {unreadCount > 0 && (
          <span className="piros"> | {unreadCount} {t('new messages')}</span>
        )}
      </p>
    </Link>
  )
}

