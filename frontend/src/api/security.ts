import { apiClient } from '@/lib/apiClient'
import type { SecurityStatus, SecurityReport, SecurityIssue } from '@/lib/types'

export async function getSecurityStatus(): Promise<SecurityStatus> {
  const { data } = await apiClient.get<SecurityStatus>('/security/status')
  return data
}

export async function runSecurityScan(): Promise<{
  worst_severity: string
  is_secure: boolean
  total_issues: number
}> {
  const { data } = await apiClient.post('/security/scan')
  return data
}

export async function getSecurityReports(limit = 10): Promise<{ reports: SecurityReport[] }> {
  const { data } = await apiClient.get('/security/reports', { params: { limit } })
  return data
}

export async function getSecurityIssues(
  scanType?: string
): Promise<{ issues: SecurityIssue[] }> {
  const { data } = await apiClient.get('/security/issues', {
    params: scanType ? { scan_type: scanType } : {},
  })
  return data
}
