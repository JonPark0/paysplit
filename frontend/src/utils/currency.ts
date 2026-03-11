type SupportedCurrency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'GBP'
type Language = 'ko' | 'en'
type AmountInput = number | string | null | undefined

interface SplitParticipant {
  id: string
  name: string
}

interface AmountSplit {
  participantId: string
  participantName: string
  amount: number
}

interface SplitValidationResult {
  isValid: boolean
  total: number
  difference: number
  expectedTotal: number
}

export const formatCurrency = (
  amount: AmountInput,
  currency: string = 'KRW',
  language: Language = 'ko'
): string => {
  const numericAmount = typeof amount === 'string' ? Number.parseFloat(amount) : Number(amount ?? 0)

  if (Number.isNaN(numericAmount)) {
    return '0'
  }

  if (currency === 'KRW') {
    if (language === 'ko') {
      return `${new Intl.NumberFormat('ko-KR').format(Math.round(numericAmount))}원`
    }

    return `₩${new Intl.NumberFormat('en-US').format(Math.round(numericAmount))}`
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numericAmount)
  }

  return new Intl.NumberFormat().format(numericAmount)
}

export const parseCurrency = (value: AmountInput): number => {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? 0 : value
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '')
    const parsed = Number.parseFloat(cleaned)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return 0
}

export const validateAmount = (amount: AmountInput): boolean => {
  const parsed = parseCurrency(amount)
  return parsed > 0 && parsed <= 999_999_999
}

export const formatAmountInput = (value: AmountInput): string => {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? '' : value.toString()
  }

  if (typeof value !== 'string') {
    return ''
  }

  const cleaned = value.replace(/[^\d.-]/g, '')
  const parsed = Number.parseFloat(cleaned)

  if (Number.isNaN(parsed)) {
    return ''
  }

  return parsed.toString()
}

export const calculatePercentage = (amount: number, total: number): number => {
  if (total === 0) {
    return 0
  }

  return Math.round((amount / total) * 10000) / 100
}

export const splitEqually = (total: number, participants: SplitParticipant[]): AmountSplit[] => {
  const participantCount = participants.length

  if (participantCount === 0) {
    return []
  }

  const baseAmount = Math.floor((total / participantCount) * 100) / 100
  const remainder = Math.round((total - (baseAmount * participantCount)) * 100) / 100

  return participants.map((participant, index) => ({
    participantId: participant.id,
    participantName: participant.name,
    amount: index < remainder * 100 ? baseAmount + 0.01 : baseAmount
  }))
}

export const validateSplitTotal = (splits: AmountSplit[], expectedTotal: number): SplitValidationResult => {
  const total = splits.reduce((sum, split) => sum + (split.amount || 0), 0)
  const difference = Math.abs(total - expectedTotal)

  return {
    isValid: difference < 0.01,
    total,
    difference,
    expectedTotal
  }
}

export const adjustSplitsToTotal = (splits: AmountSplit[], expectedTotal: number): AmountSplit[] => {
  const currentTotal = splits.reduce((sum, split) => sum + (split.amount || 0), 0)
  const difference = expectedTotal - currentTotal

  if (Math.abs(difference) < 0.01) {
    return splits
  }

  const adjustedSplits = [...splits]
  if (adjustedSplits.length > 0) {
    adjustedSplits[0] = {
      ...adjustedSplits[0],
      amount: (adjustedSplits[0].amount || 0) + difference
    }
  }

  return adjustedSplits
}

export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<SupportedCurrency, string> = {
    KRW: '₩',
    USD: '$',
    EUR: '€',
    JPY: '¥',
    GBP: '£'
  }

  return symbols[currency as SupportedCurrency] || currency
}
