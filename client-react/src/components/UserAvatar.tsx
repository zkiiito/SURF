import type { User } from '@/types'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import { useWaveStore } from '@/stores/waveStore'
import { communicator } from '@/services/communicator'
import { randomName } from '@/utils/randomName'

interface Props {
  user: User
}

function getAvatarSrc(avatar: string): string {
  // If avatar is already a full URL (e.g., Google OAuth profile picture), use it directly
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar
  }
  // Otherwise, treat it as a local image name
  return `/images/${avatar}.png`
}

export default function UserAvatar({ user }: Props) {
  const navigate = useNavigate()

  const chatInPrivate = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const userStore = useUserStore.getState()
    const currentUser = userStore.currentUser()
    if (!currentUser || currentUser._id === user._id || !userStore.getUser(user._id)) return

    const existing = useWaveStore.getState().allWaves().find(wave =>
      wave.userIds.length === 2 && wave.userIds.includes(currentUser._id) && wave.userIds.includes(user._id)
    )
    if (existing) {
      navigate(`/wave/${existing._id}`)
    } else {
      communicator.createWave(`${randomName()}Room`, [user._id])
    }
  }

  return (
    <img 
      className={user.status} 
      src={getAvatarSrc(user.avatar)} 
      alt={user.name} 
      title={user.name}
      onDoubleClick={chatInPrivate}
    />
  )
}
