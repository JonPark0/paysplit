import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Clock, Users, Receipt, ArrowRight, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../common/Button'
import Input from '../common/Input'
import { useSettingsStore } from '../../stores/settingsStore'
import { useRoomStore } from '../../stores/roomStore'
import { formatDistanceToNow } from '../../utils/date'

const RoomSelector = ({ onCreateNew }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()
  const { rooms, lastAccessedRooms, switchToRoom, removeRoom, getRecentRooms } = useRoomStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const roomsPerPage = 6

  // Filter rooms based on search query
  const filteredRooms = rooms.filter(room => 
    room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.entryCode.includes(searchQuery) ||
    room.adminName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get recent rooms for quick access
  const recentRooms = getRecentRooms()

  // Pagination logic
  const roomsToShow = searchQuery ? filteredRooms : rooms
  const totalPages = Math.ceil(roomsToShow.length / roomsPerPage)
  const startIndex = (currentPage - 1) * roomsPerPage
  const endIndex = startIndex + roomsPerPage
  const currentRooms = roomsToShow.slice(startIndex, endIndex)

  // Reset page when search changes
  const handleSearchChange = (value) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // Handle room selection
  const handleRoomSelect = (roomId) => {
    try {
      switchToRoom(roomId)
      navigate(`/${language}/room/${roomId}`)
    } catch (error) {
      console.error('Failed to switch to room:', error)
      toast.error('방으로 이동할 수 없습니다')
    }
  }

  // Handle room removal
  const handleRemoveRoom = (roomId, roomName) => {
    if (window.confirm(`"${roomName || '방'}"을(를) 목록에서 제거하시겠습니까?`)) {
      removeRoom(roomId)
      toast.success('방이 목록에서 제거되었습니다')
    }
  }

  // Room card component
  const RoomCard = ({ room, isRecent = false }) => (
    <div
      key={room.id}
      className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => handleRoomSelect(room.id)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-neutral-900 group-hover:text-primary-600 transition-colors truncate">
            {room.name || `방 ${room.entryCode}`}
          </h3>
          <p className="text-sm text-neutral-500 mt-1">
            입장 코드: {room.entryCode}
          </p>
          {isRecent && (
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-primary-100 text-primary-600 rounded">
              최근 접속
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleRemoveRoom(room.id, room.name)
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </Button>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-primary-600 transition-colors" />
        </div>
      </div>

      <div className="flex items-center space-x-4 text-sm text-neutral-600">
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-1" />
          <span>{room.participantCount || 0}명</span>
        </div>
        <div className="flex items-center">
          <Receipt className="w-4 h-4 mr-1" />
          <span>{room.receiptCount || 0}개</span>
        </div>
        {room.lastActivity && (
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>{formatDistanceToNow(room.lastActivity)}</span>
          </div>
        )}
      </div>
    </div>
  )

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-neutral-900 mb-2">
          참여한 방이 없습니다
        </h3>
        <p className="text-neutral-600 mb-6">
          새로운 방을 만들거나 기존 방에 참여해보세요
        </p>
        <Button onClick={onCreateNew} leftIcon={<ArrowRight className="w-4 h-4" />}>
          방 만들기 / 참여하기
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-neutral-900">
          내 방 목록
        </h2>
        <Button variant="outline" onClick={onCreateNew}>
          새 방 만들기
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <Input
          placeholder="방 이름이나 입장 코드로 검색..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
          fullWidth
        />
      </div>

      {/* Recent Rooms */}
      {!searchQuery && recentRooms.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-neutral-900 mb-3">
            최근 방
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentRooms.map(room => (
              <RoomCard key={room.id} room={room} isRecent={true} />
            ))}
          </div>
        </div>
      )}

      {/* All Rooms */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-neutral-900">
            {searchQuery ? '검색 결과' : '모든 방'}
            <span className="ml-2 text-sm font-normal text-neutral-500">
              ({roomsToShow.length}개)
            </span>
          </h3>
          {totalPages > 1 && (
            <div className="text-sm text-neutral-500">
              페이지 {currentPage} / {totalPages}
            </div>
          )}
        </div>

        {roomsToShow.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-600">
              {searchQuery ? '검색 결과가 없습니다' : '방이 없습니다'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentRooms.map(room => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-8 space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? "min-w-[2rem]" : "min-w-[2rem]"}
                  >
                    {page}
                  </Button>
                ))}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default RoomSelector