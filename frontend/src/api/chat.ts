import { apiClient } from '@/lib/apiClient'
import type { ChatRequest, ChatResponse, ChatStatus } from '@/lib/types'

export async function sendChat(message: string): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>('/chat', { message } as ChatRequest)
  return data
}

export async function getChatStatus(): Promise<ChatStatus> {
  const { data } = await apiClient.get<ChatStatus>('/chat/status')
  return data
}
