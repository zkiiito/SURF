import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWaveStore } from '@/stores/waveStore'
import { useAppStore } from '@/stores/appStore'
import { t } from '@/utils/i18n'

export default function WavesView() {
  const navigate = useNavigate()
  const activeWaves = useWaveStore(state => state.activeWaves())
  const openEditWave = useAppStore(state => state.openEditWave)

  useEffect(() => {
    if (activeWaves.length > 0) {
      const lastWave = activeWaves[activeWaves.length - 1]
      navigate(`/wave/${lastWave._id}`)
    }
  }, [activeWaves, navigate])

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

