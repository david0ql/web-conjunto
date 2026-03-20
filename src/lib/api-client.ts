import axios from 'axios'
import { API_URL } from '@/lib/constants'
import { getToken, setSession } from '@/lib/auth-store'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setSession(null)
    }

    return Promise.reject(error)
  },
)
