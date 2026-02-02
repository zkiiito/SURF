import type { User } from '@/types'

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
  return (
    <img 
      className={user.status} 
      src={getAvatarSrc(user.avatar)} 
      alt={user.name} 
      title={user.name}
    />
  )
}

