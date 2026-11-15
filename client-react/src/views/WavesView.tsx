import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useWaveStore } from '@/stores/waveStore'
import { useMessageStore } from '@/stores/messageStore'
import { useAppStore } from '@/stores/appStore'
import { t } from '@/utils/i18n'

export default function WavesView() {
  const navigate = useNavigate()
  const allWaves = useWaveStore(useShallow(state => state.allWaves()))
  const openEditWave = useAppStore(state => state.openEditWave)

  useEffect(() => {
    if (allWaves.length === 0) return

    const waveIds = new Set(allWaves.map(w => w._id))
    const allMessages = useMessageStore.getState().allMessages().filter(message => waveIds.has(message.waveId))

    let targetWaveId: string | null = null
    if (allMessages.length > 0) {
      const latest = allMessages.reduce((acc, msg) =>
        msg.created_at > acc.created_at ? msg : acc
      )
      if (waveIds.has(latest.waveId)) {
        targetWaveId = latest.waveId
      }
    }

    if (!targetWaveId) {
      targetWaveId = allWaves[allWaves.length - 1]._id
    }

    navigate(`/wave/${targetWaveId}`, { replace: true })
  }, [allWaves, navigate])

  return (
    <div className="empty">
      <div className="feedback">
        <h2 className="R">{t('You have no conversations.')}</h2>
        <a 
          className="button addwave R" 
          href="#" 
          onClick={(e) => { e.preventDefault(); openEditWave() }}
        >
          {t('Add conversation +')}
        </a>
      </div>
    </div>
  )
}

