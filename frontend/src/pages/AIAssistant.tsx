import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Button, Badge } from '@/components/ui'
import { sendChat, getChatStatus, getPlatformContext } from '@/api/chat'
import { executeCommand, cancelTask, getWorkerStatus } from '@/api/crewai'
import type { PlatformContext } from '@/lib/types'
import type { CommanderResponse } from '@/api/crewai'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolsUsed?: string[]
  tasks?: Array<{ id: string; worker: string; status: string }>
  workersUsed?: string[]
  recommendations?: string[]
}

const SERVICE_CONFIG: Record<string, { label: string; icon: string }> = {
  brain_service:         { label: 'BioDockify AI Brain',  icon: '🧠' },
  docking_service:       { label: 'Docking (Vina+GNINA)', icon: '🔬' },
  rdkit_service:         { label: 'RDKit Chemistry',      icon: '⚗️' },
  pharmacophore_service: { label: 'Pharmacophore',        icon: '🧲' },
  qsar_service:          { label: 'QSAR ML',              icon: '📈' },
  md_service:            { label: 'Molecular Dynamics',   icon: '💫' },
  sentinel_service:      { label: 'Sentinel (Watchdog)',  icon: '🛡️' },
  analysis_service:      { label: 'Analysis Engine',      icon: '📊' },
  api_backend:           { label: 'API Gateway',          icon: '⚡' },
}

