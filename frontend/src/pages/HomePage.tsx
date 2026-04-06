import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Camera, Calculator, Shield, ArrowRight, Lock } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../components/common/Button'
import Input from '../components/common/Input'
import RoomSelector from '../components/room/RoomSelector'
import RecaptchaInfo from '../components/common/RecaptchaInfo'
import { useSettingsStore } from '../stores/settingsStore'
import { useRoomStore } from '../stores/roomStore'
import { roomAPI } from '../services/api'
import { createValidator, roomCreationRules, roomCreationWithPasswordRules, roomJoinRules } from '../utils/validation'
import recaptchaService from '../services/recaptcha'

const HomePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()
  const { setCurrentRoom, setCurrentParticipant, setSessionToken, addRoom, rooms } = useRoomStore()

  type CreateForm = {
    name: string
    adminName: string
    usePassword: boolean
    password: string
    language: 'ko' | 'en'
  }

  type JoinForm = {
    entryCode: string
    participantName: string
    password: string
  }

  // Form states
  const [loading, setLoading] = useState(false)
  const [showRoomForm, setShowRoomForm] = useState(rooms.length === 0) // Show form if no rooms
  const [formMode, setFormMode] = useState<'create' | 'join'>('create')
  
  // Create room form
  const [createForm, setCreateForm] = useState<CreateForm>({
    name: '',
    adminName: '',
    usePassword: false,
    password: '',
    language: language
  })
  const [createErrors, setCreateErrors] = useState<Record<string, string | null>>({})

  // Join room form
  const [joinForm, setJoinForm] = useState<JoinForm>({
    entryCode: '',
    participantName: '',
    password: ''
  })
  const [joinErrors, setJoinErrors] = useState<Record<string, string | null>>({})

  // Validators
  const validateCreateForm = createValidator(
    createForm.usePassword ? roomCreationWithPasswordRules : roomCreationRules
  )
  const validateJoinForm = createValidator(roomJoinRules)

  // Create room
  const handleCreateRoom = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const errors = validateCreateForm(createForm)
    if (errors) {
      setCreateErrors(errors)
      return
    }

    setLoading(true)
    setCreateErrors({})

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await recaptchaService.getRoomCreateToken()
      
      const { usePassword: _usePassword, ...formData } = createForm
      const response = await roomAPI.create({
        ...formData,
        password: createForm.usePassword ? createForm.password : null,
        language: language,
        recaptchaToken
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
  const handleJoinRoom = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const errors = validateJoinForm(joinForm)
    if (errors) {
      setJoinErrors(errors)
      return
    }

    setLoading(true)
    setJoinErrors({})

    try {
      const recaptchaToken = await recaptchaService.getRoomJoinToken()

      const response = await roomAPI.join({
        ...joinForm,
        recaptchaToken
      })

      setCurrentRoom(response.room)
      setCurrentParticipant(response.participant)
      setSessionToken(response.sessionToken)
      addRoom(response.room, response.participant, response.sessionToken)

      toast.success(t('room.join.success'))
      navigate(`/${language}/room/${response.room.id}`)
    } catch (error) {
      console.error('Room join failed:', error)

      const message = error.message || ''
      if (message.includes('entry code')) {
        toast.error(t('errors.invalidEntryCode'))
        return
      }

      if (message.includes('password')) {
        toast.error(t('errors.wrongPassword'))
        return
      }

      toast.error(message || t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }

  // Form handlers
  const handleCreateFormChange = (field: keyof CreateForm, value: string) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
    if (createErrors[field]) {
      setCreateErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleJoinFormChange = (field: keyof JoinForm, value: string) => {
    const normalizedValue = field === 'entryCode'
      ? value.replace(/\D/g, '').slice(0, 6)
      : value

    setJoinForm(prev => ({ ...prev, [field]: normalizedValue }))
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
                {/* Header */}
                <div className="card-header space-y-4">
                  <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-1">
                    <button
                      type="button"
                      onClick={() => setFormMode('create')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        formMode === 'create'
                          ? 'bg-white text-primary-700 shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {t('home.createRoom')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMode('join')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        formMode === 'join'
                          ? 'bg-white text-primary-700 shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {t('home.joinRoom')}
                    </button>
                  </div>

                  <h2 className="text-xl font-bold text-neutral-900 flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    {formMode === 'create' ? t('home.createRoom') : t('home.joinRoom')}
                  </h2>
                </div>

              {/* Form Content */}
              <div className="card-body">
                {formMode === 'create' ? (
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

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={createForm.usePassword}
                            onChange={(e) => {
                              handleCreateFormChange('usePassword', e.target.checked ? 'true' : '')
                              setCreateForm(prev => ({
                                ...prev,
                                usePassword: e.target.checked,
                                password: e.target.checked ? prev.password : ''
                              }))
                              if (!e.target.checked) {
                                setCreateErrors(prev => ({ ...prev, password: null }))
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-6 bg-neutral-300 peer-checked:bg-primary-500 rounded-full transition-colors" />
                          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
                          <Lock className="w-4 h-4" />
                          {t('room.create.usePassword')}
                        </div>
                      </label>
                      {createForm.usePassword && (
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
                      )}
                    </div>

                    <Button
                      type="submit"
                      loading={loading}
                      fullWidth
                      size="lg"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {loading ? t('room.create.creating') : t('home.createRoom')}
                    </Button>

                    <RecaptchaInfo className="mt-3" />
                  </form>
                ) : (
                  <form onSubmit={handleJoinRoom} className="space-y-4">
                    <Input
                      label={t('room.join.entryCode')}
                      placeholder={t('room.join.entryCodePlaceholder')}
                      value={joinForm.entryCode}
                      onChange={(e) => handleJoinFormChange('entryCode', e.target.value)}
                      error={joinErrors.entryCode}
                      inputMode="numeric"
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
                      placeholder={t('room.join.passwordOptionalPlaceholder')}
                      value={joinForm.password}
                      onChange={(e) => handleJoinFormChange('password', e.target.value)}
                      error={joinErrors.password}
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

                    <RecaptchaInfo className="mt-3" />
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
