import { useWaveStore } from '@/stores/waveStore'
import { useAppStore } from '@/stores/appStore'
import { t } from '@/utils/i18n'
import WaveListItem from './WaveListItem'

export default function WaveList() {
  const activeWaves = useWaveStore(state => state.activeWaves())
  const archivedWaves = useWaveStore(state => state.archivedWaves())
  const openEditWave = useAppStore(state => state.openEditWave)
  const showWaveList = useAppStore(state => state.showWaveList)

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

