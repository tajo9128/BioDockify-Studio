import { apiClient } from '@/lib/apiClient'
import type { DockingProgress } from '@/lib/types'

export async function startDocking(
  jobId: string,
  totalLigands = 10
): Promise<{ job_id: string; status: string }> {
  const formData = new FormData()
  formData.append('job_id', jobId)
  formData.append('total_ligands', String(totalLigands))

  const { data } = await apiClient.post('/dock/start', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function cancelDocking(jobId: string): Promise<{ job_id: string; status: string }> {
  const { data } = await apiClient.post(`/dock/${jobId}/cancel`)
  return data
}

export async function getDockingStatus(jobId: string): Promise<DockingProgress> {
  const { data } = await apiClient.get<DockingProgress>(`/dock/${jobId}/status`)
  return data
}

export function createDockingStream(jobId: string): EventSource {
  return new EventSource(`/dock/${jobId}/stream`)
}
