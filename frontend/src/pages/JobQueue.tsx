import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useJobs, useDeleteJob } from '@/hooks'
import { Card, Badge, DataTable, Button } from '@/components/ui'

const JOB_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'docking', label: 'Docking' },
  { value: 'qsar', label: 'QSAR' },
  { value: 'md', label: 'Molecular Dynamics' },
  { value: 'pharmacophore', label: 'Pharmacophore' },
]

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'running', label: 'Running' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
]

export function JobQueue() {
  const [jobType, setJobType] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading } = useJobs(100, jobType || undefined, statusFilter || undefined)
  const deleteJob = useDeleteJob()

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return '-'
    }
  }

  const getStatusVariant = (status: string) => {
    const s = (status || '').toLowerCase()
    switch (s) {
      case 'completed':
      case 'success':
        return 'success'
      case 'running':
      case 'processing':
        return 'info'
      case 'failed':
      case 'error':
        return 'error'
      case 'cancelled':
      case 'canceled':
        return 'warning'
      case 'pending':
      case 'queued':
        return 'default'
      default:
        return 'default'
    }
  }

  const formatStatus = (status: string) => {
    const s = (status || '').toLowerCase()
    switch (s) {
      case 'completed': return 'Completed'
      case 'running': return 'Running'
      case 'failed': return 'Failed'
      case 'cancelled': case 'canceled': return 'Cancelled'
      case 'pending': return 'Pending'
      case 'queued': return 'Queued'
      default: return status || 'Unknown'
    }
  }

  const getJobTypeBadge = (jobType: string) => {
    const t = (jobType || '').toLowerCase()
    switch (t) {
      case 'docking':
        return <Badge variant="info">Docking</Badge>
      case 'qsar':
        return <Badge variant="success">QSAR</Badge>
      case 'md':
        return <Badge variant="warning">MD</Badge>
      case 'pharmacophore':
        return <Badge variant="default">Pharmacophore</Badge>
      default:
        return <Badge variant="default">{jobType || 'Unknown'}</Badge>
    }
  }

  const columns = [
    { key: 'job_name', label: 'Job Name', width: '20%' },
    { key: 'job_type', label: 'Type', width: '12%' },
    { key: 'status', label: 'Status', width: '12%' },
    { key: 'binding_energy', label: 'Score', width: '15%' },
    { key: 'created_at', label: 'Created', width: '20%' },
    { key: 'actions', label: '', width: '21%' },
  ]

  const jobs = data?.jobs || []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Job Queue</h1>
          <p className="text-text-secondary mt-1">Manage your computational experiments</p>
        </div>
        <Link to="/docking">
          <Button>+ New Job</Button>
        </Link>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-700 flex gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            >
              {JOB_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            >
              {STATUS_FILTERS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1" />
          <div className="text-sm text-gray-400 self-end pb-1">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-text-tertiary">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-tertiary">No jobs yet</p>
            <Link to="/docking" className="text-primary hover:underline text-sm mt-2 inline-block">
              Start your first experiment
            </Link>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={jobs.map((job) => ({
              ...job,
              created_at: formatDate(job.created_at),
              job_type: getJobTypeBadge(job.job_type || ''),
              status: <Badge variant={getStatusVariant(job.status)}>{formatStatus(job.status)}</Badge>,
              binding_energy: job.binding_energy != null ? `${job.binding_energy.toFixed(3)}` : '-',
              actions: (
                <div className="flex gap-2">
                  <Link to={`/results?job=${job.job_uuid}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteJob.mutate(job.job_uuid)}
                  >
                    Delete
                  </Button>
                </div>
              ),
            }))}
          />
        )}
      </Card>
    </div>
  )
}
