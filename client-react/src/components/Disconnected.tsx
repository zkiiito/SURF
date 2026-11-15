import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { t } from '@/utils/i18n'

export default function Disconnected() {
  const shouldReconnect = useAppStore(state => state.shouldReconnect)
  const [counter, setCounter] = useState(3)

  useEffect(() => {
    if (!shouldReconnect) return

    let cancelled = false
    let delay = 3
    let interval: ReturnType<typeof setInterval>
    let timeout: ReturnType<typeof setTimeout>
    let controller: AbortController | undefined

    const probe = async () => {
      controller = new AbortController()
      timeout = setTimeout(() => controller?.abort(), 900)
      try {
        const response = await fetch(`/images/surf-ico.png?reconnect=${Date.now()}`, {
          cache: 'no-store', signal: controller.signal,
        })
        if (!response.ok) throw new Error('Server unavailable')
        if (!cancelled) window.location.reload()
      } catch {
        if (!cancelled) {
          delay = Math.min(delay * 2, 60)
          schedule()
        }
      } finally {
        clearTimeout(timeout)
      }
    }

    const schedule = () => {
      let remaining = delay
      setCounter(remaining)
      interval = setInterval(() => {
        remaining--
        setCounter(remaining)
        if (remaining === 0) {
          clearInterval(interval)
          void probe()
        }
      }, 1000)
    }
    schedule()

    return () => {
      cancelled = true
      clearInterval(interval)
      clearTimeout(timeout)
      controller?.abort()
    }
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
