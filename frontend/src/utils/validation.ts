type ValidationError = string | null

interface ReceiptItemInput {
  name?: string
  price?: string | number
  quantity?: string | number
}

interface ReceiptItemErrors {
  name?: string
  price?: string
  quantity?: string
}

type RuleFunction = (value: unknown, fieldName?: string) => ValidationError

export const validateRequired = (value: unknown, fieldName: string): ValidationError => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`
  }

  return null
}

export const validateMinLength = (value: unknown, minLength: number, fieldName: string): ValidationError => {
  if (typeof value === 'string' && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`
  }

  return null
}

export const validateMaxLength = (value: unknown, maxLength: number, fieldName: string): ValidationError => {
  if (typeof value === 'string' && value.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`
  }

  return null
}

export const validateEmail = (email: string): ValidationError => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }

  return null
}

export const validateNumber = (value: unknown, fieldName: string): ValidationError => {
  const num = Number.parseFloat(String(value))
  if (Number.isNaN(num)) {
    return `${fieldName} must be a valid number`
  }

  return null
}

export const validatePositiveNumber = (value: unknown, fieldName: string): ValidationError => {
  const numberError = validateNumber(value, fieldName)
  if (numberError) {
    return numberError
  }

  const num = Number.parseFloat(String(value))
  if (num <= 0) {
    return `${fieldName} must be greater than 0`
  }

  return null
}

export const validateAmount = (value: unknown): ValidationError => {
  return validatePositiveNumber(value, 'Amount')
}

export const validateEntryCode = (code: string): ValidationError => {
  if (!code) {
    return 'Entry code is required'
  }

  if (!/^\d{6}$/.test(code)) {
    return 'Entry code must be 6 digits'
  }

  return null
}

export const validateRoomName = (name: string): ValidationError => {
  if (name && name.length > 100) {
    return 'Room name must not exceed 100 characters'
  }

  return null
}

export const validateParticipantName = (name: string): ValidationError => {
  const requiredError = validateRequired(name, 'Name')
  if (requiredError) {
    return requiredError
  }

  return validateMaxLength(name, 50, 'Name')
}

export const validatePassword = (password: string): ValidationError => {
  const requiredError = validateRequired(password, 'Password')
  if (requiredError) {
    return requiredError
  }

  const minLengthError = validateMinLength(password, 4, 'Password')
  if (minLengthError) {
    return minLengthError
  }

  return validateMaxLength(password, 100, 'Password')
}

export const validateReceiptItem = (item: ReceiptItemInput): ReceiptItemErrors | null => {
  const errors: ReceiptItemErrors = {}

  const nameError = validateRequired(item.name, 'Item name')
  if (nameError) {
    errors.name = nameError
  }

  const nameMaxError = validateMaxLength(item.name, 100, 'Item name')
  if (nameMaxError) {
    errors.name = nameMaxError
  }

  const priceError = validatePositiveNumber(item.price, 'Price')
  if (priceError) {
    errors.price = priceError
  }

  if (item.quantity !== undefined) {
    const quantityError = validatePositiveNumber(item.quantity, 'Quantity')
    if (quantityError) {
      errors.quantity = quantityError
    }

    const quantity = Number.parseInt(String(item.quantity), 10)
    if (!Number.isInteger(quantity) || quantity < 1) {
      errors.quantity = 'Quantity must be a positive integer'
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export const validateReceiptItems = (items: ReceiptItemInput[]): string | Array<{ index: number; errors: ReceiptItemErrors }> | null => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'At least one item is required'
  }

  const errors: Array<{ index: number; errors: ReceiptItemErrors }> = []

  for (let i = 0; i < items.length; i += 1) {
    const itemErrors = validateReceiptItem(items[i])
    if (itemErrors) {
      errors.push({ index: i, errors: itemErrors })
    }
  }

  return errors.length > 0 ? errors : null
}

export const validateFileSize = (file: File, maxSizeInMB = 10): ValidationError => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  if (file.size > maxSizeInBytes) {
    return `File size must be less than ${maxSizeInMB}MB`
  }

  return null
}

export const validateFileType = (
  file: File,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
): ValidationError => {
  if (!allowedTypes.includes(file.type)) {
    const allowedExtensions = allowedTypes.map((type) => type.split('/')[1]).join(', ')
    return `File type not supported. Allowed types: ${allowedExtensions}`
  }

  return null
}

export const validateFile = (file: File | null | undefined): ValidationError => {
  if (!file) {
    return 'File is required'
  }

  const sizeError = validateFileSize(file)
  if (sizeError) {
    return sizeError
  }

  return validateFileType(file)
}

export const createValidator = <T extends Record<string, unknown>>(rules: Record<keyof T, RuleFunction[]>) => {
  return (values: T): Record<string, string> | null => {
    const errors: Record<string, string> = {}

    for (const [field, fieldRules] of Object.entries(rules) as Array<[keyof T, RuleFunction[]]>) {
      const value = values[field]

      for (const rule of fieldRules) {
        const error = rule(value, String(field))
        if (error) {
          errors[String(field)] = error
          break
        }
      }
    }

    return Object.keys(errors).length > 0 ? errors : null
  }
}

export const roomCreationRules = {
  adminName: [
    (value: unknown) => validateRequired(value, 'Admin name'),
    (value: unknown) => validateMaxLength(value, 50, 'Admin name')
  ],
  password: [
    (value: unknown) => validatePassword(String(value ?? ''))
  ],
  name: [
    (value: unknown) => validateRoomName(String(value ?? ''))
  ]
}

export const roomJoinRules = {
  entryCode: [
    (value: unknown) => validateEntryCode(String(value ?? ''))
  ],
  participantName: [
    (value: unknown) => validateParticipantName(String(value ?? ''))
  ],
  password: [
    (value: unknown) => validatePassword(String(value ?? ''))
  ]
}
