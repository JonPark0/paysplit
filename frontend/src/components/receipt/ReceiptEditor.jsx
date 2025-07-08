import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Save, X, AlertCircle, User } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../common/Button'
import Input from '../common/Input'
import { receiptAPI } from '../../services/api'
import { formatCurrency, validateAmount } from '../../utils/currency'
import { validateReceiptItem } from '../../utils/validation'
import { useRoomStore } from '../../stores/roomStore'
import recaptchaService from '../../services/recaptcha'

const ReceiptEditor = ({ roomId, uploadData, onSuccess, onCancel }) => {
  const { t } = useTranslation()
  const { participants, currentParticipant } = useRoomStore()

  const [receiptData, setReceiptData] = useState({
    items: uploadData?.items || [{ name: '', price: 0, quantity: 1, category: 'other' }],
    total: uploadData?.total || 0,
    currency: 'KRW',
    payerId: currentParticipant?.id || null
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Calculate total from items
  const calculateTotal = (items) => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0
      const quantity = parseInt(item.quantity) || 1
      return sum + (price * quantity)
    }, 0)
  }

  // Update total when items change
  useEffect(() => {
    const newTotal = calculateTotal(receiptData.items)
    setReceiptData(prev => ({ ...prev, total: newTotal }))
  }, [receiptData.items])

  // Handle item change
  const handleItemChange = (index, field, value) => {
    const newItems = [...receiptData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    setReceiptData(prev => ({ ...prev, items: newItems }))
    
    // Clear errors for this item
    if (errors[`item_${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`item_${index}`]
        return newErrors
      })
    }
  }

  // Add new item
  const addItem = () => {
    setReceiptData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', price: 0, quantity: 1, category: 'other' }]
    }))
  }

  // Remove item
  const removeItem = (index) => {
    if (receiptData.items.length <= 1) {
      toast.error('최소 하나의 항목이 필요합니다')
      return
    }

    setReceiptData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))

    // Clear errors for removed item
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`item_${index}`]
      return newErrors
    })
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    // Validate items
    receiptData.items.forEach((item, index) => {
      const itemErrors = validateReceiptItem(item)
      if (itemErrors) {
        newErrors[`item_${index}`] = itemErrors
      }
    })

    // Validate total
    if (!validateAmount(receiptData.total)) {
      newErrors.total = t('validation.positiveNumber', { field: 'Total' })
    }

    // Validate payer selection
    if (!receiptData.payerId) {
      newErrors.payer = t('receipt.edit.payerRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('입력 내용을 확인해주세요')
      return
    }

    setLoading(true)
    try {
      // Get reCAPTCHA token
      const recaptchaToken = await recaptchaService.getReceiptUploadToken()
      
      const receiptData_to_save = {
        totalAmount: receiptData.total,
        currency: receiptData.currency,
        payerId: receiptData.payerId,
        recaptchaToken,
        items: receiptData.items.map(item => ({
          name: item.name.trim(),
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity) || 1,
          category: item.category || 'other'
        })),
        ...(uploadData?.file && {
          encryptedFilename: uploadData.file.encryptedFilename,
          originalFilename: uploadData.file.originalFilename
        })
      }

      const response = await receiptAPI.create(roomId, receiptData_to_save)
      
      toast.success('영수증이 저장되었습니다')
      
      if (onSuccess) {
        onSuccess(response.receipt)
      }
    } catch (error) {
      console.error('Failed to save receipt:', error)
      toast.error(error.message || '영수증 저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const totalDifference = receiptData.total - calculateTotal(receiptData.items)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">
          {t('receipt.edit.title')}
        </h2>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-neutral-900">
              항목 목록
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={addItem}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t('receipt.edit.addItem')}
            </Button>
          </div>

          {receiptData.items.map((item, index) => (
            <div
              key={index}
              className="bg-white border border-neutral-200 rounded-lg p-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Item Name */}
                <div className="sm:col-span-5">
                  <Input
                    label={index === 0 ? t('receipt.edit.itemName') : ''}
                    placeholder="항목명을 입력하세요"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    error={errors[`item_${index}`]?.name}
                    fullWidth
                  />
                </div>

                {/* Price */}
                <div className="sm:col-span-3">
                  <Input
                    label={index === 0 ? t('receipt.edit.itemPrice') : ''}
                    type="number"
                    min="0"
                    max="9999999"
                    step="1"
                    placeholder="0"
                    value={item.price}
                    onChange={(e) => {
                      const value = e.target.value
                      // Prevent negative values
                      if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
                        handleItemChange(index, 'price', value)
                      }
                    }}
                    error={errors[`item_${index}`]?.price}
                    className="tabular-nums"
                    fullWidth
                  />
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2">
                  <Input
                    label={index === 0 ? t('receipt.edit.quantity') : ''}
                    type="number"
                    min="1"
                    max="999"
                    step="1"
                    placeholder="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const value = e.target.value
                      // Prevent negative values and zero
                      if (value === '' || (!isNaN(value) && parseInt(value) >= 1)) {
                        handleItemChange(index, 'quantity', value)
                      }
                    }}
                    error={errors[`item_${index}`]?.quantity}
                    className="tabular-nums"
                    fullWidth
                  />
                </div>

                {/* Category */}
                <div className="sm:col-span-1">
                  <select
                    className="input w-full"
                    value={item.category}
                    onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                  >
                    <option value="food">음식</option>
                    <option value="drink">음료</option>
                    <option value="dessert">디저트</option>
                    <option value="service">서비스</option>
                    <option value="other">기타</option>
                  </select>
                </div>

                {/* Remove Button */}
                <div className="sm:col-span-1 flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={receiptData.items.length <= 1}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Item Subtotal */}
              <div className="mt-2 text-right text-sm text-neutral-600">
                소계: {formatCurrency((item.price || 0) * (item.quantity || 1), 'KRW')}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          {/* Payer Selection */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-neutral-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              {t('receipt.edit.selectPayer')}
            </h3>
            
            <div className="space-y-2">
              {participants.map((participant) => (
                <label
                  key={participant.id}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    receiptData.payerId === participant.id
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="payer"
                    value={participant.id}
                    checked={receiptData.payerId === participant.id}
                    onChange={(e) => setReceiptData(prev => ({ ...prev, payerId: e.target.value }))}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {participant.name}
                      {participant.isAdmin && (
                        <span className="ml-2 text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded">
                          {t('common.admin')}
                        </span>
                      )}
                    </div>
                    {participant.id === currentParticipant?.id && (
                      <div className="text-xs text-neutral-500">{t('common.me')}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
            
            {errors.payer && (
              <div className="mt-2 text-sm text-accent-600">
                {errors.payer}
              </div>
            )}
          </div>

          {/* Total Summary */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-neutral-900 mb-4">
              {t('receipt.edit.total')}
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">
                  {t('receipt.edit.calculated')}
                </span>
                <span className="font-medium">
                  {formatCurrency(calculateTotal(receiptData.items), 'KRW')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-600">총액</span>
                <span className="text-lg font-bold">
                  {formatCurrency(receiptData.total, 'KRW')}
                </span>
              </div>

              {Math.abs(totalDifference) > 0.01 && (
                <div className="flex justify-between items-center text-yellow-600">
                  <span className="text-sm">
                    {t('receipt.edit.difference')}
                  </span>
                  <span className="text-sm font-medium">
                    {totalDifference > 0 ? '+' : ''}
                    {formatCurrency(totalDifference, 'KRW')}
                  </span>
                </div>
              )}
            </div>

            {Math.abs(totalDifference) > 0.01 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">총액과 항목 합계가 다릅니다</p>
                    <p>항목 가격을 확인하거나 수수료/세금 등을 별도 항목으로 추가해주세요.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upload Info */}
          {uploadData?.file && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <h4 className="font-medium text-neutral-900 mb-2">업로드된 파일</h4>
              <p className="text-sm text-neutral-600 break-all">
                {uploadData.file.originalFilename}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {(uploadData.file.fileSize / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          {/* OCR Info */}
          {uploadData?.ocrResult && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <h4 className="font-medium text-neutral-900 mb-2">OCR 분석 결과</h4>
              <div className="text-sm space-y-1">
                <p className="text-neutral-600">
                  정확도: {uploadData.ocrResult.validation?.score || 0}%
                </p>
                <p className="text-neutral-600">
                  감지된 항목: {uploadData.ocrResult.items?.length || 0}개
                </p>
                {uploadData.ocrResult.validation?.issues?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-yellow-600 font-medium">검토 필요:</p>
                    {uploadData.ocrResult.validation.issues.map((issue, index) => (
                      <p key={index} className="text-xs text-yellow-600">• {issue}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSave}
              loading={loading}
              fullWidth
              size="lg"
              leftIcon={<Save className="w-4 h-4" />}
            >
              {t('receipt.edit.saveChanges')}
            </Button>
            
            <Button
              variant="outline"
              onClick={onCancel}
              fullWidth
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiptEditor