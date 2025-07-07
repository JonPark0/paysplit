import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Users, 
  Receipt as ReceiptIcon, 
  Calculator, 
  Share2, 
  Settings,
  Plus,
  FileText,
  DollarSign
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import LoadingSpinner from '../components/common/LoadingSpinner'
import Button from '../components/common/Button'
import { SplitManager } from '../components/split'
import { Settlement } from '../components/settlement'
import { ReceiptUpload, ReceiptEditor } from '../components/receipt'
import { useRoomStore } from '../stores/roomStore'
import { useSettingsStore } from '../stores/settingsStore'
import { roomAPI, receiptAPI, settlementAPI } from '../services/api'
import { formatCurrency } from '../utils/currency'

const RoomPage = () => {
  const { roomId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()
  
  const {
    currentRoom,
    currentParticipant,
    participants,
    receipts,
    settlements,
    loading,
    setCurrentRoom,
    setParticipants,
    setReceipts,
    setSettlements,
    setLoading,
    getRoomStats,
    leaveRoom
  } = useRoomStore()

  const [activeTab, setActiveTab] = useState('receipts') // 'receipts', 'splits', 'settlements'
  const [roomData, setRoomData] = useState(null)
  const [showReceiptUpload, setShowReceiptUpload] = useState(false)
  const [showReceiptEdit, setShowReceiptEdit] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  // Load room data
  useEffect(() => {
    const loadRoomData = async () => {
      if (!roomId) return

      setLoading('room', true)
      try {
        // Check if we have session access
        if (!currentParticipant) {
          navigate(`/${language}`)
          return
        }

        // Load room details
        const roomResponse = await roomAPI.get(roomId)
        setCurrentRoom(roomResponse.room)
        setParticipants(roomResponse.participants)
        setRoomData(roomResponse)

        // Load receipts
        const receiptsResponse = await receiptAPI.getAll(roomId)
        setReceipts(receiptsResponse.receipts)

        // Load settlements
        const settlementsResponse = await settlementAPI.getSettlements(roomId)
        setSettlements(settlementsResponse.settlements)

      } catch (error) {
        console.error('Failed to load room data:', error)
        
        if (error.status === 401) {
          toast.error(t('errors.unauthorized'))
          leaveRoom()
          navigate(`/${language}`)
        } else if (error.status === 404) {
          toast.error(t('errors.roomNotFound'))
          navigate(`/${language}`)
        } else {
          toast.error(error.message || t('errors.serverError'))
        }
      } finally {
        setLoading('room', false)
      }
    }

    loadRoomData()
  }, [roomId, currentParticipant, navigate, language])

  // Loading state
  if (loading.room) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingSpinner size="xl" text={t('common.loading')} center />
      </div>
    )
  }

  // No room data
  if (!currentRoom || !currentParticipant) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600 mb-4">{t('errors.roomNotFound')}</p>
          <Button onClick={() => navigate(`/${language}`)}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  const stats = getRoomStats()

  const handleShareRoom = async () => {
    try {
      const qrResponse = await roomAPI.getQRCode(roomId)
      // TODO: Implement share modal
      console.log('QR Code:', qrResponse)
      toast.success(t('common.copied'))
    } catch (error) {
      toast.error(t('errors.serverError'))
    }
  }

  const handleAddReceipt = () => {
    setShowReceiptUpload(true)
  }

  const handleReceiptUploadSuccess = (uploadData) => {
    setShowReceiptUpload(false)
    setSelectedReceipt(uploadData)
    setShowReceiptEdit(true)
  }

  const handleReceiptEditSuccess = (receipt) => {
    setShowReceiptEdit(false)
    setSelectedReceipt(null)
    // Refresh receipts - we'll need to reload the data
    window.location.reload()
  }

  const handleEditReceipt = (receipt) => {
    setSelectedReceipt(receipt)
    setShowReceiptEdit(true)
  }

  const handleCalculateSettlement = async () => {
    try {
      setLoading('settlements', true)
      const response = await settlementAPI.calculate(roomId)
      console.log('Settlement calculation:', response)
      // TODO: Show settlement results
      toast.success('Settlement calculated')
    } catch (error) {
      toast.error(error.message || t('errors.calculationError'))
    } finally {
      setLoading('settlements', false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Room Header */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                {currentRoom.name || `Room ${currentRoom.entryCode}`}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {stats.participantCount} {t('room.info.participants')}
                </span>
                <span className="flex items-center">
                  <ReceiptIcon className="w-4 h-4 mr-1" />
                  {stats.receiptCount} {t('room.info.receipts')}
                </span>
                <span className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  {formatCurrency(stats.totalAmount, 'KRW', language)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleShareRoom}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                {t('common.share')}
              </Button>
              {currentParticipant.isAdmin && (
                <Button
                  variant="outline"
                  leftIcon={<Settings className="w-4 h-4" />}
                >
                  {t('common.settings')}
                </Button>
              )}
            </div>
          </div>

          {/* Room Status */}
          <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">
                {t('room.info.status')}: 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  currentRoom.settlementStatus === 'active' 
                    ? 'bg-secondary-100 text-secondary-800'
                    : currentRoom.settlementStatus === 'settling'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-primary-100 text-primary-800'
                }`}>
                  {t(`room.status.${currentRoom.settlementStatus}`)}
                </span>
              </span>
              <span className="text-sm text-neutral-500">
                {t('room.info.entryCode')}: {currentRoom.entryCode}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mb-8">
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('receipts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'receipts'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <ReceiptIcon className="w-4 h-4 inline mr-2" />
                {t('navigation.receipts')} ({stats.receiptCount})
              </button>
              <button
                onClick={() => setActiveTab('splits')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'splits'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <Calculator className="w-4 h-4 inline mr-2" />
                {t('navigation.splits')}
              </button>
              <button
                onClick={() => setActiveTab('settlements')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'settlements'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                {t('navigation.settlements')} ({stats.settlementCount})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'receipts' && (
              <div>
                {/* Receipts Header */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {t('receipt.title')}
                  </h2>
                  <Button
                    onClick={handleAddReceipt}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    {t('receipt.upload.title')}
                  </Button>
                </div>

                {/* Receipts List */}
                {receipts.length === 0 ? (
                  <div className="text-center py-12">
                    <ReceiptIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">
                      No receipts yet
                    </h3>
                    <p className="text-neutral-600 mb-6">
                      Upload your first receipt to get started
                    </p>
                    <Button onClick={handleAddReceipt}>
                      {t('receipt.upload.title')}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {receipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-neutral-900 truncate">
                            {receipt.originalFilename || 'Receipt'}
                          </h3>
                          <span className="text-sm text-neutral-500">
                            {formatCurrency(receipt.totalAmount, receipt.currency, language)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 mb-3">
                          {receipt.uploaderName} • {receipt.items.length} items
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditReceipt(receipt)}
                          >
                            {t('common.edit')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setActiveTab('splits')}
                          >
                            Split
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'splits' && (
              <SplitManager
                roomId={roomId}
                onBack={() => setActiveTab('receipts')}
              />
            )}

            {activeTab === 'settlements' && (
              <Settlement
                roomId={roomId}
                onBack={() => setActiveTab('splits')}
              />
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            {t('room.info.participants')} ({participants.length})
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center space-x-3 p-3 border border-neutral-200 rounded-lg"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium">
                    {participant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">
                    {participant.name}
                    {participant.isAdmin && (
                      <span className="ml-2 text-xs text-primary-600">Admin</span>
                    )}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Joined {new Date(participant.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Receipt Upload Modal */}
      {showReceiptUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <ReceiptUpload
              roomId={roomId}
              onSuccess={handleReceiptUploadSuccess}
              onCancel={() => setShowReceiptUpload(false)}
            />
          </div>
        </div>
      )}

      {/* Receipt Edit Modal */}
      {showReceiptEdit && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto p-6">
            <ReceiptEditor
              roomId={roomId}
              uploadData={selectedReceipt}
              onSuccess={handleReceiptEditSuccess}
              onCancel={() => {
                setShowReceiptEdit(false)
                setSelectedReceipt(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomPage