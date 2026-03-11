import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Camera, FileText, X, Check, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { receiptAPI } from '../../services/api'
import ocrService from '../../services/ocr'
import { validateFile } from '../../utils/validation'

const ReceiptUpload = ({ roomId, onSuccess, onCancel }) => {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const [uploadStep, setUploadStep] = useState('select') // 'select', 'uploading', 'processing', 'review'
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrResult, setOcrResult] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState(null)

  // Handle file selection
  const handleFileSelect = (file) => {
    setError(null)
    
    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)
    handleUpload(file)
  }

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Handle file upload
  const handleUpload = async (file) => {
    try {
      setUploadStep('uploading')
      setError(null)

      // Upload file to server
      const uploadResponse = await receiptAPI.upload(
        roomId,
        file,
        (progress) => setUploadProgress(progress)
      )

      setUploadResult(uploadResponse.file)
      setUploadStep('processing')

      // Process with OCR if it's an image
      if (file.type.startsWith('image/')) {
        try {
          const ocrResult = await ocrService.processImage(
            file,
            roomId,
            (progress) => setOcrProgress(progress)
          )

          const validation = ocrService.validateResult(ocrResult)
          
          setOcrResult({
            ...ocrResult,
            validation
          })

          setUploadStep('review')
        } catch (ocrError) {
          console.error('OCR failed:', ocrError)
          toast.error(t('receipt.upload.ocrFailed'))
          
          // Continue without OCR
          setOcrResult({
            items: [],
            total: 0,
            validation: { isValid: false, issues: ['OCR failed'], score: 0 }
          })
          setUploadStep('review')
        }
      } else {
        // For PDF files, skip OCR and proceed to manual entry
        setOcrResult({
          items: [{ name: '', price: 0, quantity: 1, category: 'other' }],
          total: 0,
          validation: { isValid: true, issues: ['PDF file uploaded successfully - manual entry required'], score: 100 }
        })
        setUploadStep('review')
      }

    } catch (error) {
      console.error('Upload failed:', error)
      setError(error.message || t('errors.uploadFailed'))
      setUploadStep('select')
    }
  }

  // Handle manual entry
  const handleManualEntry = () => {
    // Create manual entry data and skip review step
    const manualData = {
      file: null,  // No file for manual entry
      ocrResult: {
        items: [{ name: '', price: 0, quantity: 1, category: 'other' }],
        total: 0,
        validation: { isValid: true, issues: [], score: 100 }
      },
      items: [{ name: '', price: 0, quantity: 1, category: 'other' }],
      total: 0
    }
    
    // Skip review step and go directly to editing
    if (onSuccess) {
      onSuccess(manualData)
    }
  }

  // Handle OCR retry - re-analyze the same image
  const handleRetry = async () => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      try {
        setUploadStep('processing')
        setOcrProgress(0)
        setError(null)

        // Re-run OCR analysis on the same file
        const ocrResult = await ocrService.processImage(
          selectedFile,
          roomId,
          (progress) => setOcrProgress(progress)
        )

        const validation = ocrService.validateResult(ocrResult)
        
        setOcrResult({
          ...ocrResult,
          validation
        })

        setUploadStep('review')
      } catch (ocrError) {
        console.error('OCR retry failed:', ocrError)
        toast.error('분석을 다시 시도하는 중 오류가 발생했습니다')
        
        // Show failed OCR result
        setOcrResult({
          items: [],
          total: 0,
          validation: { isValid: false, issues: ['다시 시도했지만 분석에 실패했습니다'], score: 0 }
        })
        setUploadStep('review')
      }
    } else {
      // If no file or not an image, go back to file selection
      setUploadStep('select')
    }
  }

  // Handle proceed to finish upload directly (save as-is)
  const handleProceed = async () => {
    try {
      // For now, let's call the success callback with a flag to bypass editing
      // The parent component will handle the actual saving with proper payerId
      if (onSuccess) {
        onSuccess({
          file: uploadResult,
          ocrResult,
          items: ocrResult.items,
          total: ocrResult.total,
          skipEditing: true // Flag to indicate direct save
        })
      }
    } catch (error) {
      console.error('Failed to save receipt directly:', error)
      toast.error('영수증 저장에 실패했습니다')
    }
  }

  // Handle viewing details (previously manual entry from review)
  const handleViewDetails = () => {
    if (onSuccess) {
      onSuccess({
        file: uploadResult,
        ocrResult,
        items: ocrResult.items,
        total: ocrResult.total,
        skipEditing: false // Go to editing mode
      })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">
          {t('receipt.upload.title')}
        </h2>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Upload Steps */}
      {uploadStep === 'select' && (
        <div className="space-y-6">
          {/* Drag & Drop Area */}
          <div
            className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              {t('receipt.upload.dragDrop')}
            </h3>
            <p className="text-neutral-600 mb-6">
              {t('receipt.upload.supportedFormats')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<FileText className="w-4 h-4" />}
              >
                {t('receipt.upload.file')}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                {t('receipt.upload.camera')}
              </Button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
          </div>

          {/* Manual Entry Option */}
          <div className="text-center">
            <p className="text-neutral-600 mb-4">또는</p>
            <Button
              variant="outline"
              onClick={handleManualEntry}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              {t('receipt.upload.manual')}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-accent-600 mr-2" />
                <span className="text-accent-800">{error}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Uploading */}
      {uploadStep === 'uploading' && (
        <div className="text-center py-12">
          <LoadingSpinner size="xl" className="mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            파일 업로드 중...
          </h3>
          <div className="w-full bg-neutral-200 rounded-full h-2 mb-4">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-neutral-600">{uploadProgress}% 완료</p>
        </div>
      )}

      {/* OCR Processing */}
      {uploadStep === 'processing' && (
        <div className="text-center py-12">
          <LoadingSpinner size="xl" className="mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            {t('receipt.upload.processing')}
          </h3>
          <div className="w-full bg-neutral-200 rounded-full h-2 mb-4">
            <div
              className="bg-secondary-600 h-2 rounded-full transition-all duration-200"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
          <p className="text-neutral-600">영수증 내용을 분석하고 있습니다...</p>
        </div>
      )}

      {/* Review Results */}
      {uploadStep === 'review' && ocrResult && (
        <div className="space-y-6">
          {/* OCR Results Summary */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-neutral-900">
                분석 결과
              </h3>
              <div className={`flex items-center space-x-2 ${
                ocrResult.validation.isValid ? 'text-secondary-600' : 'text-yellow-600'
              }`}>
                {ocrResult.validation.isValid ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                  {ocrResult.validation.score}% 정확도
                </span>
              </div>
            </div>

            {/* Items Found */}
            <div className="mb-4">
              <p className="text-sm text-neutral-600 mb-2">
                감지된 항목: {ocrResult.items.length}개
              </p>
              {ocrResult.items.length > 0 && (
                <div className="bg-neutral-50 rounded-lg p-3">
                  {ocrResult.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span className="text-sm text-neutral-700">{item.name}</span>
                      <span className="text-sm font-medium">
                        {item.quantity > 1 && `${item.quantity}x `}
                        {item.price.toLocaleString()}원
                      </span>
                    </div>
                  ))}
                  {ocrResult.items.length > 3 && (
                    <p className="text-xs text-neutral-500 mt-2">
                      +{ocrResult.items.length - 3}개 항목 더...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Total Amount */}
            <div className="flex justify-between items-center py-2 border-t border-neutral-200">
              <span className="font-medium text-neutral-900">총액</span>
              <span className="text-lg font-bold text-neutral-900">
                {ocrResult.total.toLocaleString()}원
              </span>
            </div>

            {/* Validation Issues */}
            {ocrResult.validation.issues.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  확인 필요:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {ocrResult.validation.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleProceed}
              className="flex-1"
              rightIcon={<Check className="w-4 h-4" />}
            >
              계속 진행
            </Button>
            <Button
              variant="outline"
              onClick={handleRetry}
            >
              다시 시도
            </Button>
            <Button
              variant="outline"
              onClick={handleViewDetails}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              자세히 보기
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReceiptUpload
