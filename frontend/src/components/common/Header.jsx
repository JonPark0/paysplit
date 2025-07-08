import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Globe, Home, ChevronDown } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useRoomStore } from '../../stores/roomStore'

const Header = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const { language, setLanguage } = useSettingsStore()
  const { currentRoom, currentParticipant, leaveRoom, rooms, switchToRoom, getRecentRooms } = useRoomStore()
  const [showRoomDropdown, setShowRoomDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const toggleLanguage = () => {
    const newLanguage = language === 'ko' ? 'en' : 'ko'
    setLanguage(newLanguage)
    
    // Update URL with new language
    const pathSegments = location.pathname.split('/')
    if (pathSegments[1] === 'ko' || pathSegments[1] === 'en') {
      pathSegments[1] = newLanguage
    } else {
      pathSegments.splice(1, 0, newLanguage)
    }
    
    const newPath = pathSegments.join('/')
    navigate(newPath, { replace: true })
  }

  const handleLeaveRoom = () => {
    leaveRoom()
    navigate(`/${language}`)
    setIsMenuOpen(false)
  }

  const handleHomeClick = () => {
    navigate(`/${language}`)
    setIsMenuOpen(false)
  }

  const handleRoomSwitch = (roomId) => {
    switchToRoom(roomId)
    navigate(`/${language}/room/${roomId}`)
    setShowRoomDropdown(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowRoomDropdown(false)
      }
    }

    if (showRoomDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showRoomDropdown])

  const isRoomPage = currentRoom !== null

  return (
    <header className="bg-white border-b border-neutral-200 safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <button
              onClick={handleHomeClick}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PS</span>
              </div>
              <span className="text-xl font-bold">PaySplit</span>
            </button>
            
            {/* Room info - clickable to return to room */}
            {currentRoom && (
              <button
                onClick={() => navigate(`/${language}/room/${currentRoom.id}`)}
                className="ml-4 pl-4 border-l border-neutral-200 hidden sm:block hover:bg-neutral-50 rounded-md px-3 py-2 transition-colors"
                title={t('room.info.clickToEnter')}
              >
                <div className="text-sm text-neutral-600">
                  {currentRoom.name || t('room.info.entryCode') + ': ' + currentRoom.entryCode}
                </div>
                {currentParticipant && (
                  <div className="text-xs text-neutral-500">
                    {currentParticipant.name}
                    {currentParticipant.isAdmin && (
                      <span className="ml-1 text-primary-600">({t('common.admin')})</span>
                    )}
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isRoomPage ? (
              <>
                {/* Room Switcher */}
                {rooms.length > 1 && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                      className="btn-ghost text-sm flex items-center"
                    >
                      다른 방
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </button>
                    
                    {showRoomDropdown && (
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-neutral-200 rounded-lg shadow-lg z-50">
                        <div className="p-2">
                          <div className="text-xs font-medium text-neutral-500 px-3 py-2">
                            최근 방
                          </div>
                          {getRecentRooms().slice(0, 5).map(room => (
                            <button
                              key={room.id}
                              onClick={() => handleRoomSwitch(room.id)}
                              className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-neutral-50 transition-colors ${
                                room.id === currentRoom?.id ? 'bg-primary-50 text-primary-600' : 'text-neutral-700'
                              }`}
                            >
                              <div className="font-medium truncate">
                                {room.name || `방 ${room.entryCode}`}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {room.entryCode}
                              </div>
                            </button>
                          ))}
                          <div className="border-t border-neutral-100 mt-2 pt-2">
                            <button
                              onClick={() => {
                                navigate(`/${language}`)
                                setShowRoomDropdown(false)
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            >
                              모든 방 보기
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={handleLeaveRoom}
                  className="btn-ghost text-sm"
                >
                  {t('common.leaveRoom')}
                </button>
              </>
            ) : (
              <nav className="flex items-center space-x-6">
                <a
                  href="#features"
                  className="text-neutral-600 hover:text-neutral-900 text-sm font-medium transition-colors"
                >
                  {t('navigation.features')}
                </a>
                <a
                  href="#help"
                  className="text-neutral-600 hover:text-neutral-900 text-sm font-medium transition-colors"
                >
                  {t('navigation.help')}
                </a>
              </nav>
            )}
            
            <button
              onClick={toggleLanguage}
              className="btn-ghost p-2"
              title={t('navigation.language')}
            >
              <Globe className="w-5 h-5" />
              <span className="ml-1 text-sm">
                {language === 'ko' ? 'EN' : 'KO'}
              </span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="btn-ghost p-2"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Room info mobile - clickable to return to room */}
            {currentRoom && (
              <button
                onClick={() => {
                  navigate(`/${language}/room/${currentRoom.id}`)
                  setIsMenuOpen(false)
                }}
                className="w-full px-3 py-2 border-b border-neutral-100 mb-2 text-left hover:bg-neutral-50 rounded-md transition-colors"
                title={t('room.info.clickToEnter')}
              >
                <div className="text-sm font-medium text-neutral-900">
                  {currentRoom.name || t('room.info.entryCode') + ': ' + currentRoom.entryCode}
                </div>
                {currentParticipant && (
                  <div className="text-xs text-neutral-500 mt-1">
                    {currentParticipant.name}
                    {currentParticipant.isAdmin && (
                      <span className="ml-1 text-primary-600">({t('common.admin')})</span>
                    )}
                  </div>
                )}
              </button>
            )}

            {isRoomPage ? (
              <button
                onClick={handleLeaveRoom}
                className="flex items-center w-full px-3 py-2 text-left text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-md"
              >
                <Home className="w-4 h-4 mr-3" />
                {t('common.leaveRoom')}
              </button>
            ) : (
              <>
                <a
                  href="#features"
                  className="flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navigation.features')}
                </a>
                <a
                  href="#help"
                  className="flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navigation.help')}
                </a>
              </>
            )}
            
            <button
              onClick={toggleLanguage}
              className="flex items-center w-full px-3 py-2 text-left text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 rounded-md"
            >
              <Globe className="w-4 h-4 mr-3" />
              {t('navigation.language')} ({language === 'ko' ? 'EN' : 'KO'})
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header