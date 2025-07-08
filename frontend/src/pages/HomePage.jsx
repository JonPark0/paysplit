import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Camera, Calculator, Shield, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../components/common/Button'
import Input from '../components/common/Input'
import LoadingSpinner from '../components/common/LoadingSpinner'
import RoomSelector from '../components/room/RoomSelector'
import { useSettingsStore } from '../stores/settingsStore'
import { useRoomStore } from '../stores/roomStore'
import { roomAPI } from '../services/api'
import { createValidator, roomCreationRules, roomJoinRules } from '../utils/validation'

const HomePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()
  const { setCurrentRoom, setCurrentParticipant, setSessionToken, addRoom, rooms } = useRoomStore()

  // Form states
  const [activeTab, setActiveTab] = useState('create') // 'create' or 'join'
  const [loading, setLoading] = useState(false)
  const [showRoomForm, setShowRoomForm] = useState(rooms.length === 0) // Show form if no rooms
  
  // Create room form
  const [createForm, setCreateForm] = useState({
    name: '',
    adminName: '',
    password: '',
    language: language
  })
  const [createErrors, setCreateErrors] = useState({})

  // Join room form
  const [joinForm, setJoinForm] = useState({
    entryCode: '',
    participantName: '',
    password: ''
  })
  const [joinErrors, setJoinErrors] = useState({})

  // Validators
  const validateCreateForm = createValidator(roomCreationRules)
  const validateJoinForm = createValidator(roomJoinRules)

  // Create room
  const handleCreateRoom = async (e) => {
    e.preventDefault()
    
    const errors = validateCreateForm(createForm)
    if (errors) {
      setCreateErrors(errors)
      return
    }

    setLoading(true)
    setCreateErrors({})

    try {
      const response = await roomAPI.create({
        ...createForm,
        language: language
      })

      // Update stores
      setCurrentRoom(response.room)
      setCurrentParticipant(response.participant)
      setSessionToken(response.sessionToken)
      addRoom(response.room, response.participant, response.sessionToken)

      toast.success(t('room.create.success'))
      navigate(`/${language}/room/${response.room.id}`)
    } catch (error) {
      console.error('Room creation failed:', error)
      toast.error(error.message || t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }

  // Join room
  const handleJoinRoom = async (e) => {
    e.preventDefault()
    
    const errors = validateJoinForm(joinForm)
    if (errors) {
      setJoinErrors(errors)
      return
    }

    setLoading(true)
    setJoinErrors({})

    try {
      const response = await roomAPI.join(joinForm)

      // Update stores
      setCurrentRoom(response.room)
      setCurrentParticipant(response.participant)
      setSessionToken(response.sessionToken)
      addRoom(response.room, response.participant, response.sessionToken)

      toast.success(t('room.join.success'))
      navigate(`/${language}/room/${response.room.id}`)
    } catch (error) {
      console.error('Room join failed:', error)
      
      if (error.status === 404) {
        setJoinErrors({ entryCode: t('errors.roomNotFound') })
      } else if (error.status === 401) {
        setJoinErrors({ password: t('errors.wrongPassword') })
      } else {
        toast.error(error.message || t('errors.serverError'))
      }
    } finally {
      setLoading(false)
    }
  }

  // Form handlers
  const handleCreateFormChange = (field, value) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
    if (createErrors[field]) {
      setCreateErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleJoinFormChange = (field, value) => {
    setJoinForm(prev => ({ ...prev, [field]: value }))
    if (joinErrors[field]) {
      setJoinErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
              {t('home.title')}
            </h1>
            <p className="text-xl sm:text-2xl text-neutral-600 mb-8 max-w-3xl mx-auto">
              {t('home.subtitle')}
            </p>
            <p className="text-lg text-neutral-500 mb-12 max-w-2xl mx-auto">
              {t('home.description')}
            </p>
          </div>

          {/* Main Content */}
          {!showRoomForm && rooms.length > 0 ? (
            <div className="max-w-6xl mx-auto">
              <RoomSelector onCreateNew={() => setShowRoomForm(true)} />
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="card animate-fade-in">
                {/* Tabs */}
              <div className="card-header">
                <div className="flex space-x-1 bg-neutral-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                      activeTab === 'create'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    {t('home.createRoom')}
                  </button>
                  <button
                    onClick={() => setActiveTab('join')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                      activeTab === 'join'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    {t('home.joinRoom')}
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="card-body">
                {activeTab === 'create' ? (
                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    <Input
                      label={t('room.create.roomName')}
                      placeholder={t('room.create.roomNamePlaceholder')}
                      value={createForm.name}
                      onChange={(e) => handleCreateFormChange('name', e.target.value)}
                      error={createErrors.name}
                      fullWidth
                    />

                    <Input
                      label={t('room.create.adminName')}
                      placeholder={t('room.create.adminNamePlaceholder')}
                      value={createForm.adminName}
                      onChange={(e) => handleCreateFormChange('adminName', e.target.value)}
                      error={createErrors.adminName}
                      required
                      fullWidth
                    />

                    <Input
                      label={t('room.create.password')}
                      type="password"
                      placeholder={t('room.create.passwordPlaceholder')}
                      value={createForm.password}
                      onChange={(e) => handleCreateFormChange('password', e.target.value)}
                      error={createErrors.password}
                      required
                      fullWidth
                    />

                    <Button
                      type="submit"
                      loading={loading}
                      fullWidth
                      size="lg"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {loading ? t('room.create.creating') : t('home.createRoom')}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleJoinRoom} className="space-y-4">
                    <Input
                      label={t('room.join.entryCode')}
                      placeholder={t('room.join.entryCodePlaceholder')}
                      value={joinForm.entryCode}
                      onChange={(e) => handleJoinFormChange('entryCode', e.target.value)}
                      error={joinErrors.entryCode}
                      maxLength={6}
                      required
                      fullWidth
                    />

                    <Input
                      label={t('room.join.participantName')}
                      placeholder={t('room.join.participantNamePlaceholder')}
                      value={joinForm.participantName}
                      onChange={(e) => handleJoinFormChange('participantName', e.target.value)}
                      error={joinErrors.participantName}
                      required
                      fullWidth
                    />

                    <Input
                      label={t('room.join.password')}
                      type="password"
                      placeholder={t('room.join.passwordPlaceholder')}
                      value={joinForm.password}
                      onChange={(e) => handleJoinFormChange('password', e.target.value)}
                      error={joinErrors.password}
                      required
                      fullWidth
                    />

                    <Button
                      type="submit"
                      loading={loading}
                      fullWidth
                      size="lg"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {loading ? t('room.join.joining') : t('home.joinRoom')}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              {t('navigation.features')}
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* OCR Feature */}
            <div className="text-center p-6 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                {t('home.features.ocr.title')}
              </h3>
              <p className="text-neutral-600">
                {t('home.features.ocr.description')}
              </p>
            </div>

            {/* Smart Split Feature */}
            <div className="text-center p-6 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors">
              <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                {t('home.features.split.title')}
              </h3>
              <p className="text-neutral-600">
                {t('home.features.split.description')}
              </p>
            </div>

            {/* Security Feature */}
            <div className="text-center p-6 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-accent-600" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                {t('home.features.secure.title')}
              </h3>
              <p className="text-neutral-600">
                {t('home.features.secure.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div id="help" className="py-24 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-8">
            {t('home.help.title')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">{t('home.help.steps.create.title')}</h3>
              <p className="text-sm text-neutral-600">{t('home.help.steps.create.description')}</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">{t('home.help.steps.upload.title')}</h3>
              <p className="text-sm text-neutral-600">{t('home.help.steps.upload.description')}</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">{t('home.help.steps.split.title')}</h3>
              <p className="text-sm text-neutral-600">{t('home.help.steps.split.description')}</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">{t('home.help.steps.settle.title')}</h3>
              <p className="text-sm text-neutral-600">{t('home.help.steps.settle.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage