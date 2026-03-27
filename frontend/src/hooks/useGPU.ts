import { useQuery } from '@tanstack/react-query'
import { getGPUStatus } from '@/api/upload'

export function useGPU() {
  return useQuery({
    queryKey: ['gpu'],
    queryFn: getGPUStatus,
    refetchInterval: 10000,
  })
}
