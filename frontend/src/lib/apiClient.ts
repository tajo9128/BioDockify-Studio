import axios from 'axios'

const API_BASE = ''

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('API Error:', error?.response?.data || error.message)
    }
    return Promise.reject(error)
  }
)
