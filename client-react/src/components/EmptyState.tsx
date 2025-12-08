import { useAppStore } from '@/stores/appStore'
import { t } from '@/utils/i18n'

export default function EmptyState() {
  const openEditWave = useAppStore(state => state.openEditWave)

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

