import { useEffect, useRef } from 'react'

// Runs `refresh` now, every `intervalMs` while the tab is visible, and again
// whenever the tab regains focus — so everyone sees new picks and results
// without a reload. Pass a stable (useCallback) function; changing it
// triggers an immediate refresh.
export function usePolling(refresh: () => void | Promise<void>, intervalMs = 20000) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') refreshRef.current()
    }
    const timer = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [intervalMs])
}
