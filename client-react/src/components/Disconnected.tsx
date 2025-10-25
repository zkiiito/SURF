import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { t } from '@/utils/i18n'

export default function Disconnected() {
  const shouldReconnect = useAppStore(state => state.shouldReconnect)
  const [counter, setCounter] = useState(10)

  useEffect(() => {
    if (!shouldReconnect) return

    const interval = setInterval(() => {
      setCounter(prev => {
        if (prev <= 1) {
          window.location.reload()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [shouldReconnect])

  return (
    <div id="disconnected" className="overlay">
      <div className="overlay-title">
        <h2 className="R">{t('Disconnected')}</h2>
      </div>
      <div className="overlay-body">
        <h2 className="R">{t("You're disconnected")}</h2>
        {shouldReconnect && (
          <p className="countdown">
            <span className="R">{t('Retrying in:')}</span> 
            <span className="counter">{counter}</span>
          </p>
        )}
        <a href="/" className="R">{t('Reconnect')}</a>
      </div>
    </div>
  )
}

