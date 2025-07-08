import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useRoomStore = create(
  persist(
    (set, get) => ({
      // Current room data
      currentRoom: null,
      participants: [],
      receipts: [],
      settlements: [],
      splits: [],

      // User session
      currentParticipant: null,
      sessionToken: null,

      // Loading states
      loading: {
        room: false,
        receipts: false,
        settlements: false,
        upload: false,
      },

      // Error states
      errors: {
        room: null,
        receipts: null,
        settlements: null,
        upload: null,
      },

      // Room actions
      setCurrentRoom: (room) => set({ currentRoom: room }),
      
      setParticipants: (participants) => set({ participants }),
      
      addParticipant: (participant) => set((state) => ({
        participants: [...state.participants, participant]
      })),

      // Participant session
      setCurrentParticipant: (participant) => set({ currentParticipant: participant }),
      
      setSessionToken: (token) => set({ sessionToken: token }),

      // Receipts management
      setReceipts: (receipts) => set({ receipts }),
      
      addReceipt: (receipt) => set((state) => ({
        receipts: [receipt, ...state.receipts]
      })),
      
      updateReceipt: (receiptId, updates) => set((state) => ({
        receipts: state.receipts.map(receipt =>
          receipt.id === receiptId ? { ...receipt, ...updates } : receipt
        )
      })),
      
      removeReceipt: (receiptId) => set((state) => ({
        receipts: state.receipts.filter(receipt => receipt.id !== receiptId)
      })),

      // Settlements management
      setSettlements: (settlements) => set({ settlements }),
      
      addSettlement: (settlement) => set((state) => ({
        settlements: [settlement, ...state.settlements]
      })),
      
      updateSettlement: (settlementId, updates) => set((state) => ({
        settlements: state.settlements.map(settlement =>
          settlement.id === settlementId ? { ...settlement, ...updates } : settlement
        )
      })),
      
      removeSettlement: (settlementId) => set((state) => ({
        settlements: state.settlements.filter(settlement => settlement.id !== settlementId)
      })),

      // Splits management
      setSplits: (splits) => set({ splits }),
      
      addSplit: (split) => set((state) => ({
        splits: [...state.splits, split]
      })),
      
      updateSplit: (splitId, updates) => set((state) => ({
        splits: state.splits.map(split =>
          split.id === splitId ? { ...split, ...updates } : split
        )
      })),
      
      removeSplit: (splitId) => set((state) => ({
        splits: state.splits.filter(split => split.id !== splitId)
      })),

      // Loading states
      setLoading: (key, value) => set((state) => ({
        loading: { ...state.loading, [key]: value }
      })),

      // Error states
      setError: (key, error) => set((state) => ({
        errors: { ...state.errors, [key]: error }
      })),

      clearError: (key) => set((state) => ({
        errors: { ...state.errors, [key]: null }
      })),

      // Room statistics
      getRoomStats: () => {
        const state = get()
        const totalAmount = state.receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0)
        const totalItems = state.receipts.reduce((sum, receipt) => sum + receipt.items.length, 0)
        const completedSettlements = state.settlements.filter(s => s.status === 'completed').length
        
        return {
          participantCount: state.participants.length,
          receiptCount: state.receipts.length,
          totalAmount,
          totalItems,
          settlementCount: state.settlements.length,
          completedSettlements,
          settlementProgress: state.settlements.length > 0 ? 
            (completedSettlements / state.settlements.length) * 100 : 0
        }
      },

      // Participant balance calculation
      getParticipantBalance: (participantId) => {
        const state = get()
        
        // Calculate paid amount (receipts paid by participant)
        const paid = state.receipts
          .filter(receipt => (receipt.payerId || receipt.uploaderId) === participantId)
          .reduce((sum, receipt) => sum + receipt.totalAmount, 0)

        // Calculate owed amount (splits assigned to participant)
        const owed = state.splits
          .filter(split => split.participantId === participantId)
          .reduce((sum, split) => sum + split.amount, 0)

        return {
          paid,
          owed,
          balance: paid - owed // positive = receives money, negative = owes money
        }
      },

      // Clear all room data
      clearRoomData: () => set({
        currentRoom: null,
        participants: [],
        receipts: [],
        settlements: [],
        splits: [],
        currentParticipant: null,
        sessionToken: null,
        loading: {
          room: false,
          receipts: false,
          settlements: false,
          upload: false,
        },
        errors: {
          room: null,
          receipts: null,
          settlements: null,
          upload: null,
        },
      }),

      // Leave room
      leaveRoom: () => {
        const { clearRoomData } = get()
        clearRoomData()
      },
    }),
    {
      name: 'paysplit-room',
      version: 1,
      partialize: (state) => ({
        // Only persist essential data
        currentRoom: state.currentRoom,
        currentParticipant: state.currentParticipant,
        sessionToken: state.sessionToken,
      }),
    }
  )
)

export { useRoomStore }