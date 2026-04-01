import { useState, useRef, useEffect } from 'react'
import { Card, Button, Badge } from '@/components/ui'
import { sendChat, getChatStatus } from '@/api/chat'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  toolsUsed?: string[]
  crewMode?: boolean
}

interface SystemStatus {
  status: string
  system?: { cpu_percent: number; memory_percent: number; memory_total_gb: number }
  gpu?: { available: boolean; info: any }
  services?: { rdkit: any; vina: any; gnina: any; ollama: any }
  jobs?: { total: number; completed: number; failed: number; running: number }
}

type ChatMode = 'single' | 'crew'

const CREWAI_AGENTS = [
  { id: 'docking', name: 'Docking Specialist', icon: '🧬' },
  { id: 'chemistry', name: 'Chemistry Expert', icon: '⚗️' },
  { id: 'pharmacophore', name: 'Pharmacophore Expert', icon: '💊' },
  { id: 'admet', name: 'ADMET Predictor', icon: '🛡️' },
  { id: 'analysis', name: 'Analysis Expert', icon: '🔬' },
  { id: 'qsar', name: 'QSAR Specialist', icon: '📊' },
  { id: 'orchestrator', name: 'Orchestrator', icon: '🧠' },
]

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ provider: string; available: boolean } | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [chatMode, setChatMode] = useState<ChatMode>('single')
  const [crewStatus, setCrewStatus] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
    fetchSystemStatus()
  }, [messages])

  useEffect(() => {
    fetchSystemStatus()
    const interval = setInterval(fetchSystemStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (chatMode === 'crew') {
      fetchCrewStatus()
    }
  }, [chatMode])

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/system/status')
      if (res.ok) {
        const data = await res.json()
        setSystemStatus(data)
      }
    } catch (e) {
      console.error('Failed to fetch system status:', e)
    }
  }

  const fetchCrewStatus = async () => {
    try {
      const res = await fetch('/crew/status')
      if (res.ok) {
        const data = await res.json()
        setCrewStatus(data)
      }
    } catch (e) {
      console.error('Failed to fetch crew status:', e)
    }
  }

  const runDiagnostics = async () => {
    setShowDiagnostics(true)
    try {
      const res = await fetch('/system/diagnostics')
      if (res.ok) {
        const data = await res.json()
        setDiagnostics(data)
      }
    } catch (e) {
      console.error('Failed to run diagnostics:', e)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    if (chatMode === 'crew') {
      try {
        const res = await fetch('/crew/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage.content }),
        })
        const data = await res.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || 'CrewAI returned no response.',
          timestamp: new Date(),
          crewMode: true,
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStatus({ provider: 'crewai', available: true })
      } catch (err: any) {
        const msg = err?.message || 'Failed to connect to CrewAI.'
        setError(msg)
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `CrewAI Error: ${msg}\n\nCheck your LLM settings and ensure CrewAI is configured.`,
          timestamp: new Date(),
          crewMode: true,
        }])
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const response = await sendChat(userMessage.content)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response || 'AI returned no response. Check your LLM settings.',
        timestamp: new Date(),
        toolsUsed: response.tools_used,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setStatus({ provider: response.provider || 'unknown', available: response.available !== false })
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to connect to AI assistant. Check Settings.'
      setError(msg)
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${msg}\n\nPlease check:\n1. Is the LLM service running in Settings?\n2. Is your API key valid?\n3. Is Ollama running locally?`,
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleStatus = async () => {
    try {
      const s = await getChatStatus()
      setStatus({ provider: s.provider, available: s.ollama_available })
    } catch (err) {
      console.error('Status check failed:', err)
      setStatus({ provider: 'unknown', available: false })
    }
  }

  const clearMessages = () => setMessages([])

  const formatContent = (content: string): string => {
    let formatted = content
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-xs font-mono">$1</code>')
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-3 mb-1">$1</h3>')
    formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    return formatted
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl">
            🧬
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">BioDockify AI</h1>
            <p className="text-xs text-text-secondary">
              {chatMode === 'crew' ? 'CrewAI Multi-Agent Mode' : 'AI Drug Discovery Assistant'} {status?.provider ? `• ${status.provider}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex rounded-lg overflow-hidden border border-border-light">
            <button
              onClick={() => setChatMode('single')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                chatMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              Single Agent
            </button>
            <button
              onClick={() => setChatMode('crew')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                chatMode === 'crew'
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              CrewAI
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={chatMode === 'crew' ? fetchCrewStatus : handleStatus}>
            Status
          </Button>
          <Button variant="outline" size="sm" onClick={runDiagnostics}>
            Diagnose
          </Button>
          <Button variant="outline" size="sm" onClick={clearMessages}>
            Clear
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {chatMode === 'crew' && crewStatus && (
        <div className="mb-4 p-3 bg-surface-secondary rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">CrewAI System ({crewStatus.version})</span>
            <div className="flex items-center gap-2">
              <Badge variant={crewStatus.status === 'ready' ? 'success' : 'warning'}>
                {crewStatus.status}
              </Badge>
              {crewStatus.active_jobs > 0 && (
                <Badge variant="info">{crewStatus.active_jobs} active job(s)</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {CREWAI_AGENTS.map(agent => (
              <span key={agent.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-tertiary text-xs">
                <span>{agent.icon}</span>
                <span>{agent.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {chatMode === 'single' && systemStatus && (
        <div className="mb-4 p-3 bg-surface-secondary rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">System Monitor</span>
            <button onClick={fetchSystemStatus} className="text-xs text-blue-500 hover:underline">Refresh</button>
          </div>
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemStatus.services?.rdkit?.available ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>RDKit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemStatus.services?.vina?.available ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span>Vina</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemStatus.services?.ollama?.available ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Ollama</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemStatus.gpu?.available ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>GPU</span>
            </div>
          </div>
          {systemStatus.jobs && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
              Jobs: {systemStatus.jobs.completed} completed, {systemStatus.jobs.running} running, {systemStatus.jobs.failed} failed
            </div>
          )}
        </div>
      )}

      {showDiagnostics && diagnostics && (
        <div className="mb-4 p-4 bg-surface-secondary rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">System Diagnostics</span>
            <button onClick={() => setShowDiagnostics(false)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {diagnostics.diagnostics?.map((d: any, i: number) => (
              <div key={i} className={`p-2 rounded text-xs ${
                d.status === 'pass' ? 'bg-green-100 text-green-700' :
                d.status === 'fail' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <div className="font-medium">{d.check.toUpperCase()}</div>
                <div className="truncate">{d.details}</div>
              </div>
            ))}
          </div>
          {diagnostics.summary && (
            <div className="mt-2 pt-2 border-t text-xs">
              Health: <span className={
                diagnostics.summary.health === 'good' ? 'text-green-600 font-bold' :
                diagnostics.summary.health === 'degraded' ? 'text-yellow-600 font-bold' :
                'text-red-600 font-bold'
              }>{diagnostics.summary.health}</span> ({diagnostics.summary.passed}/{diagnostics.summary.total} checks passed)
            </div>
          )}
        </div>
      )}

      {status && chatMode === 'single' && (
        <div className="mb-4 p-3 bg-surface-secondary rounded-lg flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${status.available ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm text-text-secondary">
            {status.available
              ? `Connected to ${status.provider === 'ollama' ? 'Ollama (Local)' : status.provider}`
              : 'Offline mode - Configure LLM in Settings'}
          </span>
          <Badge variant={status.available ? 'success' : 'warning'}>
            {status.available ? 'Online' : 'Offline'}
          </Badge>
        </div>
      )}

      <Card className="flex-1 flex flex-col overflow-hidden" padding="none">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-3">{chatMode === 'crew' ? '🧠' : '🧬'}</div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                {chatMode === 'crew' ? 'CrewAI Multi-Agent System' : 'Welcome to BioDockify AI'}
              </h2>
              <p className="text-text-secondary mb-6 max-w-md mx-auto">
                {chatMode === 'crew'
                  ? '7 specialized AI agents working together. Describe your drug discovery task and the orchestrator will route it to the right crew.'
                  : 'Your AI-powered drug discovery assistant. I can help with molecular docking, property prediction, lead optimization, and more!'}
              </p>

              {chatMode === 'crew' ? (
                <div className="mt-8 grid grid-cols-2 gap-4 max-w-lg mx-auto text-left">
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <div className="font-semibold text-sm mb-1">🔬 Virtual Screening</div>
                    <p className="text-xs text-text-tertiary">Screen libraries against a target protein</p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <div className="font-semibold text-sm mb-1">🧪 Lead Optimization</div>
                    <p className="text-xs text-text-tertiary">Improve lead compounds iteratively</p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <div className="font-semibold text-sm mb-1">🛡️ ADMET Prediction</div>
                    <p className="text-xs text-text-tertiary">Full ADMET profiling for compounds</p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <div className="font-semibold text-sm mb-1">🧬 Full Pipeline</div>
                    <p className="text-xs text-text-tertiary">End-to-end drug discovery workflow</p>
                  </div>
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-2 gap-4 max-w-lg mx-auto text-left">
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <div className="font-semibold text-sm mb-1">🔬 Docking</div>
                    <p className="text-xs text-text-tertiary">Run Vina/GNINA docking simulations</p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <div className="font-semibold text-sm mb-1">📊 Properties</div>
                    <p className="text-xs text-text-tertiary">Calculate MW, LogP, TPSA, drug-likeness</p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <div className="font-semibold text-sm mb-1">🧪 ADMET</div>
                    <p className="text-xs text-text-tertiary">Predict absorption and toxicity</p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-3">
                    <div className="font-semibold text-sm mb-1">💊 Optimization</div>
                    <p className="text-xs text-text-tertiary">Suggest lead compound improvements</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? msg.crewMode
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                        : 'bg-gradient-to-r from-primary to-secondary text-white'
                      : 'bg-surface-secondary text-text-primary'
                  }`}
                >
                  {msg.role === 'assistant' && msg.crewMode && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">CrewAI</span>
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs opacity-60">Using tools:</span>
                      {msg.toolsUsed.map((tool) => (
                        <Badge key={tool} variant="info">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div
                    className="text-sm whitespace-pre-wrap prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                  />
                  <p
                    className={`text-xs mt-2 ${
                      msg.role === 'user' ? 'text-white/60' : 'text-text-tertiary'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-secondary rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl animate-bounce">{chatMode === 'crew' ? '🧠' : '🤖'}</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  {chatMode === 'crew' ? 'CrewAI agents are collaborating...' : 'BioDockify AI is thinking...'}
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border-light bg-gradient-to-r from-surface-secondary to-transparent">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={
                chatMode === 'crew'
                  ? "Describe your drug discovery task... (e.g., 'Screen for kinase inhibitors')"
                  : 'Ask about molecular docking, drug-likeness, ADMET, lead optimization...'
              }
              className="flex-1 px-4 py-3 bg-white border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className={chatMode === 'crew' ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gradient-to-r from-primary to-secondary'}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚙️</span>
                  {chatMode === 'crew' ? 'Running Crew' : 'Thinking'}
                </span>
              ) : (
                'Send'
              )}
            </Button>
          </div>
          <p className="text-xs text-text-tertiary mt-2 text-center">
            {chatMode === 'crew'
              ? 'Press Enter to send • CrewAI routes your request to the appropriate specialist agents'
              : 'Press Enter to send, Shift+Enter for new line • BioDockify AI uses chain-of-thought reasoning'}
          </p>
        </div>
      </Card>
    </div>
  )
}
