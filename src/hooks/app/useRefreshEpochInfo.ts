import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { retry } from '@/utils/common'

export default function useRefreshEpochInfo(firstFetch?: boolean) {
  const getEpochInfo = useAppStore((s) => s.getEpochInfo)
  const connection = useAppStore((s) => s.connection)

  useEffect(() => {
    if (!useAppStore.getState().epochInfo) {
      retry(getEpochInfo)
    }
    const interval = window.setInterval(getEpochInfo, 1000 * 60)
    return () => window.clearInterval(interval)
  }, [getEpochInfo])

  useEffect(() => {
    if (!firstFetch || useAppStore.getState().epochInfo) return
    getEpochInfo()
  }, [firstFetch, getEpochInfo, connection])

  return null
}
