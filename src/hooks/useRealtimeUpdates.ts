import { useEffect, useRef } from 'react'

interface RealtimeUpdate {
  type: string
  data: any
  seasonId?: string
  timestamp: number
}

export function useRealtimeUpdates(
  seasonId: string | null,
  onUpdate: (update: RealtimeUpdate) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!seasonId) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Create new EventSource connection
    const eventSource = new EventSource(`/api/events?seasonId=${seasonId}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('Real-time connection opened')
    }

    eventSource.onmessage = (event) => {
      try {
        const update: RealtimeUpdate = JSON.parse(event.data)
        
        // Only process updates for the current season
        if (!update.seasonId || update.seasonId === seasonId) {
          onUpdate(update)
        }
      } catch (error) {
        console.error('Error parsing real-time update:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Real-time connection error:', error)
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          console.log('Attempting to reconnect...')
          // The useEffect will handle reconnection
        }
      }, 5000)
    }

    // Cleanup on unmount or season change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [seasonId, onUpdate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])
}
