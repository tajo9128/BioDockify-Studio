import { apiClient } from '@/lib/apiClient'
import type { Job, JobRequest, DockingResult, Interaction } from '@/lib/types'

export async function createJob(job: JobRequest): Promise<{ job_uuid: string; status: string }> {
  const { data } = await apiClient.post('/jobs', job)
  return data
}

export async function getJobs(limit = 50): Promise<{ jobs: Job[] }> {
  const { data } = await apiClient.get('/jobs', { params: { limit } })
  return data
}

export async function getJob(jobUuid: string): Promise<Job> {
  const { data } = await apiClient.get(`/jobs/${jobUuid}`)
  return data
}

export async function updateJobStatus(
  jobUuid: string,
  status: string,
  bindingEnergy?: number,
  confidence?: number
): Promise<{ status: string }> {
  const { data } = await apiClient.post(`/jobs/${jobUuid}/status`, null, {
    params: { status, binding_energy: bindingEnergy, confidence },
  })
  return data
}

export async function getJobResults(jobUuid: string): Promise<{ results: DockingResult[] }> {
  const { data } = await apiClient.get(`/jobs/${jobUuid}/results`)
  return data
}

export async function getJobInteractions(
  jobUuid: string,
  poseId?: number
): Promise<{ interactions: Interaction[] }> {
  const { data } = await apiClient.get(`/jobs/${jobUuid}/interactions`, {
    params: poseId !== undefined ? { pose_id: poseId } : {},
  })
  return data
}

export async function deleteJob(jobUuid: string): Promise<{ status: string }> {
  const { data } = await apiClient.delete(`/jobs/${jobUuid}`)
  return data
}
