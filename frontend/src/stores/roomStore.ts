import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Participant, Receipt, Room, Settlement } from '../services/api'

interface Split {
  id: string
  participantId: string
  amount: number
  [key: string]: unknown
}

interface LoadingState {
  room: boolean
  receipts: boolean
  settlements: boolean
  upload: boolean
}

interface ErrorState {
  room: string | null
  receipts: string | null
  settlements: string | null
  upload: string | null
}

interface RoomStoreState {
  currentRoom: Room | null
  participants: Participant[]
  receipts: Receipt[]
  settlements: Settlement[]
  splits: Split[]

  currentParticipant: Participant | null
  sessionToken: string | null

  rooms: Room[]
  roomSessions: Record<string, string>
  roomParticipants: Record<string, Participant>
  lastAccessedRooms: string[]

  loading: LoadingState
  errors: ErrorState

  setCurrentRoom: (room: Room | null) => void
  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void

  addRoom: (room: Room, participant: Participant, sessionToken: string) => void
  switchToRoom: (roomId: string) => void
  removeRoom: (roomId: string) => void
  getRoomById: (roomId: string) => Room | undefined
  getRecentRooms: () => Room[]

  setCurrentParticipant: (participant: Participant | null) => void
  setSessionToken: (token: string | null) => void

  setReceipts: (receipts: Receipt[]) => void
  addReceipt: (receipt: Receipt) => void
  updateReceipt: (receiptId: string, updates: Partial<Receipt>) => void
  removeReceipt: (receiptId: string) => void

  setSettlements: (settlements: Settlement[]) => void
  addSettlement: (settlement: Settlement) => void
  updateSettlement: (settlementId: string, updates: Partial<Settlement>) => void
  removeSettlement: (settlementId: string) => void

  setSplits: (splits: Split[]) => void
  addSplit: (split: Split) => void
  updateSplit: (splitId: string, updates: Partial<Split>) => void
  removeSplit: (splitId: string) => void

  setLoading: (key: keyof LoadingState, value: boolean) => void
  setError: (key: keyof ErrorState, error: string | null) => void
  clearError: (key: keyof ErrorState) => void

  getRoomStats: () => {
    participantCount: number
    receiptCount: number
    totalAmount: number
    totalItems: number
    settlementCount: number
    completedSettlements: number
    settlementProgress: number
  }

  getParticipantBalance: (participantId: string) => {
    paid: number
    owed: number
    balance: number
  }

  clearCurrentRoomData: () => void
  clearRoomData: () => void
  leaveRoom: () => void
}

const defaultLoading: LoadingState = {
  room: false,
  receipts: false,
  settlements: false,
  upload: false
}

const defaultErrors: ErrorState = {
  room: null,
  receipts: null,
  settlements: null,
  upload: null
}

