import { Link, useParams } from 'react-router-dom'
import type { Wave } from '@/types'
import { useWaveStore } from '@/stores/waveStore'
import { t } from '@/utils/i18n'

interface Props {
  wave: Wave
}

export default function WaveListItem({ wave }: Props) {
  const { id } = useParams<{ id: string }>()
  const userCount = wave.userIds.length
  const unreadCount = useWaveStore(state => state.getWaveUnreadCount(wave._id))
  const isOpen = id === wave._id

  return (
    <Link 
      to={`/wave/${wave._id}`} 
      className={`waveitem${isOpen ? ' open' : ''}`}
    >
      <h2>{wave.title}</h2>
      <p className="meta mhide">
        <span className="usercount R">{userCount} {t('participants')}</span>
        {unreadCount > 0 && <span className="piros">{unreadCount}</span>}
      </p>
    </Link>
  )
}

