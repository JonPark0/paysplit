import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calculator, ArrowRight, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { roomAPI } from '../../services/api'
import { formatCurrency } from '../../utils/currency'

interface BalanceItem {
  id?: string
  name?: string
  participantName?: string
  balance: number
}

interface TransactionItem {
  id?: string
  fromName?: string
  toName?: string
  amount: number
  status: 'pending' | 'completed' | string
}

const Settlement = ({ roomId, onBack }) => {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [settlements, setSettlements] = useState([])
  const [balances, setBalances] = useState<BalanceItem[]>([])
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [totalReceiptAmount, setTotalReceiptAmount] = useState(0)
  const [error, setError] = useState(null)
  const [recalculating, setRecalculating] = useState(false)

  const toNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  // Load settlement data
  useEffect(() => {
    loadSettlements()
  }, [roomId])

  const loadSettlements = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await roomAPI.getSettlements(roomId)

      const normalizedBalances: BalanceItem[] = (response.balances || []).map((item) => {
        const row = item as Record<string, unknown>
        return {
          id: typeof row.id === 'string' ? row.id : undefined,
          name: typeof row.name === 'string' ? row.name : undefined,
          participantName: typeof row.participantName === 'string' ? row.participantName : undefined,
          balance: toNumber(row.balance)
        }
      })

      const normalizedTransactions: TransactionItem[] = (response.transactions || []).map((item) => {
        const row = item as Record<string, unknown>
        return {
          id: typeof row.id === 'string' ? row.id : undefined,
          fromName: typeof row.fromName === 'string' ? row.fromName : undefined,
          toName: typeof row.toName === 'string' ? row.toName : undefined,
          amount: toNumber(row.amount),
          status: typeof row.status === 'string' ? row.status : 'pending'
        }
      })
      
      setSettlements(response.settlements || [])
      setBalances(normalizedBalances)
      setTransactions(normalizedTransactions)
      setTotalReceiptAmount(response.totalReceiptAmount || 0)
    } catch (error) {
      console.error('Failed to load settlements:', error)
      setError(error.message || t('settlement.loadError'))
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
      
      toast.success(t('settlement.recalculated'))
    } catch (error) {
      console.error('Failed to recalculate settlements:', error)
      toast.error(error.message || t('settlement.recalculateError'))
    } finally {
      setRecalculating(false)
    }
  }

  // Mark settlement as paid
  const handleMarkAsPaid = async (settlementId) => {
    try {
      await roomAPI.markSettlementAsPaid(roomId, settlementId)
      await loadSettlements()
      
      toast.success(t('settlement.markPaidSuccess'))
    } catch (error) {
      console.error('Failed to mark settlement as paid:', error)
      toast.error(error.message || t('settlement.markPaidError'))
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
          text: t('settlement.completed')
        }
      case 'pending':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          icon: Clock,
          text: t('settlement.pending')
        }
      default:
        return {
          color: 'text-neutral-600',
          bg: 'bg-neutral-50',
          icon: AlertCircle,
          text: t('settlement.unknown')
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
            {t('settlement.subtitle')}
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
              <p className="text-sm text-neutral-600">{t('settlement.totalReceiptAmount')}</p>
              <p className="text-2xl font-bold text-neutral-900">
                {formatCurrency(totalReceiptAmount, 'KRW')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-secondary-600 mr-3" />
            <div>
              <p className="text-sm text-neutral-600">{t('settlement.completedCount')}</p>
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
              <p className="text-sm text-neutral-600">{t('settlement.pendingCount')}</p>
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
              <p className="text-sm text-neutral-600">{t('settlement.transferCount')}</p>
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
            {t('settlement.participantBalances')}
          </h3>
          
          {balances.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500">{t('settlement.noBalances')}</p>
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
                    <span className="font-medium">{balance.participantName || balance.name || '-'}</span>
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
                      {balance.balance > 0 ? t('settlement.receiveAmount') : 
                       balance.balance < 0 ? t('settlement.sendAmount') : t('settlement.balance.settled')}
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
            {t('settlement.optimalTransfers')}
          </h3>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500">{t('settlement.noTransactions')}</p>
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
                    
                    {transaction.status === 'pending' && transaction.id && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsPaid(transaction.id)}
                        leftIcon={<CheckCircle className="w-3 h-3" />}
                      >
                        {t('settlement.markComplete')}
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
            {t('settlement.history')}
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('settlement.table.receipt')}</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('settlement.table.total')}</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('settlement.table.splitMethod')}</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('settlement.table.status')}</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('settlement.table.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => (
                  <tr key={settlement.id} className="border-b border-neutral-100">
                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-900">
                        {t('settlement.table.receiptLabel', { id: settlement.receiptId })}
                      </div>
                      <div className="text-sm text-neutral-600">
                        {t('settlement.table.itemCount', { count: settlement.receiptItems })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">
                        {formatCurrency(settlement.totalAmount, 'KRW')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-neutral-600">
                        {settlement.splitType === 'equal' ? t('split.method.equal') :
                         settlement.splitType === 'custom' ? t('settlement.table.itemized') : t('split.method.manual')}
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
