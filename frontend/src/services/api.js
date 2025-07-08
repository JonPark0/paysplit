import axios from 'axios'
import { useRoomStore } from '../stores/roomStore'

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add session token
api.interceptors.request.use(
  (config) => {
    const { sessionToken } = useRoomStore.getState()
    
    if (sessionToken) {
      config.headers['X-Session-Token'] = sessionToken
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const { clearRoomData } = useRoomStore.getState()
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      clearRoomData()
      window.location.href = '/'
    }
    
    // Extract error message
    const message = error.response?.data?.error || error.message || 'An error occurred'
    
    return Promise.reject({
      ...error,
      message,
      status: error.response?.status,
    })
  }
)

// Room API
export const roomAPI = {
  // Create new room
  create: async (data) => {
    const response = await api.post('/rooms/create', data)
    return response.data
  },

  // Get room info (public, for join page)
  getRoomInfo: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}/info`)
    return response.data
  },

  // Join existing room
  join: async (data) => {
    const response = await api.post('/rooms/join', data)
    return response.data
  },

  // Get room details
  get: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}`)
    return response.data
  },

  // Update room status
  updateStatus: async (roomId, status) => {
    const response = await api.patch(`/rooms/${roomId}/status`, { status })
    return response.data
  },

  // Get room participants
  getParticipants: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}/participants`)
    return response.data
  },

  // Generate QR code
  getQRCode: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}/qr`)
    return response.data
  },

  // Get activity logs
  getActivities: async (roomId, limit = 50) => {
    const response = await api.get(`/rooms/${roomId}/activities`, {
      params: { limit }
    })
    return response.data
  },

  // Get receipts for room
  getReceipts: async (roomId) => {
    const response = await api.get(`/receipts/${roomId}`)
    return response.data
  },

  // Create split
  createSplit: async (roomId, data) => {
    const response = await api.post(`/settlements/${roomId}/splits`, data)
    return response.data
  },

  // Get settlements
  getSettlements: async (roomId) => {
    const response = await api.get(`/settlements/${roomId}`)
    return response.data
  },

  // Recalculate settlements
  recalculateSettlements: async (roomId) => {
    const response = await api.post(`/settlements/${roomId}/recalculate`)
    return response.data
  },

  // Mark settlement as paid
  markSettlementAsPaid: async (roomId, settlementId) => {
    const response = await api.patch(`/settlements/${roomId}/settlements/${settlementId}`, { status: 'completed' })
    return response.data
  },

  // Get activity logs
  getActivityLogs: async (roomId, limit = 50) => {
    const response = await api.get(`/rooms/${roomId}/activities`, {
      params: { limit }
    })
    return response.data
  },

  // Download archive
  downloadArchive: async (roomId, format = 'json') => {
    const response = await api.get(`/rooms/${roomId}/archive`, {
      params: { format }
    })
    return response.data
  },
}

