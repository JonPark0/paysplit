import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Clock, Users, Receipt, ArrowRight, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../common/Button'
import Input from '../common/Input'
import { useSettingsStore } from '../../stores/settingsStore'
import { useRoomStore } from '../../stores/roomStore'
import { roomAPI } from '../../services/api'
import { formatDistanceToNow } from '../../utils/date'

const RoomSelector = ({ onCreateNew }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()
  const { rooms, lastAccessedRooms, switchToRoom, removeRoom, getRecentRooms } = useRoomStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [roomStats, setRoomStats] = useState({}) // Store room stats by roomId
  const roomsPerPage = 6

  // Filter rooms based on search query
  const filteredRooms = rooms.filter(room => 
    room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.entryCode.includes(searchQuery) ||
    room.adminName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get recent rooms for quick access
  const recentRooms = getRecentRooms()

  // Fetch room stats when rooms change
  useEffect(() => {
    const fetchRoomStats = async () => {
      if (rooms.length === 0) return

      const statsPromises = rooms.map(async (room) => {
        try {
          const roomInfo = await roomAPI.getRoomInfo(room.id)
          return {
            roomId: room.id,
            participantCount: roomInfo.room.participantCount || 0,
            receiptCount: roomInfo.room.receiptCount || 0
          }
        } catch (error) {
          console.error(`Failed to fetch stats for room ${room.id}:`, error)
          return {
            roomId: room.id,
            participantCount: 0,
            receiptCount: 0
          }
        }
      })

      try {
        const stats = await Promise.all(statsPromises)
        const statsMap = stats.reduce((acc, stat) => {
          acc[stat.roomId] = stat
          return acc
        }, {})
        setRoomStats(statsMap)
      } catch (error) {
        console.error('Failed to fetch room stats:', error)
      }
    }

    fetchRoomStats()
  }, [rooms])

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
      toast.error(t('roomSelector.cannotEnterRoom'))
    }
  }

  // Handle room removal
  const handleRemoveRoom = (roomId, roomName) => {
    if (window.confirm(t('roomSelector.removeConfirm', { roomName: roomName || t('roomSelector.defaultRoomName') }))) {
      removeRoom(roomId)
      toast.success(t('roomSelector.removed'))
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
            {room.name || t('roomSelector.roomWithCode', { code: room.entryCode })}
          </h3>
            <p className="text-sm text-neutral-500 mt-1">
              {t('roomSelector.entryCode')}: {room.entryCode}
            </p>
          {isRecent && (
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-primary-100 text-primary-600 rounded">
                  {t('roomSelector.recentBadge')}
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
          <span>{t('roomSelector.participantCount', { count: roomStats[room.id]?.participantCount || 0 })}</span>
        </div>
        <div className="flex items-center">
          <Receipt className="w-4 h-4 mr-1" />
          <span>{t('roomSelector.receiptCount', { count: roomStats[room.id]?.receiptCount || 0 })}</span>
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
          {t('roomSelector.emptyTitle')}
        </h3>
        <p className="text-neutral-600 mb-6">
          {t('roomSelector.emptyDescription')}
        </p>
        <Button onClick={onCreateNew} leftIcon={<ArrowRight className="w-4 h-4" />}>
          {t('roomSelector.createOrJoin')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-neutral-900">
          {t('roomSelector.myRooms')}
        </h2>
        <Button variant="outline" onClick={onCreateNew}>
          {t('roomSelector.newRoom')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <Input
          placeholder={t('roomSelector.searchPlaceholder')}
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
            {t('roomSelector.recentRooms')}
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
            {searchQuery ? t('roomSelector.searchResults') : t('roomSelector.allRooms')}
            <span className="ml-2 text-sm font-normal text-neutral-500">
              ({t('roomSelector.roomCount', { count: roomsToShow.length })})
            </span>
          </h3>
          {totalPages > 1 && (
            <div className="text-sm text-neutral-500">
              {t('roomSelector.pageInfo', { page: currentPage, totalPages })}
            </div>
          )}
        </div>

        {roomsToShow.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-600">
              {searchQuery ? t('roomSelector.noSearchResults') : t('roomSelector.noRooms')}
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
