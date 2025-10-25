import type { User } from '@/types'

interface Props {
  user: User
}

export default function UserAvatar({ user }: Props) {
  return (
    <img 
      className={user.status} 
      src={`/images/${user.avatar}.png`} 
      alt={user.name} 
      title={user.name}
    />
  )
}

