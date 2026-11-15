import { useEffect } from 'react'
import { useUserStore } from '@/stores/userStore'
import { communicator } from '@/services/communicator'
import { t } from '@/utils/i18n'
import type { User } from '@/types'

export function useMessageUser(userId: string): User {
  const user = useUserStore(state => state.getUser(userId))

  useEffect(() => {
    if (!user) communicator.getUser(userId)
  }, [userId, user])

  // Keep the store snapshot stable while an author is being fetched. The
  // fallback belongs outside the selector, which may be read repeatedly.
  return user ?? { _id: userId, name: t('Unknown'), avatar: 'head1', status: 'offline' }
}
