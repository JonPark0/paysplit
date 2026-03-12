import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Receipt, Users, Calculator } from 'lucide-react'

import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import Split from './Split'
import Settlement from '../settlement/Settlement'
import { roomAPI } from '../../services/api'
import { formatCurrency } from '../../utils/currency'

const SplitManager = ({ roomId, onBack }) => {
  const { t } = useTranslation()

  const [currentView, setCurrentView] = useState('receipts') // 'receipts', 'split', 'settlement'
  const [loading, setLoading] = useState(true)
  const [receipts, setReceipts] = useState([])
  const [participants, setParticipants] = useState([])
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [error, setError] = useState(null)

  // Load receipts and participants
  useEffect(() => {
    loadData()
  }, [roomId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [receiptsResponse, participantsResponse] = await Promise.all([
        roomAPI.getReceipts(roomId),
        roomAPI.getParticipants(roomId)
      ])

      setReceipts(receiptsResponse.receipts || [])
      setParticipants(participantsResponse.participants || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      setError(error.message || t('splitManager.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleReceiptSelect = (receipt) => {
    setSelectedReceipt(receipt)
    setCurrentView('split')
  }

  const handleSplitComplete = () => {
    setCurrentView('settlement')
    loadData() // Refresh data after split
  }

  const handleBackToReceipts = () => {
    setCurrentView('receipts')
    setSelectedReceipt(null)
  }

  const handleBackToSplit = () => {
    setCurrentView('split')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-6">
          <div className="flex items-center">
            <span className="text-accent-800">{error}</span>
          </div>
          <div className="mt-4">
            <Button onClick={loadData} variant="outline">
              {t('receipt.upload.retry')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Render based on current view
  if (currentView === 'split' && selectedReceipt) {
    return (
      <Split
        roomId={roomId}
        receipt={selectedReceipt}
        participants={participants}
        onSuccess={handleSplitComplete}
        onCancel={handleBackToReceipts}
      />
    )
  }

  if (currentView === 'settlement') {
    return (
      <Settlement
        roomId={roomId}
        onBack={handleBackToReceipts}
      />
    )
  }

  // Default view: receipts list
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
              {t('split.manager.title')}
            </h2>
            <p className="text-neutral-600 mt-1 text-sm sm:text-base">
              {t('splitManager.subtitle')}
            </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={() => setCurrentView('settlement')}
            variant="outline"
            leftIcon={<Calculator className="w-4 h-4" />}
            className="text-sm sm:text-base whitespace-nowrap"
          >
            {t('common.settlementManagement')}
          </Button>
          {onBack && (
            <Button 
              onClick={onBack} 
              variant="outline" 
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="text-sm sm:text-base whitespace-nowrap"
            >
              {t('common.backToRoom')}
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center">
            <Receipt className="w-8 h-8 text-primary-600 mr-3" />
            <div>
              <p className="text-sm text-neutral-600">{t('splitManager.totalReceipts')}</p>
              <p className="text-2xl font-bold text-neutral-900">
                {receipts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-secondary-600 mr-3" />
            <div>
              <p className="text-sm text-neutral-600">{t('room.info.participants')}</p>
              <p className="text-2xl font-bold text-neutral-900">
                {participants.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center">
            <Calculator className="w-8 h-8 text-accent-600 mr-3" />
            <div>
              <p className="text-sm text-neutral-600">{t('splitManager.totalAmount')}</p>
              <p className="text-2xl font-bold text-neutral-900">
                {formatCurrency(
                  receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0),
                  'KRW'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Receipts List */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-neutral-900 mb-4">
          {t('splitManager.receiptList')}
        </h3>

        {receipts.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500 mb-2">{t('receipt.empty.title')}</p>
            <p className="text-sm text-neutral-400">
              {t('splitManager.uploadFirst')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="border border-neutral-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <h4 className="font-medium text-neutral-900">
                        {t('splitManager.receiptLabel', { id: receipt.id })}
                      </h4>
                      <div className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
                        receipt.hasSplit 
                          ? 'bg-secondary-100 text-secondary-700' 
                          : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {receipt.hasSplit ? t('splitManager.splitDone') : t('splitManager.splitPending')}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-neutral-600">
                      <div className="flex items-center">
                        <Receipt className="w-4 h-4 mr-2" />
                        <span>{t('splitManager.itemCount', { count: receipt.items?.length || 0 })}</span>
                      </div>
                      <div className="flex items-center">
                        <Calculator className="w-4 h-4 mr-2" />
                        <span>{formatCurrency(receipt.totalAmount, 'KRW')}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs">
                          {new Date(receipt.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    
                    {receipt.items && receipt.items.length > 0 && (
                      <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
                        <p className="text-sm font-medium text-neutral-700 mb-2">{t('splitManager.keyItems')}</p>
                        <div className="flex flex-wrap gap-2">
                          {receipt.items.slice(0, 3).map((item, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 bg-white rounded text-xs text-neutral-600">
                              {item.name} ({formatCurrency(item.price, 'KRW')})
                            </span>
                          ))}
                          {receipt.items.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 bg-white rounded text-xs text-neutral-500">
                            {t('splitManager.moreItems', { count: receipt.items.length - 3 })}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row sm:flex-col sm:ml-4 space-x-2 sm:space-x-0 sm:space-y-2">
                    <Button
                      onClick={() => handleReceiptSelect(receipt)}
                      size="sm"
                      className="whitespace-nowrap flex-1 sm:flex-initial"
                    >
                      {receipt.hasSplit ? t('splitManager.editSplit') : t('splitManager.doSplit')}
                    </Button>
                    
                    {receipt.hasSplit && (
                      <Button
                        onClick={() => setCurrentView('settlement')}
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap flex-1 sm:flex-initial"
                      >
                        {t('splitManager.viewSettlement')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SplitManager
