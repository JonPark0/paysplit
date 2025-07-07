// Validation utilities

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`
  }
  return null
}

export const validateMinLength = (value, minLength, fieldName) => {
  if (typeof value === 'string' && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`
  }
  return null
}

export const validateMaxLength = (value, maxLength, fieldName) => {
  if (typeof value === 'string' && value.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`
  }
  return null
}

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }
  return null
}

export const validateNumber = (value, fieldName) => {
  const num = parseFloat(value)
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`
  }
  return null
}

export const validatePositiveNumber = (value, fieldName) => {
  const numberError = validateNumber(value, fieldName)
  if (numberError) return numberError
  
  const num = parseFloat(value)
  if (num <= 0) {
    return `${fieldName} must be greater than 0`
  }
  return null
}

export const validateAmount = (value) => {
  return validatePositiveNumber(value, 'Amount')
}

export const validateEntryCode = (code) => {
  if (!code) {
    return 'Entry code is required'
  }
  
  if (!/^\d{6}$/.test(code)) {
    return 'Entry code must be 6 digits'
  }
  
  return null
}

export const validateRoomName = (name) => {
  if (name && name.length > 100) {
    return 'Room name must not exceed 100 characters'
  }
  return null
}

export const validateParticipantName = (name) => {
  const requiredError = validateRequired(name, 'Name')
  if (requiredError) return requiredError
  
  const lengthError = validateMaxLength(name, 50, 'Name')
  if (lengthError) return lengthError
  
  return null
}

export const validatePassword = (password) => {
  const requiredError = validateRequired(password, 'Password')
  if (requiredError) return requiredError
  
  const minLengthError = validateMinLength(password, 4, 'Password')
  if (minLengthError) return minLengthError
  
  const maxLengthError = validateMaxLength(password, 100, 'Password')
  if (maxLengthError) return maxLengthError
  
  return null
}

export const validateReceiptItem = (item) => {
  const errors = {}
  
  const nameError = validateRequired(item.name, 'Item name')
  if (nameError) errors.name = nameError
  
  const nameMaxError = validateMaxLength(item.name, 100, 'Item name')
  if (nameMaxError) errors.name = nameMaxError
  
  const priceError = validatePositiveNumber(item.price, 'Price')
  if (priceError) errors.price = priceError
  
  if (item.quantity !== undefined) {
    const quantityError = validatePositiveNumber(item.quantity, 'Quantity')
    if (quantityError) errors.quantity = quantityError
    
    const quantity = parseInt(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      errors.quantity = 'Quantity must be a positive integer'
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null
}

export const validateReceiptItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'At least one item is required'
  }
  
  const errors = []
  
  for (let i = 0; i < items.length; i++) {
    const itemErrors = validateReceiptItem(items[i])
    if (itemErrors) {
      errors.push({ index: i, errors: itemErrors })
    }
  }
  
  return errors.length > 0 ? errors : null
}

export const validateFileSize = (file, maxSizeInMB = 10) => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  
  if (file.size > maxSizeInBytes) {
    return `File size must be less than ${maxSizeInMB}MB`
  }
  
  return null
}

export const validateFileType = (file, allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) => {
  if (!allowedTypes.includes(file.type)) {
    const allowedExtensions = allowedTypes
      .map(type => type.split('/')[1])
      .join(', ')
    
    return `File type not supported. Allowed types: ${allowedExtensions}`
  }
  
  return null
}

export const validateFile = (file) => {
  if (!file) {
    return 'File is required'
  }
  
  const sizeError = validateFileSize(file)
  if (sizeError) return sizeError
  
  const typeError = validateFileType(file)
  if (typeError) return typeError
  
  return null
}

// Form validation helper
export const createValidator = (rules) => {
  return (values) => {
    const errors = {}
    
    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = values[field]
      
      for (const rule of fieldRules) {
        const error = rule(value, field)
        if (error) {
          errors[field] = error
          break // Stop at first error for this field
        }
      }
    }
    
    return Object.keys(errors).length > 0 ? errors : null
  }
}

// Common validation rule sets
export const roomCreationRules = {
  adminName: [
    (value) => validateRequired(value, 'Admin name'),
    (value) => validateMaxLength(value, 50, 'Admin name')
  ],
  password: [
    (value) => validatePassword(value)
  ],
  name: [
    (value) => validateRoomName(value)
  ]
}

export const roomJoinRules = {
  entryCode: [
    (value) => validateEntryCode(value)
  ],
  participantName: [
    (value) => validateParticipantName(value)
  ],
  password: [
    (value) => validatePassword(value)
  ]
}