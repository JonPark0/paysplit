import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  X, 
  Download, 
  FileText, 
  Activity, 
  Clock,
  User,
  Receipt,
  Calculator,
  RefreshCw,
  LogOut,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../common/Button'
import Input from '../common/Input'
import LoadingSpinner from '../common/LoadingSpinner'
import { roomAPI } from '../../services/api'
import { formatCurrency } from '../../utils/currency'
import { useRoomStore } from '../../stores/roomStore'
import { useSettingsStore } from '../../stores/settingsStore'

const Settings = ({ roomId, onClose }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  const { language } = useSettingsStore()
  const { currentRoom, currentParticipant, clearCurrentRoomData, removeRoom } = useRoomStore()
  
  const [activeTab, setActiveTab] = useState('logs')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [leaveRoomConfirmation, setLeaveRoomConfirmation] = useState('')
  const [leavingRoom, setLeavingRoom] = useState(false)

  useEffect(() => {
    if (activeTab === 'logs') {
      loadActivityLogs()
    }
  }, [activeTab, roomId])

  const loadActivityLogs = async () => {
    try {
      setLoading(true)
      const response = await roomAPI.getActivityLogs(roomId)
      setLogs(response.logs || [])
    } catch (error) {
      console.error('Failed to load activity logs:', error)
      toast.error(t('settingsPage.logsLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleArchiveDownload = async (format = 'json') => {
    try {
      setArchiving(true)
      const response = await roomAPI.downloadArchive(roomId, format)
      
      // Create download blob
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `paysplit-room-${roomId}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success(t('settingsPage.archiveDownloadSuccess'))
    } catch (error) {
      console.error('Failed to download archive:', error)
      toast.error(t('settingsPage.archiveDownloadFailed'))
    } finally {
      setArchiving(false)
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'room_created':
      case 'participant_joined':
        return <User className="w-4 h-4" />
      case 'receipt_uploaded':
      case 'receipt_edited':
        return <Receipt className="w-4 h-4" />
      case 'split_created':
      case 'split_updated':
        return <Calculator className="w-4 h-4" />
      case 'settlement_updated':
        return <FileText className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActivityDescription = (log) => {
    switch (log.action) {
      case 'room_created':
        return t('settingsPage.activity.roomCreated')
      case 'participant_joined':
        return t('settingsPage.activity.participantJoined', { name: log.details?.participantName || t('settingsPage.userFallback') })
      case 'receipt_uploaded':
        return t('settingsPage.activity.receiptUploaded', { amount: formatCurrency(log.details?.amount || 0, 'KRW') })
      case 'receipt_edited':
        return t('settingsPage.activity.receiptEdited')
      case 'split_created':
        return t('settingsPage.activity.splitCreated')
      case 'split_updated':
        return t('settingsPage.activity.splitUpdated')
      case 'settlement_updated':
        return t('settingsPage.activity.settlementUpdated')
      default:
        return log.action
    }
  }

  const handleLeaveRoom = async () => {
    if (!currentRoom || !currentParticipant) {
      toast.error(t('settingsPage.roomInfoMissing'))
      return
    }

    // Check if user typed the correct room name
    const roomNameToCheck = currentRoom.name || currentRoom.entryCode
    if (leaveRoomConfirmation.trim() !== roomNameToCheck) {
      toast.error(t('settingsPage.roomNameConfirmError'))
      return
    }

    try {
      setLeavingRoom(true)
      
      // Call backend API to leave room
      await roomAPI.leaveRoom(roomId)
      
      // Remove room from history and clear current room data
      removeRoom(roomId)
      clearCurrentRoomData()
      
      // Close settings modal first
      onClose()
      
      toast.success(t('settingsPage.leaveSuccess'))
      
      // Navigate to home
      navigate(`/${language}`)
      
    } catch (error) {
      console.error('Failed to leave room:', error)
      toast.error(t('settingsPage.leaveFailed'))
    } finally {
      setLeavingRoom(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900">
            {t('common.settings')}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            {t('settingsPage.tabs.logs')}
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'archive'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            {t('settingsPage.tabs.archive')}
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'leave'
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <LogOut className="w-4 h-4 inline mr-2" />
            {t('common.leaveRoom')}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-neutral-900">{t('settingsPage.tabs.logs')}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadActivityLogs}
                  disabled={loading}
                  leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                >
                  {t('common.refresh')}
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      {t('settingsPage.noLogs')}
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 border border-neutral-200 rounded-lg"
                      >
                        <div className="flex-shrink-0 p-2 bg-neutral-100 rounded-lg text-neutral-600">
                          {getActivityIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-900">
                            {getActivityDescription(log)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1 text-xs text-neutral-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(log.createdAt).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}
                            </span>
                            {log.participantName && (
                              <>
                                <span>•</span>
                                <span>{log.participantName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'archive' && (
            <div>
              <h3 className="text-lg font-medium text-neutral-900 mb-4">{t('settingsPage.archive.title')}</h3>
              <p className="text-neutral-600 mb-6">
                {t('settingsPage.archive.description')}
              </p>

              <div className="space-y-4">
                <div className="border border-neutral-200 rounded-lg p-4">
                  <h4 className="font-medium text-neutral-900 mb-2">{t('settingsPage.archive.fullTitle')}</h4>
                  <p className="text-sm text-neutral-600 mb-4">
                    {t('settingsPage.archive.fullDescription')}
                  </p>
                  <Button
                    onClick={() => handleArchiveDownload('json')}
                    disabled={archiving}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    {archiving ? t('settingsPage.archive.downloading') : t('settingsPage.archive.downloadJson')}
                  </Button>
                </div>

                <div className="border border-neutral-200 rounded-lg p-4">
                  <h4 className="font-medium text-neutral-900 mb-2">{t('settingsPage.archive.summaryTitle')}</h4>
                  <p className="text-sm text-neutral-600 mb-4">
                    {t('settingsPage.archive.summaryDescription')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleArchiveDownload('summary')}
                    disabled={archiving}
                    leftIcon={<FileText className="w-4 h-4" />}
                  >
                    {t('settingsPage.archive.downloadSummary')}
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-medium text-neutral-900 mb-2">{t('settingsPage.archive.securityNoticeTitle')}</h4>
                <ul className="text-sm text-neutral-600 space-y-1">
                  <li>• {t('settingsPage.archive.securityNotice1')}</li>
                  <li>• {t('settingsPage.archive.securityNotice2')}</li>
                  <li>• {t('settingsPage.archive.securityNotice3')}</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'leave' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-neutral-900 mb-2 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-accent-600 mr-2" />
                  {t('common.leaveRoom')}
                </h3>
                <p className="text-neutral-600">
                  {t('settingsPage.leave.description')}
                  {currentParticipant?.isAdmin && (
                    <span className="text-accent-600 font-medium">
                      {' '}{t('settingsPage.leave.adminTransfer')}
                    </span>
                  )}
                </p>
              </div>

              <div className="border border-accent-200 rounded-lg p-6 bg-accent-50">
                <h4 className="font-medium text-accent-900 mb-4">{t('settingsPage.leave.confirmTitle')}</h4>
                <p className="text-accent-700 mb-4">
                  {t('settingsPage.leave.confirmDescription')}
                </p>
                
                <div className="mb-4">
                  <div className="text-sm text-neutral-600 mb-2">
                    {t('settingsPage.leave.roomNameToType')}
                  </div>
                  <div className="font-mono text-sm bg-white p-2 rounded border border-accent-200">
                    {currentRoom?.name || currentRoom?.entryCode}
                  </div>
                </div>

                <Input
                  label={t('settingsPage.leave.confirmLabel')}
                  placeholder={t('settingsPage.leave.confirmPlaceholder')}
                  value={leaveRoomConfirmation}
                  onChange={(e) => setLeaveRoomConfirmation(e.target.value)}
                  className="mb-4"
                  fullWidth
                />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab('logs')
                      setLeaveRoomConfirmation('')
                    }}
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleLeaveRoom}
                    disabled={leavingRoom || leaveRoomConfirmation.trim() !== (currentRoom?.name || currentRoom?.entryCode)}
                    loading={leavingRoom}
                    className="flex-1 bg-accent-600 hover:bg-accent-700"
                  >
                    {t('common.leaveRoom')}
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-medium text-neutral-900 mb-2">{t('settingsPage.leave.cautionTitle')}</h4>
                <ul className="text-sm text-neutral-600 space-y-1">
                  <li>• {t('settingsPage.leave.caution1')}</li>
                  <li>• {t('settingsPage.leave.caution2')}</li>
                  <li>• {t('settingsPage.leave.caution3')}</li>
                  <li>• {t('settingsPage.leave.caution4')}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings
