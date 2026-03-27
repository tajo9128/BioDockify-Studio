import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobs, deleteJob, getJob, getJobResults, getJobInteractions } from '@/api/jobs'

export function useJobs(limit = 50) {
  return useQuery({
    queryKey: ['jobs', limit],
    queryFn: () => getJobs(limit),
    refetchInterval: 10000,
  })
}

export function useJob(jobUuid: string | null) {
  return useQuery({
    queryKey: ['job', jobUuid],
    queryFn: () => getJob(jobUuid!),
    enabled: !!jobUuid,
  })
}

export function useJobResults(jobUuid: string | null) {
  return useQuery({
    queryKey: ['job-results', jobUuid],
    queryFn: () => getJobResults(jobUuid!),
    enabled: !!jobUuid,
  })
}

export function useJobInteractions(jobUuid: string | null, poseId?: number) {
  return useQuery({
    queryKey: ['job-interactions', jobUuid, poseId],
    queryFn: () => getJobInteractions(jobUuid!, poseId),
    enabled: !!jobUuid,
  })
}

export function useDeleteJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
