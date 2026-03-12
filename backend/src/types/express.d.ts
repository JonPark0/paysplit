declare global {
  namespace Express {
    interface Request {
      participant?: {
        id: string
        roomId: string
        name: string
        isAdmin: boolean
      }
      session?: {
        id: string
        roomId: string
        participantId: string
        participantName: string
        isAdmin: boolean
        expiresAt: string
      }
      room?: {
        settlementStatus?: string
      }
    }
  }
}

export {}
