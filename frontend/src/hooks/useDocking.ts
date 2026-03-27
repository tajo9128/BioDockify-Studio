import { useEffect, useState, useCallback } from 'react'
import { createDockingStream, getDockingStatus } from '@/api/docking'
import type { DockingProgress } from '@/lib/types'

export function useDockingStream(jobId: string | null) {
  const [progress, setProgress] = useState<DockingProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return

    const es = createDockingStream(jobId)

    es.onopen = () => {
      setError(null)
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DockingProgress
        setProgress(data)
      } catch (e) {
        console.error('Failed to parse SSE data:', e)
      }
    }

    es.onerror = () => {
      setError('Connection lost')
      es.close()
    }

    return () => {
      es.close()
    }
  }, [jobId])

  const refetch = useCallback(async () => {
    if (!jobId) return null
    try {
      const status = await getDockingStatus(jobId)
      setProgress(status)
      return status
    } catch (e) {
      setError('Failed to fetch status')
      return null
    }
  }, [jobId])

  return { progress, error, refetch }
}
