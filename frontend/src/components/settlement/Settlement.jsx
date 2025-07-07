import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calculator, ArrowRight, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { roomAPI } from '../../services/api'
import { formatCurrency } from '../../utils/currency'

const Settlement = ({ roomId, onBack }) => {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [settlements, setSettlements] = useState([])
  const [balances, setBalances] = useState([])
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState(null)
  const [recalculating, setRecalculating] = useState(false)

  // Load settlement data
  useEffect(() => {
    loadSettlements()
  }, [roomId])

  const loadSettlements = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await roomAPI.getSettlements(roomId)
      
      setSettlements(response.settlements || [])
      setBalances(response.balances || [])
      setTransactions(response.transactions || [])
    } catch (error) {
      console.error('Failed to load settlements:', error)
      setError(error.message || '정산 정보를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }

  // Recalculate settlements
  const handleRecalculate = async () => {
    try {
      setRecalculating(true)
      
      await roomAPI.recalculateSettlements(roomId)
      await loadSettlements()
      
      toast.success('정산이 재계산되었습니다')
    } catch (error) {
      console.error('Failed to recalculate settlements:', error)
      toast.error(error.message || '정산 재계산에 실패했습니다')
    } finally {
      setRecalculating(false)
    }
  }

  // Mark settlement as paid
  const handleMarkAsPaid = async (settlementId) => {
    try {
      await roomAPI.markSettlementAsPaid(roomId, settlementId)
      await loadSettlements()
      
      toast.success('정산이 완료 처리되었습니다')
    } catch (error) {
      console.error('Failed to mark settlement as paid:', error)
      toast.error(error.message || '정산 완료 처리에 실패했습니다')
    }
  }

  // Get status color and icon
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'completed':
        return {
          color: 'text-secondary-600',
          bg: 'bg-secondary-50',
          icon: CheckCircle,
          text: '완료'
        }
      case 'pending':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          icon: Clock,
          text: '대기중'
        }
      default:
        return {
          color: 'text-neutral-600',
          bg: 'bg-neutral-50',
          icon: AlertCircle,
          text: '알 수 없음'
        }
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-accent-600 mr-2" />
            <span className="text-accent-800">{error}</span>
          </div>
          <div className="mt-4">
            <Button onClick={loadSettlements} variant="outline">
              {t('receipt.upload.retry')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const totalDebts = balances.filter(b => b.balance < 0).reduce((sum, b) => sum + Math.abs(b.balance), 0)
  const totalCredits = balances.filter(b => b.balance > 0).reduce((sum, b) => sum + b.balance, 0)
  const completedSettlements = settlements.filter(s => s.status === 'completed').length
  const pendingSettlements = settlements.filter(s => s.status === 'pending').length

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
            {t('settlement.title')}
          </h2>
          <p className="text-neutral-600 mt-1 text-sm sm:text-base">
            방 정산 및 송금 관리
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={handleRecalculate}
            loading={recalculating}
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            className="text-sm sm:text-base whitespace-nowrap"
          >
            {t('common.recalculate')}
          </Button>
          {onBack && (
            <Button 
              onClick={onBack} 
              variant="outline"
              className="text-sm sm:text-base whitespace-nowrap"
            >
              {t('common.backToRoom')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center">
            <Calculator className="w-8 h-8 text-primary-600 mr-3" />
            <div>
              <p className="text-sm text-neutral-600">총 정산 금액</p>
              <p className="text-2xl font-bold text-neutral-900">
                {formatCurrency(totalDebts, 'KRW')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-secondary-600 mr-3" />
            <div>
              <p className="text-sm text-neutral-600">완료된 정산</p>
              <p className="text-2xl font-bold text-neutral-900">
                {completedSettlements}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-neutral-600">대기중인 정산</p>
              <p className="text-2xl font-bold text-neutral-900">
                {pendingSettlements}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center">
            <ArrowRight className="w-8 h-8 text-accent-600 mr-3" />
            <div>
              <p className="text-sm text-neutral-600">송금 건수</p>
              <p className="text-2xl font-bold text-neutral-900">
                {transactions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Balances */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-neutral-900 mb-4">
            참여자별 잔액
          </h3>
          
          {balances.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500">아직 정산 내역이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {balances.map((balance, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-neutral-100">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      balance.balance > 0 ? 'bg-secondary-500' : 
                      balance.balance < 0 ? 'bg-accent-500' : 'bg-neutral-400'
                    }`} />
                    <span className="font-medium">{balance.participantName}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      balance.balance > 0 ? 'text-secondary-600' : 
                      balance.balance < 0 ? 'text-accent-600' : 'text-neutral-600'
                    }`}>
                      {balance.balance > 0 ? '+' : ''}
                      {formatCurrency(balance.balance, 'KRW')}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {balance.balance > 0 ? '받을 금액' : 
                       balance.balance < 0 ? '보낼 금액' : '정산 완료'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optimal Transactions */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-neutral-900 mb-4">
            최적 송금 방법
          </h3>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500">송금할 내역이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div key={index} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="font-medium text-neutral-900">
                        {transaction.fromName}
                      </span>
                      <ArrowRight className="w-4 h-4 text-neutral-400 mx-2" />
                      <span className="font-medium text-neutral-900">
                        {transaction.toName}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-primary-600">
                      {formatCurrency(transaction.amount, 'KRW')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center px-2 py-1 rounded text-xs ${
                      getStatusDisplay(transaction.status).bg
                    }`}>
                      <span className={getStatusDisplay(transaction.status).color}>
                        {getStatusDisplay(transaction.status).text}
                      </span>
                    </div>
                    
                    {transaction.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsPaid(transaction.id)}
                        leftIcon={<CheckCircle className="w-3 h-3" />}
                      >
                        완료 처리
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settlement History */}
      {settlements.length > 0 && (
        <div className="mt-8 bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-neutral-900 mb-4">
            정산 내역
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">영수증</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">총액</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">분할 방식</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">상태</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">생성일</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => (
                  <tr key={settlement.id} className="border-b border-neutral-100">
                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-900">
                        영수증 #{settlement.receiptId}
                      </div>
                      <div className="text-sm text-neutral-600">
                        {settlement.receiptItems} 항목
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">
                        {formatCurrency(settlement.totalAmount, 'KRW')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-neutral-600">
                        {settlement.splitType === 'equal' ? '균등분할' :
                         settlement.splitType === 'custom' ? '항목별' : '수동입력'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                        getStatusDisplay(settlement.status).bg
                      }`}>
                        {React.createElement(getStatusDisplay(settlement.status).icon, {
                          className: `w-3 h-3 mr-1 ${getStatusDisplay(settlement.status).color}`
                        })}
                        <span className={getStatusDisplay(settlement.status).color}>
                          {getStatusDisplay(settlement.status).text}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-600">
                      {new Date(settlement.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settlement