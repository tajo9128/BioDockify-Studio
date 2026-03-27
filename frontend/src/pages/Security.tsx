import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Badge, DataTable } from '@/components/ui'
import { getSecurityStatus, runSecurityScan } from '@/api/security'

export function Security() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['security'],
    queryFn: getSecurityStatus,
    refetchInterval: 30000,
  })

  const scanMutation = useMutation({
    mutationFn: runSecurityScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security'] })
    },
  })

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'NONE':
        return 'success'
      case 'LOW':
        return 'info'
      case 'MEDIUM':
        return 'warning'
      case 'HIGH':
      case 'CRITICAL':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Security Monitor</h1>
          <p className="text-text-secondary mt-1">Container and dependency security scanning</p>
        </div>
        <Button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
        >
          {scanMutation.isPending ? 'Scanning...' : '🔍 Run Security Scan'}
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-sm text-text-secondary mb-2">Security Status</p>
          <Badge
            variant={data?.is_secure ? 'success' : 'error'}
            className="text-base px-4 py-1"
          >
            {data?.is_secure ? '✓ SECURE' : '⚠ ISSUES FOUND'}
          </Badge>
        </Card>

        <Card className="text-center">
          <p className="text-sm text-text-secondary mb-2">Overall Severity</p>
          <Badge variant={getSeverityVariant(data?.overall_severity || 'NOT_SCANNED')} className="text-base px-4 py-1">
            {data?.overall_severity || 'N/A'}
          </Badge>
        </Card>

        <Card className="text-center">
          <p className="text-sm text-text-secondary mb-2">Total Issues</p>
          <p className="text-3xl font-bold text-text-primary">
            {data?.total_issues || 0}
          </p>
        </Card>
      </div>

      {/* Scan Results */}
      <Card>
        <h3 className="font-bold text-text-primary mb-4">Scan Results</h3>
        {isLoading ? (
          <div className="text-center py-8 text-text-tertiary">Loading...</div>
        ) : data?.scan_results && Object.keys(data.scan_results).length > 0 ? (
          <DataTable
            columns={[
              { key: 'scan_type', label: 'Scan Type' },
              { key: 'severity', label: 'Severity' },
              { key: 'issues', label: 'Issues' },
            ]}
            data={Object.entries(data.scan_results).map(([type, result]: [string, any]) => ({
              scan_type: type.toUpperCase(),
              severity: <Badge variant={getSeverityVariant(result.severity)}>{result.severity}</Badge>,
              issues: result.issues?.length || 0,
            }))}
          />
        ) : (
          <div className="text-center py-8 text-text-tertiary">
            <p>No security scan results available</p>
            <p className="text-xs mt-1">Run a security scan to see results</p>
          </div>
        )}
      </Card>

      {/* Last Scan */}
      {data?.last_scan_at && (
        <p className="text-xs text-text-tertiary mt-4 text-center">
          Last scan: {new Date(data.last_scan_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}
