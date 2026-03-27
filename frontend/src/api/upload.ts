import { apiClient } from '@/lib/apiClient'
import type { GPUStatus } from '@/lib/types'

export async function getGPUStatus(): Promise<GPUStatus> {
  const { data } = await apiClient.get<GPUStatus>('/gpu/status')
  return data
}

export async function uploadFile(file: File): Promise<{ filename: string; path: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function downloadFile(filename: string): Promise<{ filename: string; content: string }> {
  const { data } = await apiClient.get(`/download/${filename}`)
  return data
}
