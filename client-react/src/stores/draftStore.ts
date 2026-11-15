import { create } from 'zustand'

export interface Draft {
  message: string
  files: File[]
  uploading: boolean
}

const emptyDraft: Draft = { message: '', files: [], uploading: false }

interface DraftState {
  drafts: Map<string, Draft>
  updateDraft: (waveId: string, updates: Partial<Draft>) => void
  removeDraft: (waveId: string) => void
  reset: () => void
}

export const useDraftStore = create<DraftState>((set) => ({
  drafts: new Map(),
  updateDraft: (waveId, updates) => set(state => {
    const drafts = new Map(state.drafts)
    drafts.set(waveId, { ...emptyDraft, ...drafts.get(waveId), ...updates })
    return { drafts }
  }),
  removeDraft: waveId => set(state => {
    const drafts = new Map(state.drafts)
    drafts.delete(waveId)
    return { drafts }
  }),
  reset: () => set({ drafts: new Map() })
}))

export function useWaveDraft(waveId: string) {
  return useDraftStore(state => state.drafts.get(waveId) ?? emptyDraft)
}
