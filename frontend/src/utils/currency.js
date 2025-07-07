// Currency formatting utilities

export const formatCurrency = (amount, currency = 'KRW', language = 'ko') => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numericAmount)) {
    return '0'
  }

  if (currency === 'KRW') {
    if (language === 'ko') {
      return new Intl.NumberFormat('ko-KR').format(Math.round(numericAmount)) + '원'
    } else {
      return '₩' + new Intl.NumberFormat('en-US').format(Math.round(numericAmount))
    }
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numericAmount)
  }

  // Default formatting
  return new Intl.NumberFormat().format(numericAmount)
}

export const parseCurrency = (value) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    // Remove all non-numeric characters except decimal point
    const cleaned = value.replace(/[^\d.-]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  return 0
}

export const validateAmount = (amount) => {
  const parsed = parseCurrency(amount)
  return parsed > 0 && parsed <= 999999999 // Max 999 million
}

export const formatAmountInput = (value) => {
  // Format for input fields (remove currency symbols but keep numbers)
  const cleaned = value.replace(/[^\d.-]/g, '')
  const parsed = parseFloat(cleaned)
  
  if (isNaN(parsed)) {
    return ''
  }

  return parsed.toString()
}

export const calculatePercentage = (amount, total) => {
  if (total === 0) return 0
  return Math.round((amount / total) * 100 * 100) / 100 // Round to 2 decimal places
}

export const splitEqually = (total, participants) => {
  const participantCount = participants.length
  if (participantCount === 0) return []

  const baseAmount = Math.floor((total / participantCount) * 100) / 100 // Round down to cents
  const remainder = Math.round((total - (baseAmount * participantCount)) * 100) / 100

  const splits = participants.map((participant, index) => ({
    participantId: participant.id,
    participantName: participant.name,
    amount: index < remainder * 100 ? baseAmount + 0.01 : baseAmount
  }))

  return splits
}

export const validateSplitTotal = (splits, expectedTotal) => {
  const total = splits.reduce((sum, split) => sum + (split.amount || 0), 0)
  const difference = Math.abs(total - expectedTotal)
  
  return {
    isValid: difference < 0.01, // Allow 1 cent difference due to rounding
    total,
    difference,
    expectedTotal
  }
}

export const adjustSplitsToTotal = (splits, expectedTotal) => {
  const currentTotal = splits.reduce((sum, split) => sum + (split.amount || 0), 0)
  const difference = expectedTotal - currentTotal
  
  if (Math.abs(difference) < 0.01) {
    return splits // Already close enough
  }

  // Adjust the first split by the difference
  const adjustedSplits = [...splits]
  if (adjustedSplits.length > 0) {
    adjustedSplits[0] = {
      ...adjustedSplits[0],
      amount: (adjustedSplits[0].amount || 0) + difference
    }
  }

  return adjustedSplits
}

export const getCurrencySymbol = (currency) => {
  const symbols = {
    KRW: '₩',
    USD: '$',
    EUR: '€',
    JPY: '¥',
    GBP: '£',
  }
  
  return symbols[currency] || currency
}