// Receipt API
export const receiptAPI = {
  // Upload receipt file
  upload: async (roomId, file, onProgress) => {
    const formData = new FormData()
    formData.append('receipt', file)
    
    const response = await api.post(`/receipts/upload/${roomId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(progress)
        }
      },
    })
    return response.data
  },

  // Create receipt with items
  create: async (roomId, data) => {
    const response = await api.post(`/receipts/${roomId}`, data)
    return response.data
  },

  // Get receipts for room
  getAll: async (roomId) => {
    const response = await api.get(`/receipts/${roomId}`)
    return response.data
  },

  // Get specific receipt
  get: async (roomId, receiptId) => {
    const response = await api.get(`/receipts/${roomId}/${receiptId}`)
    return response.data
  },

  // Update receipt
  update: async (roomId, receiptId, data) => {
    const response = await api.put(`/receipts/${roomId}/${receiptId}`, data)
    return response.data
  },

  // Delete receipt
  delete: async (roomId, receiptId) => {
    const response = await api.delete(`/receipts/${roomId}/${receiptId}`)
    return response.data
  },

  // Get receipt image
  getImage: async (roomId, receiptId) => {
    const response = await api.get(`/receipts/${roomId}/${receiptId}/image`, {
      responseType: 'blob'
    })
    return response.data
  },

  // Get receipt thumbnail
  getThumbnail: async (roomId, receiptId, width = 300, height = 300) => {
    const response = await api.get(`/receipts/${roomId}/${receiptId}/thumbnail`, {
      params: { width, height },
      responseType: 'blob'
    })
    return response.data
  },

  // Get receipt splits
  getSplits: async (roomId, receiptId) => {
    const response = await api.get(`/receipts/${roomId}/${receiptId}/splits`)
    return response.data
  },
}

// Settlement API
export const settlementAPI = {
  // Create split
  createSplit: async (roomId, data) => {
    const response = await api.post(`/settlements/${roomId}/splits`, data)
    return response.data
  },

  // Create multiple splits
  createBulkSplits: async (roomId, splits) => {
    const response = await api.post(`/settlements/${roomId}/splits/bulk`, { splits })
    return response.data
  },

  // Update split
  updateSplit: async (roomId, splitId, amount) => {
    const response = await api.put(`/settlements/${roomId}/splits/${splitId}`, { amount })
    return response.data
  },

  // Delete split
  deleteSplit: async (roomId, splitId) => {
    const response = await api.delete(`/settlements/${roomId}/splits/${splitId}`)
    return response.data
  },

  // Get splits for item
  getItemSplits: async (roomId, itemId) => {
    const response = await api.get(`/settlements/${roomId}/items/${itemId}/splits`)
    return response.data
  },

  // Calculate optimal settlement
  calculate: async (roomId) => {
    const response = await api.get(`/settlements/${roomId}/calculate`)
    return response.data
  },

  // Create settlement transaction
  createSettlement: async (roomId, data) => {
    const response = await api.post(`/settlements/${roomId}/settlements`, data)
    return response.data
  },

  // Update settlement status
  updateSettlementStatus: async (roomId, settlementId, status) => {
    const response = await api.patch(`/settlements/${roomId}/settlements/${settlementId}`, { status })
    return response.data
  },

  // Get settlements for room
  getSettlements: async (roomId) => {
    const response = await api.get(`/settlements/${roomId}/settlements`)
    return response.data
  },

  // Delete settlement
  deleteSettlement: async (roomId, settlementId) => {
    const response = await api.delete(`/settlements/${roomId}/settlements/${settlementId}`)
    return response.data
  },

  // Clear all splits
  clearAllSplits: async (roomId) => {
    const response = await api.delete(`/settlements/${roomId}/splits`)
    return response.data
  },

  // Get participant balance
  getParticipantBalance: async (roomId, participantId) => {
    const response = await api.get(`/settlements/${roomId}/participants/${participantId}/balance`)
    return response.data
  },
}

// Archive API
export const archiveAPI = {
  // Get complete room data
  getComplete: async (roomId) => {
    const response = await api.get(`/archive/${roomId}/complete`)
    return response.data
  },

  // Get specific data types
  getReceipts: async (roomId) => {
    const response = await api.get(`/archive/${roomId}/receipts`)
    return response.data
  },

  getSettlements: async (roomId) => {
    const response = await api.get(`/archive/${roomId}/settlements`)
    return response.data
  },

  getParticipants: async (roomId) => {
    const response = await api.get(`/archive/${roomId}/participants`)
    return response.data
  },

  getActivities: async (roomId, limit = 100) => {
    const response = await api.get(`/archive/${roomId}/activities`, {
      params: { limit }
    })
    return response.data
  },

  // Get room statistics
  getStats: async (roomId) => {
    const response = await api.get(`/archive/${roomId}/stats`)
    return response.data
  },

  // Export data
  export: async (roomId, format) => {
    const response = await api.get(`/archive/${roomId}/export/${format}`, {
      responseType: format === 'json' ? 'json' : 'blob'
    })
    return response.data
  },
}

export default api