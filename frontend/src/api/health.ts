import { apiClient } from '@/lib/apiClient'
import type { HealthCheck, OllamaStatus, SystemStatus } from '@/lib/types'

export async function getHealth(): Promise<HealthCheck> {
  const { data } = await apiClient.get<HealthCheck>('/health')
  return data
}

export async function getOllamaStatus(): Promise<OllamaStatus> {
  const { data } = await apiClient.get<OllamaStatus>('/ollama/status')
  return data
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const { data } = await apiClient.get<SystemStatus>('/system/status')
  return data
}
