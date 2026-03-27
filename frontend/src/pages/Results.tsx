import { useState } from 'react'
import { Card, Tabs, TabPanel } from '@/components/ui'

export function Results() {
  const [activeTab, setActiveTab] = useState('summary')

  const tabs = [
    { id: 'summary', label: '📋 Summary' },
    { id: 'interactions', label: '🔗 Interactions' },
    { id: 'descriptors', label: '📊 Descriptors' },
    { id: 'agentzero', label: '🤖 Agent Zero' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Docking Results</h1>
        <p className="text-text-secondary mt-1">Analyze binding poses and interactions</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Card>
            <p className="text-sm text-text-secondary mb-1">Binding Energy</p>
            <p className="text-3xl font-bold text-primary">-8.42</p>
            <p className="text-xs text-text-tertiary mt-1">kcal/mol</p>
          </Card>
          <Card>
            <p className="text-sm text-text-secondary mb-1">Confidence Score</p>
            <p className="text-3xl font-bold text-success">92</p>
            <p className="text-xs text-text-tertiary mt-1">Agent Zero assessment</p>
          </Card>
          <Card>
            <p className="text-sm text-text-secondary mb-1">GNINA CNN Score</p>
            <p className="text-3xl font-bold text-secondary">0.87</p>
            <p className="text-xs text-text-tertiary mt-1">Deep learning</p>
          </Card>
        </div>

        <Card className="mt-6">
          <h3 className="font-bold text-text-primary mb-4">Pose Analysis</h3>
          <div className="text-center py-12 text-text-tertiary">
            <p>Select a completed job from the Job Queue to view detailed results</p>
            <p className="text-xs mt-1">Or run a new docking experiment</p>
          </div>
        </Card>
      </TabPanel>
    </div>
  )
}
