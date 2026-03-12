import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, Calculator, DollarSign, Save, X, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../common/Button'
import Input from '../common/Input'
import { roomAPI } from '../../services/api'
import { formatCurrency } from '../../utils/currency'

const Split = ({ roomId, receipt, participants, onSuccess, onCancel }) => {
  const { t } = useTranslation()

  type ParticipantSplitItem = {
    id: string
    quantity: number
    amount: number
  }

  type ParticipantSplit = {
    amount: number
    items: ParticipantSplitItem[]
  }

  const [splitType, setSplitType] = useState('equal') // 'equal', 'custom', 'manual'
  const [splitData, setSplitData] = useState<Record<string, ParticipantSplit>>({})
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize split data based on split type
  useEffect(() => {
    if (splitType === 'equal') {
      initializeEqualSplit()
    } else if (splitType === 'custom') {
      initializeCustomSplit()
    } else if (splitType === 'manual') {
      initializeManualSplit()
    }
  }, [splitType, participants, receipt])

  const initializeEqualSplit = () => {
    const perPersonAmount = receipt.totalAmount / participants.length
    const splits = participants.reduce((acc, participant) => {
      acc[participant.id] = {
        amount: perPersonAmount,
        items: receipt.items.map(item => ({
          id: item.id,
          quantity: item.quantity / participants.length,
          amount: (item.price * item.quantity) / participants.length
        }))
      }
      return acc
    }, {})
    setSplitData(splits)
  }

  const initializeCustomSplit = () => {
    const splits = participants.reduce((acc, participant) => {
      acc[participant.id] = {
        amount: 0,
        items: receipt.items.map(item => ({
          id: item.id,
          quantity: 0,
          amount: 0
        }))
      }
      return acc
    }, {})
    setSplitData(splits)
  }

  const initializeManualSplit = () => {
    const splits = participants.reduce((acc, participant) => {
      acc[participant.id] = {
        amount: 0,
        items: []
      }
      return acc
    }, {})
    setSplitData(splits)
  }

  // Handle item quantity change for custom split
  const handleItemQuantityChange = (participantId, itemId, quantity) => {
    const item = receipt.items.find(i => i.id === itemId)
    if (!item) return

    const newQuantity = Math.max(0, Math.min(quantity, item.quantity))
    const amount = (item.price * newQuantity)

    setSplitData(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        items: prev[participantId].items.map(i =>
          i.id === itemId
            ? { ...i, quantity: newQuantity, amount }
            : i
        )
      }
    }))

    // Clear errors
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`${participantId}_${itemId}`]
      return newErrors
    })
  }

  // Handle manual amount change
  const handleManualAmountChange = (participantId, amount) => {
    setSplitData(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        amount: Math.max(0, amount)
      }
    }))

    // Clear errors
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[participantId]
      return newErrors
    })
  }

  // Calculate totals
  const calculateParticipantTotal = (participantId) => {
    const participant = splitData[participantId]
    if (!participant) return 0

    if (splitType === 'manual') {
      return participant.amount
    }

    return participant.items.reduce((sum, item) => sum + item.amount, 0)
  }

  const calculateGrandTotal = () => {
    return participants.reduce((sum, participant) => 
      sum + calculateParticipantTotal(participant.id), 0
    )
  }

  const getRemainingQuantity = (itemId) => {
    const totalAssigned = participants.reduce((sum, participant) => {
      const participantItem = splitData[participant.id]?.items.find(i => i.id === itemId)
      return sum + (participantItem?.quantity || 0)
    }, 0)

    const originalItem = receipt.items.find(i => i.id === itemId)
    return originalItem ? originalItem.quantity - totalAssigned : 0
  }

  // Validate split
  const validateSplit = () => {
    const newErrors: Record<string, string> = {}
    const grandTotal = calculateGrandTotal()
    const tolerance = 0.01

    // Check if total matches receipt total
    if (Math.abs(grandTotal - receipt.totalAmount) > tolerance) {
      newErrors.total = t('splitPage.totalMismatch', { diff: formatCurrency(grandTotal - receipt.totalAmount, 'KRW') })
    }

    // For custom split, check item quantities
    if (splitType === 'custom') {
      receipt.items.forEach(item => {
        const remaining = getRemainingQuantity(item.id)
        if (remaining < 0) {
          newErrors[`item_${item.id}`] = t('splitPage.itemQuantityExceeded', { name: item.name })
        }
      })
    }

    // Check if all participants have valid amounts
    participants.forEach(participant => {
      const amount = calculateParticipantTotal(participant.id)
      if (amount <= 0) {
        newErrors[participant.id] = t('splitPage.zeroAmount', { name: participant.name })
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save split
  const handleSave = async () => {
    if (!validateSplit()) {
      toast.error(t('splitPage.checkSplit'))
      return
    }

    setLoading(true)
    try {
      // Transform participant-level splits into item-level splits expected by backend
      const itemLevelSplits = []
      
      participants.forEach(participant => {
        const participantSplitData = splitData[participant.id]
        if (participantSplitData && participantSplitData.items) {
          participantSplitData.items.forEach(item => {
            if (item.quantity > 0) {
              itemLevelSplits.push({
                itemId: item.id,
                participantId: participant.id,
                amount: item.amount
              })
            }
          })
        }
      })

      const splitRequest = {
        splits: itemLevelSplits
      }

      await roomAPI.createSplit(roomId, splitRequest)
      
      toast.success(t('splitPage.saved'))
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to save split:', error)
      toast.error(error.message || t('splitPage.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  const totalDifference = calculateGrandTotal() - receipt.totalAmount

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">
          {t('split.title')}
        </h2>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Receipt Summary */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-neutral-900 mb-4">
          {t('splitPage.receiptInfo')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 text-neutral-500 mr-2" />
            <span className="text-sm text-neutral-600">{t('splitPage.totalLabel')}</span>
            <span className="font-medium ml-2">
              {formatCurrency(receipt.totalAmount, 'KRW')}
            </span>
          </div>
          <div className="flex items-center">
            <Calculator className="w-5 h-5 text-neutral-500 mr-2" />
            <span className="text-sm text-neutral-600">{t('splitPage.itemCountLabel')}</span>
            <span className="font-medium ml-2">{t('splitManager.itemCount', { count: receipt.items.length })}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-5 h-5 text-neutral-500 mr-2" />
            <span className="text-sm text-neutral-600">{t('splitPage.participantsLabel')}</span>
            <span className="font-medium ml-2">{t('roomSelector.participantCount', { count: participants.length })}</span>
          </div>
        </div>
      </div>

      {/* Split Type Selection */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-neutral-900 mb-4">
          {t('splitPage.splitType')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setSplitType('equal')}
            className={`p-4 border rounded-lg text-left transition-colors ${
              splitType === 'equal'
                ? 'border-primary-500 bg-primary-50 text-primary-900'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <div className="font-medium mb-2">{t('split.method.equal')}</div>
            <div className="text-sm text-neutral-600">
              {t('splitPage.equalDesc')}
            </div>
          </button>
          
          <button
            onClick={() => setSplitType('custom')}
            className={`p-4 border rounded-lg text-left transition-colors ${
              splitType === 'custom'
                ? 'border-primary-500 bg-primary-50 text-primary-900'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <div className="font-medium mb-2">{t('splitPage.itemizedSplit')}</div>
            <div className="text-sm text-neutral-600">
              {t('splitPage.itemizedDesc')}
            </div>
          </button>
          
          <button
            onClick={() => setSplitType('manual')}
            className={`p-4 border rounded-lg text-left transition-colors ${
              splitType === 'manual'
                ? 'border-primary-500 bg-primary-50 text-primary-900'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <div className="font-medium mb-2">{t('split.method.manual')}</div>
            <div className="text-sm text-neutral-600">
              {t('splitPage.manualDesc')}
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Split Details */}
        <div className="lg:col-span-2">
          {splitType === 'equal' && (
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-neutral-900 mb-4">
                {t('splitPage.equalResult')}
              </h3>
              <div className="space-y-4">
                {participants.map(participant => (
                  <div key={participant.id} className="flex justify-between items-center py-3 border-b border-neutral-100">
                    <span className="font-medium">{participant.name}</span>
                    <span className="text-lg font-bold text-primary-600">
                      {formatCurrency(calculateParticipantTotal(participant.id), 'KRW')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {splitType === 'custom' && (
            <div className="space-y-6">
              {receipt.items.map(item => (
                <div key={item.id} className="bg-white border border-neutral-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-neutral-900">{item.name}</h4>
                    <div className="text-sm text-neutral-600">
                      {formatCurrency(item.price, 'KRW')} × {t('splitManager.itemCount', { count: item.quantity })}
                      {getRemainingQuantity(item.id) > 0 && (
                        <span className="ml-2 text-yellow-600">
                          {t('splitPage.remainingQty', { count: getRemainingQuantity(item.id) })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {participants.map(participant => (
                      <div key={participant.id} className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-700">
                          {participant.name}
                        </label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity}
                            step="0.1"
                            value={splitData[participant.id]?.items.find(i => i.id === item.id)?.quantity || 0}
                            onChange={(e) => handleItemQuantityChange(participant.id, item.id, parseFloat(e.target.value) || 0)}
                            error={errors[`${participant.id}_${item.id}`]}
                            className="w-20"
                          />
                          <span className="text-sm text-neutral-600">{t('splitPage.qtyUnit')}</span>
                          <span className="text-sm font-medium ml-auto">
                            {formatCurrency(splitData[participant.id]?.items.find(i => i.id === item.id)?.amount || 0, 'KRW')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {errors[`item_${item.id}`] && (
                    <div className="mt-2 text-sm text-accent-600">
                      {errors[`item_${item.id}`]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {splitType === 'manual' && (
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-neutral-900 mb-4">
                {t('splitPage.manualInput')}
              </h3>
              <div className="space-y-4">
                {participants.map(participant => (
                  <div key={participant.id} className="flex items-center justify-between">
                    <label className="font-medium text-neutral-700">
                      {participant.name}
                    </label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="0"
                        value={splitData[participant.id]?.amount || 0}
                        onChange={(e) => handleManualAmountChange(participant.id, parseFloat(e.target.value) || 0)}
                        error={errors[participant.id]}
                        className="w-32"
                      />
                      <span className="text-sm text-neutral-600">{t('currency.krw')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          {/* Total Summary */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-neutral-900 mb-4">
              {t('splitPage.summary')}
            </h3>
            
            <div className="space-y-3">
              {participants.map(participant => (
                <div key={participant.id} className="flex justify-between items-center">
                  <span className="text-neutral-600">{participant.name}</span>
                  <span className="font-medium">
                    {formatCurrency(calculateParticipantTotal(participant.id), 'KRW')}
                  </span>
                </div>
              ))}
              
              <div className="border-t border-neutral-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">{t('receipt.edit.calculated')}</span>
                  <span className="font-medium">
                    {formatCurrency(calculateGrandTotal(), 'KRW')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">{t('splitPage.receiptTotal')}</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(receipt.totalAmount, 'KRW')}
                  </span>
                </div>
              </div>
            </div>

            {Math.abs(totalDifference) > 0.01 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 mb-1">
                        {t('splitPage.totalDiff', { diff: formatCurrency(totalDifference, 'KRW') })}
                    </p>
                    <p className="text-yellow-700">
                      {t('splitPage.adjustSplit')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-accent-600 mr-2" />
                  <span className="font-medium text-accent-800">{t('splitPage.needsReview')}</span>
              </div>
              <div className="text-sm text-accent-700 space-y-1">
                {Object.entries(errors).map(([key, message]) => (
                  <div key={key}>• {message}</div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSave}
              loading={loading}
              disabled={Math.abs(totalDifference) > 0.01}
              fullWidth
              size="lg"
              leftIcon={<Save className="w-4 h-4" />}
            >
               {t('splitPage.save')}
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

export default Split
