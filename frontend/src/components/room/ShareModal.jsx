import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Copy, Download, QrCode } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Button from '../common/Button'

const ShareModal = ({ isOpen, onClose, roomData, qrData }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('qr') // 'qr', 'code', 'link'

  if (!isOpen || !roomData || !qrData) return null

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('common.copy') + ' ' + t('common.success'))
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success(t('common.copy') + ' ' + t('common.success'))
    }
  }

  const downloadQRCode = () => {
    const link = document.createElement('a')
    link.href = qrData.qrCode
    link.download = `PaySplit-Room-${roomData.entryCode}.png`
    link.click()
    toast.success(t('room.share.downloadQr') + ' ' + t('common.success'))
  }

  const shareMessage = t('room.share.shareMessage', {
    url: qrData.url,
    code: qrData.entryCode
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">
            {t('room.share.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'qr'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <QrCode className="w-4 h-4 inline mr-2" />
            {t('room.share.qrCode')}
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'code'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t('room.info.entryCode')}
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'link'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t('room.share.copyUrl')}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'qr' && (
            <div className="text-center">
              <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-4 inline-block">
                <img
                  src={qrData.qrCode}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                {t('room.info.entryCode')}: <span className="font-mono font-bold">{qrData.entryCode}</span>
              </p>
              <Button
                onClick={downloadQRCode}
                leftIcon={<Download className="w-4 h-4" />}
                className="w-full"
              >
                {t('room.share.downloadQr')}
              </Button>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="text-center">
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 mb-4">
                <p className="text-sm text-neutral-600 mb-2">
                  {t('room.info.entryCode')}
                </p>
                <p className="text-3xl font-mono font-bold text-primary-600">
                  {qrData.entryCode}
                </p>
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                다른 사용자가 이 코드를 입력하여 방에 참여할 수 있습니다.
              </p>
              <Button
                onClick={() => copyToClipboard(qrData.entryCode)}
                leftIcon={<Copy className="w-4 h-4" />}
                className="w-full"
              >
                {t('room.info.entryCode')} {t('common.copy')}
              </Button>
            </div>
          )}

          {activeTab === 'link' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('room.share.copyUrl')}
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={qrData.url}
                    readOnly
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-l-lg bg-neutral-50 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(qrData.url)}
                    className="px-3 py-2 bg-primary-500 text-white border border-primary-500 rounded-r-lg hover:bg-primary-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('room.share.copyMessage')}
                </label>
                <textarea
                  value={shareMessage}
                  readOnly
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-sm resize-none"
                />
              </div>

              <Button
                onClick={() => copyToClipboard(shareMessage)}
                leftIcon={<Copy className="w-4 h-4" />}
                className="w-full"
              >
                {t('room.share.copyMessage')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShareModal