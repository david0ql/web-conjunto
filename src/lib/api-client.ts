import axios from 'axios'
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { API_URL } from '@/lib/constants'
import { getToken, setSession } from '@/lib/auth-store'
import { beginGlobalRequest, endGlobalRequest } from '@/lib/network-loading'

export type ApiRequestConfig = AxiosRequestConfig & {
  skipGlobalLoader?: boolean
}

type LoaderConfig = InternalAxiosRequestConfig & {
  _tracksLoader?: boolean
  _loaderRequestId?: number
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const trackedConfig = config as LoaderConfig
    const token = getToken()

    if (token) {
      trackedConfig.headers.Authorization = `Bearer ${token}`
    }

    if ((config as ApiRequestConfig).skipGlobalLoader === true) {
      trackedConfig._tracksLoader = false
      return trackedConfig
    }

    trackedConfig._tracksLoader = true
    trackedConfig._loaderRequestId = beginGlobalRequest()
    return trackedConfig
  },
  (error) => {
    const trackedConfig = (error?.config ?? null) as LoaderConfig | null
    if (trackedConfig?._tracksLoader) {
      endGlobalRequest(trackedConfig._loaderRequestId)
      trackedConfig._tracksLoader = false
    }
    return Promise.reject(error)
  },
)

apiClient.interceptors.response.use(
  (response) => {
    const trackedConfig = response.config as LoaderConfig
    if (trackedConfig._tracksLoader) {
      endGlobalRequest(trackedConfig._loaderRequestId)
      trackedConfig._tracksLoader = false
    }
    return response
  },
  (error) => {
    const trackedConfig = (error?.config ?? null) as LoaderConfig | null
    if (trackedConfig?._tracksLoader) {
      endGlobalRequest(trackedConfig._loaderRequestId)
      trackedConfig._tracksLoader = false
    }

    if (error.response?.status === 401) {
      setSession(null)
    }

    return Promise.reject(error)
  },
)
