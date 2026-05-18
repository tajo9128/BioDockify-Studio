import { useQuery } from '@tanstack/react-query'
import { Card, Badge } from '@/components/ui'
import { getSystemStatus } from '@/api/health'
import type { SystemStatus } from '@/lib/types'

export function SystemHealth() {
  const { data, isLoading, error } = useQuery<SystemStatus>({
    queryKey: ['system-status'],
    queryFn: getSystemStatus,
    refetchInterval: 10000,
  })

  const getStatusDot = (available: boolean) => (
    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${available ? 'bg-emerald-400' : 'bg-red-400'}`} />
  )

  const getSeverityVariant = (percent: number) => {
    if (percent < 50) return 'success' as const
    if (percent < 75) return 'warning' as const
    return 'error' as const
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString()
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-400 text-lg">Failed to load system status</p>
          <p className="text-text-tertiary text-sm mt-2">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">System Health</h1>
        <p className="text-text-secondary mt-1">Real-time infrastructure monitoring</p>
        {data && (
          <p className="text-xs text-text-tertiary mt-2">
            Updated at {formatTime(data.timestamp)}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-32 animate-pulse">
              <div className="w-full h-full bg-gray-700/20 rounded" />
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Resource Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* CPU */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-text-secondary">CPU Usage</span>
                <Badge variant={getSeverityVariant(data.system.cpu_percent)} className="text-xs">
                  {data.system.cpu_percent.toFixed(1)}%
                </Badge>
              </div>
              <div className="w-full bg-gray-700/30 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    data.system.cpu_percent < 50 ? 'bg-emerald-500' :
                    data.system.cpu_percent < 75 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(data.system.cpu_percent, 100)}%` }}
                />
              </div>
            </Card>

            {/* Memory */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-text-secondary">Memory</span>
                <Badge variant={getSeverityVariant(data.system.memory_percent)} className="text-xs">
                  {data.system.memory_percent.toFixed(1)}%
                </Badge>
              </div>
              <div className="w-full bg-gray-700/30 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    data.system.memory_percent < 50 ? 'bg-emerald-500' :
                    data.system.memory_percent < 75 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(data.system.memory_percent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-text-tertiary mt-2">
                {data.system.memory_used_gb} GB / {data.system.memory_total_gb} GB
              </p>
            </Card>

            {/* Disk */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-text-secondary">Disk</span>
                <Badge variant={getSeverityVariant(data.system.disk_percent)} className="text-xs">
                  {data.system.disk_percent.toFixed(1)}%
                </Badge>
              </div>
              <div className="w-full bg-gray-700/30 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    data.system.disk_percent < 50 ? 'bg-emerald-500' :
                    data.system.disk_percent < 75 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(data.system.disk_percent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-text-tertiary mt-2">
                {data.system.disk_used_gb} GB / {data.system.disk_total_gb} GB
              </p>
            </Card>
          </div>

          {/* GPU + Services */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* GPU */}
            <Card className="p-5">
              <h3 className="text-sm font-medium text-text-secondary mb-4">GPU</h3>
              {data.gpu.available ? (
                <div className="space-y-2">
                  <div className="flex items-center">
                    {getStatusDot(true)}
                    <span className="text-text-primary font-medium">{data.gpu.info.name || 'GPU'}</span>
                  </div>
                  {data.gpu.info.memory_total && (
                    <p className="text-xs text-text-tertiary ml-4">
                      Memory: {data.gpu.info.memory_used} / {data.gpu.info.memory_total}
                    </p>
                  )}
                  {data.gpu.info.temperature && (
                    <p className="text-xs text-text-tertiary ml-4">
                      Temp: {data.gpu.info.temperature}°C
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center text-text-tertiary">
                  {getStatusDot(false)}
                  <span className="text-sm">No GPU detected</span>
                </div>
              )}
            </Card>

            {/* Services */}
            <Card className="p-5">
              <h3 className="text-sm font-medium text-text-secondary mb-4">Services</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(data.services).map(([name, svc]) => (
                  <div key={name} className="flex items-center">
                    {getStatusDot(svc.available)}
                    <span className="text-sm capitalize text-text-primary">{name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent Jobs */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text-secondary">Recent Jobs</h3>
              <div className="flex gap-3 text-xs text-text-tertiary">
                <span className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />
                  {data.jobs.completed} completed
                </span>
                <span className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />
                  {data.jobs.running} running
                </span>
                <span className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />
                  {data.jobs.failed} failed
                </span>
              </div>
            </div>
            {data.jobs.recent.length > 0 ? (
              <div className="space-y-2">
                {data.jobs.recent.map((job, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-gray-700/30 last:border-0"
                  >
                    <span className="text-sm text-text-primary">{job.job_name}</span>
                    <div className="flex items-center gap-3">
                      {job.binding_energy && (
                        <span className="text-xs text-text-tertiary">
                          {job.binding_energy.toFixed(2)} kcal/mol
                        </span>
                      )}
                      <Badge
                        variant={
                          job.status === 'completed' ? 'success' :
                          job.status === 'running' || job.status === 'pending' ? 'warning' :
                          job.status === 'failed' ? 'error' : 'default'
                        }
                        className="text-xs"
                      >
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-text-tertiary text-sm py-4">No recent jobs</p>
            )}
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-text-tertiary">
          <p>No system data available</p>
        </div>
      )}
    </div>
  )
}
