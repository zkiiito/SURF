import { useMemo } from 'react'
import { useWaveStore } from '@/stores/waveStore'
import { useAppStore } from '@/stores/appStore'
import { t } from '@/utils/i18n'
import WaveListItem from './WaveListItem'

export default function WaveList() {
  // Subscribe directly to waves Map to ensure re-render when waves are added
  const waves = useWaveStore(state => state.waves)
  const openEditWave = useAppStore(state => state.openEditWave)
  const showWaveList = useAppStore(state => state.showWaveList)
  
  const activeWaves = useMemo(() => 
    Array.from(waves.values())
      .filter(wave => !wave.archived)
      .sort((a, b) => a._id.localeCompare(b._id)),
    [waves]
  )
  
  const archivedWaves = useMemo(() => 
    Array.from(waves.values())
      .filter(wave => wave.archived)
      .sort((a, b) => a._id.localeCompare(b._id)),
    [waves]
  )

  return (
    <div id="wave-list" className={showWaveList ? 'open' : ''}>
      <a 
        className="button addwave" 
        href="#" 
        onClick={(e) => { e.preventDefault(); openEditWave() }}
      >
        <span className="R mhide">{t('Add conversation +')}</span>
        <span className="R mshow">Add+</span>
      </a>
      
      {activeWaves.length > 0 && (
        <div id="wave-list-active">
          {activeWaves.map(wave => (
            <WaveListItem key={wave._id} wave={wave} />
          ))}
        </div>
      )}
      
      {archivedWaves.length > 0 && (
        <div id="wave-list-archived">
          {archivedWaves.map(wave => (
            <WaveListItem key={wave._id} wave={wave} />
          ))}
        </div>
      )}
      
      <div id="wavelist-bottom">
        <p>SURF &copy; 2023 <a href="http://zkiiito.github.io/SURF/" target="_blank" rel="noreferrer">the SURF team</a></p>
      </div>
    </div>
  )
}

