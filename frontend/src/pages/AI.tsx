import { useState, useEffect } from 'react'

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface Provider {
  id: string;
  name: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('openai')
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetch('/api/ai/providers')
      .then(res => res.json())
      .then(data => setProviders(data.providers || []))
      .catch(console.error)
  }, [])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages([...messages, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          provider: selectedProvider
        })
      })

      const data = await response.json()
      const aiMessage: Message = { role: 'ai', content: data.response }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Failed to get AI response:', error)
    }

    setIsLoading(false)
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">BioDockify AI</h2>
        <p className="text-sm text-gray-500">Ask questions about molecular docking, simulations, and more</p>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="font-semibold">Chat</h3>
          <select
            value={selectedProvider}
            onChange={e => setSelectedProvider(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
          >
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center mt-8">
                Ask me anything about molecular docking, MD simulations, or drug discovery!
              </p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <strong>{msg.role === 'user' ? 'You' : 'BioDockify AI'}:</strong> {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2 text-gray-500">
                  <em>Thinking...</em>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 p-4 border-t border-gray-200">
            <input
              type="text"
              placeholder="Ask BioDockify AI..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSend} disabled={isLoading}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
