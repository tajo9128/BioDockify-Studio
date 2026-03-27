import { useState } from 'react'
import { Card, Button, Input, Select, Tabs, TabPanel } from '@/components/ui'

export function Settings() {
  const [activeTab, setActiveTab] = useState('llm')

  const tabs = [
    { id: 'llm', label: '🤖 LLM Provider' },
    { id: 'general', label: '⚙ General' },
    { id: 'docker', label: '🐳 Docker' },
  ]

  const [llmConfig, setLlmConfig] = useState({
    provider: 'ollama',
    model: 'llama3',
    apiBase: 'http://localhost:11434',
    apiKey: '',
    temperature: '0.7',
    maxTokens: '2048',
  })

  const [generalConfig, setGeneralConfig] = useState({
    resultsDir: './data/results',
    cacheDir: './data/cache',
    theme: 'light',
    logLevel: 'INFO',
  })

  const [dockerConfig, setDockerConfig] = useState({
    timeout: '3600',
    gpuEnabled: true,
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Configure application preferences</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel>
        {activeTab === 'llm' && (
          <Card className="max-w-2xl">
            <h3 className="font-bold text-text-primary mb-4">LLM Provider Configuration</h3>
            <div className="space-y-4">
              <Select
                label="Provider"
                value={llmConfig.provider}
                onChange={(e) => setLlmConfig({ ...llmConfig, provider: e.target.value })}
                options={[
                  { value: 'ollama', label: 'Ollama (Local)' },
                  { value: 'lm_studio', label: 'LM Studio' },
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'deepseek', label: 'DeepSeek' },
                  { value: 'groq', label: 'Groq' },
                  { value: 'mistral', label: 'Mistral' },
                ]}
              />

              <Input
                label="Model"
                value={llmConfig.model}
                onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                placeholder="e.g., llama3, mixtral, gpt-4"
              />

              <Input
                label="API Base URL"
                value={llmConfig.apiBase}
                onChange={(e) => setLlmConfig({ ...llmConfig, apiBase: e.target.value })}
                placeholder="http://localhost:11434"
              />

              {llmConfig.provider === 'openai' && (
                <Input
                  label="API Key"
                  type="password"
                  value={llmConfig.apiKey}
                  onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              )}

              <Input
                label="Temperature"
                type="number"
                value={llmConfig.temperature}
                onChange={(e) => setLlmConfig({ ...llmConfig, temperature: e.target.value })}
                min={0}
                max={2}
                step={0.1}
              />

              <Input
                label="Max Tokens"
                type="number"
                value={llmConfig.maxTokens}
                onChange={(e) => setLlmConfig({ ...llmConfig, maxTokens: e.target.value })}
              />

              <div className="flex gap-3 pt-4">
                <Button>Save Changes</Button>
                <Button variant="outline">Reset to Defaults</Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'general' && (
          <Card className="max-w-2xl">
            <h3 className="font-bold text-text-primary mb-4">General Settings</h3>
            <div className="space-y-4">
              <Input
                label="Results Directory"
                value={generalConfig.resultsDir}
                onChange={(e) => setGeneralConfig({ ...generalConfig, resultsDir: e.target.value })}
              />

              <Input
                label="Cache Directory"
                value={generalConfig.cacheDir}
                onChange={(e) => setGeneralConfig({ ...generalConfig, cacheDir: e.target.value })}
              />

              <Select
                label="Theme"
                value={generalConfig.theme}
                onChange={(e) => setGeneralConfig({ ...generalConfig, theme: e.target.value })}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'auto', label: 'Auto (System)' },
                ]}
              />

              <Select
                label="Log Level"
                value={generalConfig.logLevel}
                onChange={(e) => setGeneralConfig({ ...generalConfig, logLevel: e.target.value })}
                options={[
                  { value: 'DEBUG', label: 'Debug' },
                  { value: 'INFO', label: 'Info' },
                  { value: 'WARNING', label: 'Warning' },
                  { value: 'ERROR', label: 'Error' },
                ]}
              />

              <div className="flex gap-3 pt-4">
                <Button>Save Changes</Button>
                <Button variant="outline">Reset to Defaults</Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'docker' && (
          <Card className="max-w-2xl">
            <h3 className="font-bold text-text-primary mb-4">Docker Configuration</h3>
            <div className="space-y-4">
              <Input
                label="Timeout (seconds)"
                type="number"
                value={dockerConfig.timeout}
                onChange={(e) => setDockerConfig({ ...dockerConfig, timeout: e.target.value })}
                min={60}
                max={7200}
              />

              <div className="p-4 bg-surface-secondary rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dockerConfig.gpuEnabled}
                    onChange={(e) => setDockerConfig({ ...dockerConfig, gpuEnabled: e.target.checked })}
                    className="w-5 h-5 text-primary rounded"
                  />
                  <div>
                    <p className="font-semibold text-text-primary">GPU Acceleration</p>
                    <p className="text-xs text-text-tertiary">Enable NVIDIA GPU passthrough to containers</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button>Save Changes</Button>
                <Button variant="outline">Reset to Defaults</Button>
              </div>
            </div>
          </Card>
        )}
      </TabPanel>
    </div>
  )
}
