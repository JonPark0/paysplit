import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users, Lock, User } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { roomAPI } from '../services/api'
import { useRoomStore } from '../stores/roomStore'
import { useSettingsStore } from '../stores/settingsStore'
import recaptchaService from '../services/recaptcha'

const JoinPage = () => {
  const { roomId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()
  const { setCurrentRoom, setCurrentParticipant } = useRoomStore()

  const [loading, setLoading] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)
  const [formData, setFormData] = useState({
    entryCode: '',
    participantName: '',
    password: ''
  })
  const [loadingRoom, setLoadingRoom] = useState(true)

  // Load room info on mount
  useEffect(() => {
    const loadRoomInfo = async () => {
      try {
        setLoadingRoom(true)
        // Get basic room info without authentication
        const response = await roomAPI.getRoomInfo(roomId)
        setRoomInfo(response.room)
        
        // Pre-fill entry code if available
        if (response.room?.entryCode) {
          setFormData(prev => ({ ...prev, entryCode: response.room.entryCode }))
        }
      } catch (error) {
        console.error('Failed to load room info:', error)
        toast.error(t('errors.roomNotFound'))
        navigate(`/${language}`)
      } finally {
        setLoadingRoom(false)
      }
    }

    if (roomId) {
      loadRoomInfo()
    }
  }, [roomId, navigate, language, t])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.entryCode || !formData.participantName || !formData.password) {
      toast.error(t('errors.required'))
      return
    }

    setLoading(true)
    try {
      // Get reCAPTCHA token
      const recaptchaToken = await recaptchaService.getRoomJoinToken()
      
      const joinData = {
        ...formData,
        recaptchaToken
      }

      const response = await roomAPI.join(joinData)
      
      // Store session data
      setCurrentRoom(response.room)
      setCurrentParticipant(response.participant)
      
      toast.success(t('room.join.success'))
      
      // Navigate to room page
      navigate(`/${language}/room/${roomId}`)
    } catch (error) {
      console.error('Failed to join room:', error)
      
      if (error.message.includes('entry code')) {
        toast.error(t('errors.invalidEntryCode'))
      } else if (error.message.includes('password')) {
        toast.error(t('errors.wrongPassword'))
      } else {
        toast.error(error.message || t('errors.serverError'))
      }
    } finally {
      setLoading(false)
    }
  }

  if (loadingRoom) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingSpinner size="xl" text={t('common.loading')} center />
      </div>
    )
  }

  if (!roomInfo) {
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

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            {t('room.join.title')}
          </h1>
          {roomInfo.name && (
            <p className="text-neutral-600">
              {roomInfo.name}
            </p>
          )}
        </div>

        {/* Room Info */}
        <div className="bg-neutral-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">{t('room.info.participants')}</span>
            <span className="font-medium">{t('roomSelector.participantCount', { count: roomInfo.participantCount || 0 })}</span>
          </div>
          {roomInfo.totalAmount > 0 && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-neutral-600">{t('room.info.totalAmount')}</span>
              <span className="font-medium">{roomInfo.totalAmount.toLocaleString()} {t('currency.krw')}</span>
            </div>
          )}
        </div>

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entry Code */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              {t('room.join.entryCode')}
            </label>
            <input
              type="text"
              name="entryCode"
              value={formData.entryCode}
              onChange={handleInputChange}
              placeholder={t('room.join.entryCodePlaceholder')}
              maxLength={6}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* Participant Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              {t('room.join.participantName')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                name="participantName"
                value={formData.participantName}
                onChange={handleInputChange}
                placeholder={t('room.join.participantNamePlaceholder')}
                className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              {t('room.join.password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder={t('room.join.passwordPlaceholder')}
                className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? t('room.join.joining') : t('room.join.title')}
          </Button>
        </form>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate(`/${language}`)}
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default JoinPage