const useRoomStore = create<RoomStoreState>()(
  persist(
    (set, get) => ({
      currentRoom: null,
      participants: [],
      receipts: [],
      settlements: [],
      splits: [],

      currentParticipant: null,
      sessionToken: null,

      rooms: [],
      roomSessions: {},
      roomParticipants: {},
      lastAccessedRooms: [],

      loading: defaultLoading,
      errors: defaultErrors,

      setCurrentRoom: (room) => set({ currentRoom: room }),

      setParticipants: (participants) => set({ participants }),

      addParticipant: (participant) => set((state) => ({
        participants: [...state.participants, participant]
      })),

      addRoom: (room, participant, sessionToken) => set((state) => {
        const rooms = state.rooms.filter((r) => r.id !== room.id)
        const lastAccessed = state.lastAccessedRooms.filter((id) => id !== room.id)

        return {
          rooms: [room, ...rooms],
          roomSessions: { ...state.roomSessions, [room.id]: sessionToken },
          roomParticipants: { ...state.roomParticipants, [room.id]: participant },
          lastAccessedRooms: [room.id, ...lastAccessed].slice(0, 5)
        }
      }),

      switchToRoom: (roomId) => set((state) => {
        const room = state.rooms.find((r) => r.id === roomId)
        const participant = state.roomParticipants[roomId]
        const sessionToken = state.roomSessions[roomId]

        if (!room || !participant || !sessionToken) {
          return state
        }

        const lastAccessed = state.lastAccessedRooms.filter((id) => id !== roomId)

        return {
          currentRoom: room,
          currentParticipant: participant,
          sessionToken,
          lastAccessedRooms: [roomId, ...lastAccessed].slice(0, 5)
        }
      }),

      removeRoom: (roomId) => set((state) => {
        const rooms = state.rooms.filter((r) => r.id !== roomId)
        const roomSessions = { ...state.roomSessions }
        const roomParticipants = { ...state.roomParticipants }
        const lastAccessedRooms = state.lastAccessedRooms.filter((id) => id !== roomId)

        delete roomSessions[roomId]
        delete roomParticipants[roomId]

        return {
          rooms,
          roomSessions,
          roomParticipants,
          lastAccessedRooms
        }
      }),

      getRoomById: (roomId) => {
        const state = get()
        return state.rooms.find((r) => r.id === roomId)
      },

      getRecentRooms: () => {
        const state = get()
        return state.lastAccessedRooms
          .map((id) => state.rooms.find((r) => r.id === id))
          .filter((room): room is Room => Boolean(room))
          .slice(0, 5)
      },

      setCurrentParticipant: (participant) => set({ currentParticipant: participant }),

      setSessionToken: (token) => set({ sessionToken: token }),

      setReceipts: (receipts) => set({ receipts }),

      addReceipt: (receipt) => set((state) => ({
        receipts: [receipt, ...state.receipts]
      })),

      updateReceipt: (receiptId, updates) => set((state) => ({
        receipts: state.receipts.map((receipt) =>
          receipt.id === receiptId ? { ...receipt, ...updates } : receipt
        )
      })),

      removeReceipt: (receiptId) => set((state) => ({
        receipts: state.receipts.filter((receipt) => receipt.id !== receiptId)
      })),

      setSettlements: (settlements) => set({ settlements }),

      addSettlement: (settlement) => set((state) => ({
        settlements: [settlement, ...state.settlements]
      })),

      updateSettlement: (settlementId, updates) => set((state) => ({
        settlements: state.settlements.map((settlement) =>
          settlement.id === settlementId ? { ...settlement, ...updates } : settlement
        )
      })),

      removeSettlement: (settlementId) => set((state) => ({
        settlements: state.settlements.filter((settlement) => settlement.id !== settlementId)
      })),

      setSplits: (splits) => set({ splits }),

      addSplit: (split) => set((state) => ({
        splits: [...state.splits, split]
      })),

      updateSplit: (splitId, updates) => set((state) => ({
        splits: state.splits.map((split) =>
          split.id === splitId ? { ...split, ...updates } : split
        )
      })),

      removeSplit: (splitId) => set((state) => ({
        splits: state.splits.filter((split) => split.id !== splitId)
      })),

      setLoading: (key, value) => set((state) => ({
        loading: { ...state.loading, [key]: value }
      })),

      setError: (key, error) => set((state) => ({
        errors: { ...state.errors, [key]: error }
      })),

      clearError: (key) => set((state) => ({
        errors: { ...state.errors, [key]: null }
      })),

      getRoomStats: () => {
        const state = get()
        const totalAmount = state.receipts.reduce((sum, receipt) => sum + Number(receipt.totalAmount || 0), 0)
        const totalItems = state.receipts.reduce((sum, receipt) => sum + (receipt.items?.length || 0), 0)
        const completedSettlements = state.settlements.filter((s) => s.status === 'completed').length

        return {
          participantCount: state.participants.length,
          receiptCount: state.receipts.length,
          totalAmount,
          totalItems,
          settlementCount: state.settlements.length,
          completedSettlements,
          settlementProgress: state.settlements.length > 0
            ? (completedSettlements / state.settlements.length) * 100
            : 0
        }
      },

      getParticipantBalance: (participantId) => {
        const state = get()

        const paid = state.receipts
          .filter((receipt) => (receipt.payerId || receipt.uploaderId) === participantId)
          .reduce((sum, receipt) => sum + Number(receipt.totalAmount || 0), 0)

        const owed = state.splits
          .filter((split) => split.participantId === participantId)
          .reduce((sum, split) => sum + Number(split.amount || 0), 0)

        return {
          paid,
          owed,
          balance: paid - owed
        }
      },

      clearCurrentRoomData: () => set((state) => ({
        currentRoom: null,
        participants: [],
        receipts: [],
        settlements: [],
        splits: [],
        currentParticipant: null,
        sessionToken: null,
        loading: defaultLoading,
        errors: defaultErrors,
        rooms: state.rooms,
        roomSessions: state.roomSessions,
        roomParticipants: state.roomParticipants,
        lastAccessedRooms: state.lastAccessedRooms
      })),

      clearRoomData: () => set({
        currentRoom: null,
        participants: [],
        receipts: [],
        settlements: [],
        splits: [],
        currentParticipant: null,
        sessionToken: null,
        rooms: [],
        roomSessions: {},
        roomParticipants: {},
        lastAccessedRooms: [],
        loading: defaultLoading,
        errors: defaultErrors
      }),

      leaveRoom: () => {
        const { clearRoomData } = get()
        clearRoomData()
      }
    }),
    {
      name: 'paysplit-room',
      version: 2,
      partialize: (state) => ({
        currentRoom: state.currentRoom,
        currentParticipant: state.currentParticipant,
        sessionToken: state.sessionToken,
        rooms: state.rooms,
        roomSessions: state.roomSessions,
        roomParticipants: state.roomParticipants,
        lastAccessedRooms: state.lastAccessedRooms
      })
    }
  )
)

export { useRoomStore }
