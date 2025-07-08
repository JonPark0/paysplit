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
      toast.error('활동 로그를 불러오지 못했습니다')
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
      
      toast.success('아카이브 다운로드가 완료되었습니다')
    } catch (error) {
      console.error('Failed to download archive:', error)
      toast.error('아카이브 다운로드에 실패했습니다')
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
        return `방이 생성되었습니다`
      case 'participant_joined':
        return `${log.details?.participantName || '사용자'}님이 참여했습니다`
      case 'receipt_uploaded':
        return `영수증이 업로드되었습니다 (${formatCurrency(log.details?.amount || 0, 'KRW')})`
      case 'receipt_edited':
        return `영수증이 수정되었습니다`
      case 'split_created':
        return `비용 분할이 생성되었습니다`
      case 'split_updated':
        return `비용 분할이 수정되었습니다`
      case 'settlement_updated':
        return `정산 상태가 업데이트되었습니다`
      default:
        return log.action
    }
  }

  const handleLeaveRoom = async () => {
    if (!currentRoom || !currentParticipant) {
      toast.error('방 정보를 불러올 수 없습니다')
      return
    }

    // Check if user typed the correct room name
    const roomNameToCheck = currentRoom.name || currentRoom.entryCode
    if (leaveRoomConfirmation.trim() !== roomNameToCheck) {
      toast.error('방 이름을 정확히 입력해주세요')
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
      
      toast.success('방에서 나왔습니다')
      
      // Navigate to home
      navigate(`/${language}`)
      
    } catch (error) {
      console.error('Failed to leave room:', error)
      toast.error('방 나가기에 실패했습니다')
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
            활동 로그
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
            아카이브
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
            방 나가기
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-neutral-900">활동 로그</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadActivityLogs}
                  disabled={loading}
                  leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                >
                  새로고침
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
                      아직 활동 내역이 없습니다
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
                              {new Date(log.createdAt).toLocaleString('ko-KR')}
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
              <h3 className="text-lg font-medium text-neutral-900 mb-4">데이터 아카이브</h3>
              <p className="text-neutral-600 mb-6">
                방의 모든 데이터를 파일로 다운로드할 수 있습니다. 
                투명성과 기록 보관을 위해 모든 활동 내역과 정산 정보가 포함됩니다.
              </p>

              <div className="space-y-4">
                <div className="border border-neutral-200 rounded-lg p-4">
                  <h4 className="font-medium text-neutral-900 mb-2">전체 데이터 아카이브</h4>
                  <p className="text-sm text-neutral-600 mb-4">
                    방의 모든 정보 (참여자, 영수증, 분할 내역, 정산 결과, 활동 로그)를 포함합니다.
                  </p>
                  <Button
                    onClick={() => handleArchiveDownload('json')}
                    disabled={archiving}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    {archiving ? '다운로드 중...' : 'JSON 형식으로 다운로드'}
                  </Button>
                </div>

                <div className="border border-neutral-200 rounded-lg p-4">
                  <h4 className="font-medium text-neutral-900 mb-2">요약 리포트</h4>
                  <p className="text-sm text-neutral-600 mb-4">
                    정산 결과와 주요 통계만 포함된 간단한 리포트입니다.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleArchiveDownload('summary')}
                    disabled={archiving}
                    leftIcon={<FileText className="w-4 h-4" />}
                  >
                    요약 리포트 다운로드
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-medium text-neutral-900 mb-2">데이터 보안 안내</h4>
                <ul className="text-sm text-neutral-600 space-y-1">
                  <li>• 다운로드된 파일에는 개인정보가 포함될 수 있습니다</li>
                  <li>• 파일을 안전한 장소에 보관하시기 바랍니다</li>
                  <li>• 정산 완료 후 1개월 뒤 서버에서 자동 삭제됩니다</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'leave' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-neutral-900 mb-2 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-accent-600 mr-2" />
                  방 나가기
                </h3>
                <p className="text-neutral-600">
                  방에서 나가면 더 이상 해당 방의 활동에 참여할 수 없습니다.
                  {currentParticipant?.isAdmin && (
                    <span className="text-accent-600 font-medium">
                      {' '}관리자 권한이 있는 경우 다른 참가자에게 관리자 권한이 자동으로 이전됩니다.
                    </span>
                  )}
                </p>
              </div>

              <div className="border border-accent-200 rounded-lg p-6 bg-accent-50">
                <h4 className="font-medium text-accent-900 mb-4">확인 절차</h4>
                <p className="text-accent-700 mb-4">
                  방 나가기를 진행하려면 아래에 방 이름을 정확히 입력해주세요:
                </p>
                
                <div className="mb-4">
                  <div className="text-sm text-neutral-600 mb-2">
                    입력해야 할 방 이름:
                  </div>
                  <div className="font-mono text-sm bg-white p-2 rounded border border-accent-200">
                    {currentRoom?.name || currentRoom?.entryCode}
                  </div>
                </div>

                <Input
                  label="방 이름 확인"
                  placeholder="위의 방 이름을 정확히 입력하세요"
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
                    취소
                  </Button>
                  <Button
                    onClick={handleLeaveRoom}
                    disabled={leavingRoom || leaveRoomConfirmation.trim() !== (currentRoom?.name || currentRoom?.entryCode)}
                    loading={leavingRoom}
                    className="flex-1 bg-accent-600 hover:bg-accent-700"
                  >
                    방 나가기
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-medium text-neutral-900 mb-2">주의사항</h4>
                <ul className="text-sm text-neutral-600 space-y-1">
                  <li>• 방을 나가면 해당 방의 데이터에 접근할 수 없습니다</li>
                  <li>• 정산이 완료되지 않은 상태에서 나가면 정산에 영향을 줄 수 있습니다</li>
                  <li>• 관리자가 나가는 경우 다른 참가자에게 관리자 권한이 이전됩니다</li>
                  <li>• 나중에 다시 참여하려면 입장 코드가 필요합니다</li>
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