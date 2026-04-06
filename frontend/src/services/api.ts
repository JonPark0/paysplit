import axios, { AxiosHeaders, type AxiosError, type AxiosRequestConfig } from 'axios'
import { useRoomStore } from '../stores/roomStore'

type ApiError = AxiosError & {
  status?: number
  message: string
}

type RoomStatus = 'active' | 'settling' | 'completed'
type SettlementStatus = 'pending' | 'completed'

export interface Room {
  id: string
  name?: string
  entryCode?: string
  language?: string
  adminName?: string
  hasPassword?: boolean
  settlementStatus?: RoomStatus
  [key: string]: unknown
}

export interface Participant {
  id: string
  name: string
  isAdmin: boolean
  joinedAt?: string
  [key: string]: unknown
}

export interface ReceiptItem {
  id?: string
  name: string
  price: number
  quantity: number
  category?: string
  [key: string]: unknown
}

export interface Receipt {
  id: string
  roomId?: string
  uploaderId?: string
  uploaderName?: string
  payerId?: string
  payerName?: string
  totalAmount: number
  currency?: string
  items: ReceiptItem[]
  originalFilename?: string
  encryptedFilename?: string
  createdAt?: string
  [key: string]: unknown
}

export interface Settlement {
  id: string
  fromParticipantId?: string
  toParticipantId?: string
  amount: number
  status: SettlementStatus
  [key: string]: unknown
}

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const { sessionToken } = useRoomStore.getState()

    if (sessionToken) {
      const headers = AxiosHeaders.from(config.headers)
      headers.set('X-Session-Token', sessionToken)
      config.headers = headers
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    const { clearRoomData } = useRoomStore.getState()

    if (error.response?.status === 401) {
      clearRoomData()
      window.location.href = '/'
    }

    const message = error.response?.data?.error || error.message || 'An error occurred'

    return Promise.reject({
      ...error,
      message,
      status: error.response?.status
    } as ApiError)
  }
)

const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await api.request<T>(config)
  return response.data
}

export const roomAPI = {
  create: (data: Record<string, unknown>) => request<{ room: Room; participant: Participant; sessionToken: string }>({
    method: 'POST',
    url: '/rooms/create',
    data
  }),

  getRoomInfo: (roomId: string) => request<{ room: Room }>({
    method: 'GET',
    url: `/rooms/${roomId}/info`
  }),

  join: (data: Record<string, unknown>) => request<{ room: Room; participant: Participant; sessionToken: string }>({
    method: 'POST',
    url: '/rooms/join',
    data
  }),

  get: (roomId: string) => request<{ room: Room; participants: Participant[]; stats: Record<string, unknown> }>({
    method: 'GET',
    url: `/rooms/${roomId}`
  }),

  updateStatus: (roomId: string, status: RoomStatus) => request<{ status: RoomStatus }>({
    method: 'PATCH',
    url: `/rooms/${roomId}/status`,
    data: { status }
  }),

  getParticipants: (roomId: string) => request<{ participants: Participant[] }>({
    method: 'GET',
    url: `/rooms/${roomId}/participants`
  }),

  getQRCode: (roomId: string) => request<{ qrCode: string; url: string; entryCode: string }>({
    method: 'GET',
    url: `/rooms/${roomId}/qr`
  }),

  getActivities: (roomId: string, limit = 50) => request<{ logs: Record<string, unknown>[] }>({
    method: 'GET',
    url: `/rooms/${roomId}/activities`,
    params: { limit }
  }),

  getReceipts: (roomId: string) => request<{ receipts: Receipt[] }>({
    method: 'GET',
    url: `/receipts/${roomId}`
  }),

  createSplit: (roomId: string, data: Record<string, unknown>) => request<Record<string, unknown>>({
    method: 'POST',
    url: `/settlements/${roomId}/splits`,
    data
  }),

  getSettlements: (roomId: string) => request<{
    settlements: Settlement[]
    balances?: Array<Record<string, unknown>>
    transactions?: Array<Record<string, unknown>>
    totalReceiptAmount?: number
  }>({
    method: 'GET',
    url: `/settlements/${roomId}`
  }),

  recalculateSettlements: (roomId: string) => request<Record<string, unknown>>({
    method: 'POST',
    url: `/settlements/${roomId}/recalculate`
  }),

  markSettlementAsPaid: (roomId: string, settlementId: string) => request<Record<string, unknown>>({
    method: 'PATCH',
    url: `/settlements/${roomId}/settlements/${settlementId}`,
    data: { status: 'completed' }
  }),

  getActivityLogs: (roomId: string, limit = 50) => request<{ logs: Record<string, unknown>[] }>({
    method: 'GET',
    url: `/rooms/${roomId}/activities`,
    params: { limit }
  }),

  downloadArchive: (roomId: string, format = 'json') => request<Record<string, unknown>>({
    method: 'GET',
    url: `/rooms/${roomId}/archive`,
    params: { format }
  }),

  leaveRoom: (roomId: string) => request<{ success: boolean; message: string }>({
    method: 'POST',
    url: `/rooms/${roomId}/leave`
  })
}

export const receiptAPI = {
  upload: async (roomId: string, file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData()
    formData.append('receipt', file)

    return request<{ message: string; file: Record<string, unknown> }>({
      method: 'POST',
      url: `/receipts/upload/${roomId}`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    })
  },

  create: (roomId: string, data: Record<string, unknown>) => request<{ receipt: Receipt }>({
    method: 'POST',
    url: `/receipts/${roomId}`,
    data
  }),

  getAll: (roomId: string) => request<{ receipts: Receipt[] }>({
    method: 'GET',
    url: `/receipts/${roomId}`
  }),

  get: (roomId: string, receiptId: string) => request<{ receipt: Receipt }>({
    method: 'GET',
    url: `/receipts/${roomId}/${receiptId}`
  }),

  update: (roomId: string, receiptId: string, data: Record<string, unknown>) => request<Record<string, unknown>>({
    method: 'PUT',
    url: `/receipts/${roomId}/${receiptId}`,
    data
  }),

  delete: (roomId: string, receiptId: string) => request<{ message: string }>({
    method: 'DELETE',
    url: `/receipts/${roomId}/${receiptId}`
  }),

  getImage: (roomId: string, receiptId: string) => request<Blob>({
    method: 'GET',
    url: `/receipts/${roomId}/${receiptId}/image`,
    responseType: 'blob'
  }),

  getThumbnail: (roomId: string, receiptId: string, width = 300, height = 300) => request<Blob>({
    method: 'GET',
    url: `/receipts/${roomId}/${receiptId}/thumbnail`,
    params: { width, height },
    responseType: 'blob'
  }),

  getSplits: (roomId: string, receiptId: string) => request<{ splits: Record<string, unknown>[] }>({
    method: 'GET',
    url: `/receipts/${roomId}/${receiptId}/splits`
  })
}

export const settlementAPI = {
  createSplit: (roomId: string, data: Record<string, unknown>) => request<Record<string, unknown>>({
    method: 'POST',
    url: `/settlements/${roomId}/splits`,
    data
  }),

  createBulkSplits: (roomId: string, splits: Array<Record<string, unknown>>) => request<Record<string, unknown>>({
    method: 'POST',
    url: `/settlements/${roomId}/splits/bulk`,
    data: { splits }
  }),

  updateSplit: (roomId: string, splitId: string, amount: number) => request<Record<string, unknown>>({
    method: 'PUT',
    url: `/settlements/${roomId}/splits/${splitId}`,
    data: { amount }
  }),

  deleteSplit: (roomId: string, splitId: string) => request<Record<string, unknown>>({
    method: 'DELETE',
    url: `/settlements/${roomId}/splits/${splitId}`
  }),

  getItemSplits: (roomId: string, itemId: string) => request<Record<string, unknown>>({
    method: 'GET',
    url: `/settlements/${roomId}/items/${itemId}/splits`
  }),

  calculate: (roomId: string) => request<Record<string, unknown>>({
    method: 'GET',
    url: `/settlements/${roomId}/calculate`
  }),

  createSettlement: (roomId: string, data: Record<string, unknown>) => request<Record<string, unknown>>({
    method: 'POST',
    url: `/settlements/${roomId}/settlements`,
    data
  }),

  updateSettlementStatus: (roomId: string, settlementId: string, status: SettlementStatus) => request<Record<string, unknown>>({
    method: 'PATCH',
    url: `/settlements/${roomId}/settlements/${settlementId}`,
    data: { status }
  }),

  getSettlements: (roomId: string) => request<{ settlements: Settlement[] }>({
    method: 'GET',
    url: `/settlements/${roomId}/settlements`
  }),

  deleteSettlement: (roomId: string, settlementId: string) => request<Record<string, unknown>>({
    method: 'DELETE',
    url: `/settlements/${roomId}/settlements/${settlementId}`
  }),

  clearAllSplits: (roomId: string) => request<Record<string, unknown>>({
    method: 'DELETE',
    url: `/settlements/${roomId}/splits`
  }),

  getParticipantBalance: (roomId: string, participantId: string) => request<Record<string, unknown>>({
    method: 'GET',
    url: `/settlements/${roomId}/participants/${participantId}/balance`
  })
}

export const archiveAPI = {
  getComplete: (roomId: string) => request<Record<string, unknown>>({
    method: 'GET',
    url: `/archive/${roomId}/complete`
  }),

  getReceipts: (roomId: string) => request<Record<string, unknown>>({
    method: 'GET',
    url: `/archive/${roomId}/receipts`
  }),

  getSettlements: (roomId: string) => request<Record<string, unknown>>({
    method: 'GET',
    url: `/archive/${roomId}/settlements`
  }),

  getParticipants: (roomId: string) => request<Record<string, unknown>>({
    method: 'GET',
    url: `/archive/${roomId}/participants`
  }),

  getActivities: (roomId: string, limit = 100) => request<Record<string, unknown>>({
    method: 'GET',
    url: `/archive/${roomId}/activities`,
    params: { limit }
  }),

  getStats: (roomId: string) => request<Record<string, unknown>>({
    method: 'GET',
    url: `/archive/${roomId}/stats`
  }),

  export: (roomId: string, format: 'json' | 'csv') => request<Blob | Record<string, unknown>>({
    method: 'GET',
    url: `/archive/${roomId}/export/${format}`,
    responseType: format === 'json' ? 'json' : 'blob'
  })
}

export default api
