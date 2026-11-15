import { useShallow } from 'zustand/react/shallow'
import { useWaveStore } from '@/stores/waveStore'
import { useUserStore } from '@/stores/userStore'
import type { User } from '@/types'

const noUsers: string[] = []

export function useWaveUsers(waveId?: string): User[] {
  const userIds = useWaveStore(state => (waveId ? state.getWave(waveId)?.userIds : undefined) ?? noUsers)
  return useUserStore(useShallow(state => userIds
    .map(id => state.getUser(id))
    .filter((user): user is User => user !== undefined)))
}