const QUICK_CMDS = [
  { label: '⚡ Active Jobs',      text: 'Show me all active and recent jobs with their current status and binding energies' },
  { label: '🏆 Top Hits',         text: 'What are the best docking results so far? Rank by binding energy and explain the top hits' },
  { label: '🔬 Virtual Screen',   text: 'Walk me through running a complete virtual screening pipeline — pharmacophore, docking, and ranking' },
  { label: '💊 Lead Optimize',    text: 'How do I run a lead optimization workflow on my best docking hit using the analysis and QSAR services?' },
  { label: '📈 QSAR Modeling',    text: 'Explain how to train a QSAR model and predict activity for a new set of compounds' },
  { label: '💫 MD Validation',    text: 'How do I validate my top docking pose with molecular dynamics? What RMSD thresholds should I use?' },
  { label: '🧲 Pharmacophore',    text: 'Generate a pharmacophore model from my receptor-ligand complex and screen a compound library' },
  { label: '🛡️ Platform Health',  text: 'Check the health of all 9 platform services and tell me if anything needs attention' },
  { label: '🔒 Security Scan',    text: 'Run a full security scan and report vulnerabilities' },
  { label: '📊 System Status',    text: 'Check system health and resource usage' },
]

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [providerStatus, setProviderStatus] = useState<{ provider: string; available: boolean } | null>(null)
  const [ctx, setCtx] = useState<PlatformContext | null>(null)
  const [convId, setConvId] = useState<string>(() => crypto.randomUUID())
  const [selectedProvider, setSelectedProvider] = useState<'ollama' | 'paid'>(() => {
    return (localStorage.getItem('biodockify_provider_pref') as 'ollama' | 'paid') ?? 'ollama'
  })
  const [commanderMode, setCommanderMode] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: workers } = useQuery({
    queryKey: ['commander-workers'],
    queryFn: getWorkerStatus,
    refetchInterval: 15000,
    enabled: commanderMode,
  })

  const handleProviderSwitch = (p: 'ollama' | 'paid') => {
    setSelectedProvider(p)
    localStorage.setItem('biodockify_provider_pref', p)
  }

  const fetchCtx = useCallback(async () => {
    try { setCtx(await getPlatformContext()) } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchCtx()
    getChatStatus()
      .then(s => {
        setProviderStatus({ provider: s.provider, available: s.provider_available ?? s.ollama_available })
        // Auto-select best provider on first load (no saved preference)
        if (!localStorage.getItem('biodockify_provider_pref')) {
          if (!s.ollama_available && s.provider_available) {
            handleProviderSwitch('paid')
          }
        }
      })
      .catch(() => {})
    const t = setInterval(fetchCtx, 8000)
    return () => clearInterval(t)
  }, [fetchCtx])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (override?: string) => {
    const txt = (override !== undefined ? override : input).trim()
    if (!txt || loading) return
    setMessages(p => [...p, { id: Date.now().toString(), role: 'user', content: txt, timestamp: new Date() }])
    setInput('')
    setLoading(true)
    setError(null)
    try {
      if (commanderMode) {
        const res: CommanderResponse = await executeCommand(txt, convId)
        if (res.conversation_id) setConvId(res.conversation_id)
        setMessages(p => [...p, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.response || 'No response.',
          timestamp: new Date(),
          workersUsed: res.workers_used,
          tasks: res.tasks,
          recommendations: res.recommendations,
        }])
      } else {
        const res = await sendChat(txt, convId, selectedProvider)
        if (res.conversation_id) setConvId(res.conversation_id)
        setMessages(p => [...p, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.response || 'No response.',
          timestamp: new Date(),
          toolsUsed: res.tools_used,
        }])
        setProviderStatus({ provider: res.provider || 'unknown', available: res.available !== false })
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Connection failed. Check LLM settings.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (taskId: string) => {
    try {
      await cancelTask(taskId)
      setMessages(prev => prev.map(m => ({
        ...m,
        tasks: m.tasks?.map(t => t.id === taskId ? { ...t, status: 'cancelled' } : t)
      })))
    } catch (error) {
      console.error('Failed to cancel task:', error)
    }
  }

  const newSession = () => { setMessages([]); setConvId(crypto.randomUUID()) }

  const fmt = (content: string) => content
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,.08);padding:1px 4px;border-radius:3px;font-size:.85em;font-family:monospace">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<div style="font-weight:700;margin-top:8px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:1.05em;margin-top:10px">$1</div>')
    .replace(/^- (.+)$/gm, '<div style="margin-left:12px">• $1</div>')

  const activeJobs = (ctx?.recent_jobs ?? []).filter(j => ['running','queued','pending'].includes(j.status?.toLowerCase() ?? ''))
  const completedJobs = (ctx?.recent_jobs ?? []).filter(j => j.status?.toLowerCase() === 'completed')
  const failedJobs = (ctx?.recent_jobs ?? []).filter(j => j.status?.toLowerCase() === 'failed')
  const healthyCount = Object.values(ctx?.services ?? {}).filter(v => v === 'healthy').length
  const totalSvc = Object.keys(SERVICE_CONFIG).length

  return (
    <div className="h-full flex flex-col p-4 gap-3 min-h-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-md text-lg">
            🧬
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              BioDockify AI Commander
              {activeJobs.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Jobs running" />
              )}
            </h1>
            <p className="text-xs text-text-secondary">
              v4.4.6 · {totalSvc} services · {ctx?.tools_count ?? 0} AI tools · {commanderMode ? 'Commander Mode' : 'Chat Mode'}
              {ctx?.provider && ctx.provider !== 'unknown' ? ` · ${ctx.provider}` : ''}
              {ctx?.model && ctx.model !== 'unknown' ? ` / ${ctx.model}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant={commanderMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setCommanderMode(true)}
            className="text-xs"
          >
            Commander
          </Button>
          <Button
            variant={!commanderMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setCommanderMode(false)}
            className="text-xs"
          >
            Chat
          </Button>
          <Badge variant="success">Soul</Badge>
          <Badge variant="info">Memory</Badge>
          <Badge variant={healthyCount >= 7 ? 'success' : healthyCount >= 4 ? 'warning' : 'error'}>
            {healthyCount}/{totalSvc} online
          </Badge>
          <Button variant="outline" size="sm" onClick={() => fetchCtx()}>↻</Button>
          <Button variant="outline" size="sm" onClick={newSession}>New Session</Button>
        </div>
      </div>

      {/* ── Main two-panel layout ── */}
      <div className="flex-1 flex gap-3 min-h-0">

        {/* ── LEFT: Command Centre ── */}
        <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">

          {/* Platform stats */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">📊 Platform</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Total',   val: ctx?.stats?.total_jobs ?? 0,  col: 'text-blue-500'   },
                { label: 'Active',  val: activeJobs.length,             col: 'text-yellow-500' },
                { label: 'Done',    val: completedJobs.length,          col: 'text-green-500'  },
                { label: 'Failed',  val: failedJobs.length,             col: 'text-red-500'    },
              ].map(s => (
                <div key={s.label} className="bg-surface-secondary rounded p-2 text-center">
                  <div className={`text-lg font-bold ${s.col}`}>{s.val}</div>
                  <div className="text-xs text-text-tertiary">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Services health */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">🔬 Services</div>
            <div className="space-y-0.5">
              {Object.entries(SERVICE_CONFIG).map(([key, { label, icon }]) => {
                const st = ctx?.services?.[key] ?? 'unknown'
                const dot = st === 'healthy' ? 'bg-green-500' : st === 'unhealthy' ? 'bg-red-500' : 'bg-gray-400'
                return (
                  <div key={key} className="flex items-center gap-1.5 py-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${st === 'healthy' ? 'animate-pulse' : ''}`} />
                    <span className="text-xs text-text-primary truncate flex-1">{icon} {label}</span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Active jobs */}
          {activeJobs.length > 0 && (
            <Card className="p-3">
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">⚡ Active ({activeJobs.length})</div>
              <div className="space-y-1.5">
                {activeJobs.slice(0, 4).map((job, i) => (
                  <button
                    key={i}
                    className="w-full text-left bg-surface-secondary rounded p-2 hover:bg-surface-tertiary transition-colors"
                    onClick={() => send(`Explain job status: ${job.job_uuid ?? job.job_name ?? 'unknown'}`)}
                  >
                    <div className="text-xs font-medium text-text-primary truncate">{job.job_name ?? job.job_uuid ?? `Job ${i + 1}`}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                      <span className="text-xs text-yellow-500">{job.status}</span>
                      {job.engine && <span className="text-xs text-text-tertiary">· {job.engine}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Recent jobs */}
          {(ctx?.recent_jobs?.length ?? 0) > 0 && (
            <Card className="p-3">
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">🕐 Recent</div>
              <div className="space-y-0.5">
                {ctx!.recent_jobs.slice(0, 7).map((job, i) => {
                  const st = job.status?.toLowerCase()
                  const col = st === 'completed' ? 'text-green-500' : st === 'failed' ? 'text-red-500' : 'text-yellow-500'
                  return (
                    <button
                      key={i}
                      className="w-full flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-surface-secondary transition-colors"
                      onClick={() => send(`Tell me about this job: ${job.job_uuid ?? job.job_name}`)}
                    >
                      <span className={`text-xs ${col}`}>●</span>
                      <span className="text-xs text-text-primary truncate flex-1">{job.job_name ?? job.job_uuid ?? '—'}</span>
                      {job.binding_energy != null && (
                        <span className="text-xs font-mono text-blue-400 shrink-0">{job.binding_energy.toFixed(1)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>
          )}

          {/* AI tools */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              🛠️ Tools ({ctx?.tools_count ?? 0})
            </div>
            <div className="flex flex-wrap gap-1">
              {(ctx?.tools ?? []).map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-surface-secondary rounded text-xs text-text-secondary font-mono">{t}</span>
              ))}
              {!ctx?.tools?.length && <span className="text-xs text-text-tertiary">Loading...</span>}
            </div>
          </Card>

          {/* Worker status (Commander mode) */}
          {commanderMode && workers && (
            <Card className="p-3">
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">🤖 Workers</div>
              <div className="space-y-1">
                {Object.entries(workers).map(([name, w]) => (
                  <div key={name} className="flex items-center gap-1.5 py-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${w.available ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs text-text-primary truncate flex-1">{name.replace('_crew', '').replace('_', ' ')}</span>
                    <span className="text-xs text-text-tertiary">{w.load}/{w.max_concurrent}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick commands */}
          <Card className="p-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">⚡ Quick Commands</div>
            <div className="space-y-0.5">
              {QUICK_CMDS.map(cmd => (
                <button
                  key={cmd.label}
                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface-secondary transition-colors text-text-primary"
                  onClick={() => send(cmd.text)}
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── RIGHT: Commander Chat ── */}
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0" padding="none">

          {/* Chat header bar */}
          <div className="px-4 py-2.5 border-b border-border-light flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">Commander Chat</span>
              {activeJobs.length > 0 && (
                <Badge variant="warning">{activeJobs.length} running</Badge>
              )}
              {providerStatus?.available && (
                <Badge variant="success">{providerStatus.provider}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Provider toggle */}
              <div className="flex items-center bg-surface-secondary border border-border-light rounded-lg p-0.5 gap-0.5" title="Select AI provider">
                <button
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all focus:outline-none ${
                    selectedProvider === 'ollama'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-sm'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                  onClick={() => handleProviderSwitch('ollama')}
                  title="Use Ollama (local)"
                >
                  Ollama
                </button>
                <button
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all focus:outline-none ${
                    selectedProvider === 'paid'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-sm'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                  onClick={() => handleProviderSwitch('paid')}
                  title="Use paid model (DeepSeek, OpenAI, etc.)"
                >
                  Paid API
                </button>
              </div>
              <span className="text-xs text-text-tertiary font-mono">
                {convId.slice(0, 8)}…
              </span>
              <Button variant="outline" size="sm" onClick={newSession}>Clear</Button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2 shrink-0">
              <span>⚠️</span>
              <span className="flex-1">{error}</span>
              <button className="text-red-400 hover:text-red-600" onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6">
                <div className="text-5xl mb-3">🧬</div>
                <h2 className="text-lg font-bold text-text-primary mb-1">BioDockify AI Commander</h2>
                <p className="text-sm text-text-secondary mb-1 max-w-sm">
                  Central intelligence of BioDockify Studio v4.4.6
                </p>
                <p className="text-xs text-text-tertiary mb-6 max-w-xs">
                  Multi-agent orchestration system. I decompose tasks, dispatch specialized worker crews, and synthesize results.
                </p>
                <div className="grid grid-cols-3 gap-2 max-w-lg text-left w-full">
                  {[
                    { icon: '🔬', title: 'Docking + GNINA',    desc: 'Vina physics + CNN scoring consensus' },
                    { icon: '📈', title: 'QSAR Modeling',       desc: 'ML-based activity prediction' },
                    { icon: '💫', title: 'Molecular Dynamics',  desc: 'OpenMM NPT ensemble simulation' },
                    { icon: '🧲', title: 'Pharmacophore',       desc: 'Virtual screening & 3D matching' },
                    { icon: '📊', title: 'Analysis Engine',     desc: 'Interactions, ranking, ADMET' },
                    { icon: '🛡️', title: 'Sentinel Watchdog',   desc: 'Auto-retry & job escalation' },
                  ].map(f => (
                    <div key={f.title} className="bg-surface-secondary rounded-lg p-2.5">
                      <div className="font-semibold text-xs mb-0.5">{f.icon} {f.title}</div>
                      <p className="text-xs text-text-tertiary">{f.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-tertiary mt-4">
                  Use Quick Commands on the left or type a question below ↓
                </p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
                      : 'bg-surface-secondary text-text-primary'
                  }`}>
                    {msg.role === 'assistant' && msg.workersUsed && msg.workersUsed.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mb-2">
                        <span className="text-xs opacity-60">Workers:</span>
                        {msg.workersUsed.map(w => (
                          <Badge key={w} variant="info">{w.replace('_crew', '').replace('_', ' ')}</Badge>
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.tasks && msg.tasks.length > 0 && (
                      <div className="mb-2 space-y-1">
                        <span className="text-xs opacity-60">Tasks:</span>
                        {msg.tasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              t.status === 'completed' ? 'bg-green-500' :
                              t.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                              t.status === 'cancelled' ? 'bg-gray-500' : 'bg-red-500'
                            }`} />
                            <span className="opacity-70">{t.worker.replace('_crew', '').replace('_', ' ')}</span>
                            <span className="opacity-50">— {t.status}</span>
                            {(t.status === 'running' || t.status === 'pending') && (
                              <button
                                className="text-red-400 hover:text-red-300 text-xs ml-auto"
                                onClick={() => handleCancel(t.id)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mb-2">
                        <span className="text-xs opacity-60">Tools used:</span>
                        {msg.toolsUsed.map(tool => (
                          <Badge key={tool} variant="info">{tool}</Badge>
                        ))}
                      </div>
                    )}
                    <div
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: fmt(msg.content) }}
                    />
                    {msg.role === 'assistant' && msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border-light/30">
                        <span className="text-xs opacity-60">Recommendations:</span>
                        {msg.recommendations.map((r, i) => (
                          <p key={i} className="text-xs text-text-tertiary mt-0.5">• {r}</p>
                        ))}
                      </div>
                    )}
                    <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-text-tertiary'}`}>
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
                    <span className="text-xl">🧠</span>
                    <div className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span
                          key={d}
                          className="w-2 h-2 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">Commander is thinking…</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="p-3 border-t border-border-light shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={commanderMode ? "Command — docking, QSAR, MD, security scan, system health..." : "Chat with AI assistant..."}
                className="flex-1 px-4 py-2.5 bg-white border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              <Button
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-5"
                onClick={() => send()}
              >
                {loading ? '…' : 'Send'}
              </Button>
            </div>
            <p className="text-xs text-text-tertiary mt-1 text-center">
              {commanderMode ? 'Commander mode: tasks dispatched to specialized worker crews' : 'Chat mode: direct LLM conversation'} · Enter to send
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
