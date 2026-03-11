import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  HelpCircle, 
  ArrowLeft, 
  Upload, 
  Edit3, 
  Calculator, 
  Users, 
  Settings, 
  CreditCard,
  FileText,
  Shield,
  Camera,
  ChevronRight,
  Check,
  AlertCircle,
  Info
} from 'lucide-react'

import Button from '../components/common/Button'
import { useSettingsStore } from '../stores/settingsStore'

const HelpPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()

  const helpSections = [
    {
      id: 'getting-started',
      title: '시작하기',
      icon: <HelpCircle className="w-6 h-6" />,
      items: [
        {
          question: '방을 만들려면 어떻게 해야 하나요?',
          answer: '홈 화면에서 "새 방 만들기" 버튼을 클릭하고, 방 이름과 관리자 이름, 비밀번호를 입력하세요. 방이 생성되면 다른 사람들과 공유할 수 있는 입장 코드가 생성됩니다.'
        },
        {
          question: '방에 참가하려면 어떻게 해야 하나요?',
          answer: '홈 화면에서 "방 참가하기" 버튼을 클릭하고, 입장 코드와 사용할 이름, 비밀번호를 입력하세요. 이미 같은 이름으로 참가한 적이 있다면 기존 비밀번호를 사용하세요.'
        },
        {
          question: '비밀번호를 잊어버렸어요',
          answer: '비밀번호는 보안상 서버에 저장되지 않습니다. 방 관리자에게 문의하여 새로운 이름으로 참가하거나, 방을 다시 만들어야 합니다.'
        }
      ]
    },
    {
      id: 'receipts',
      title: '영수증 관리',
      icon: <FileText className="w-6 h-6" />,
      items: [
        {
          question: '영수증을 업로드하려면 어떻게 해야 하나요?',
          answer: '방 화면에서 "영수증 추가" 버튼을 클릭하고, 사진을 찍거나 갤러리에서 선택하세요. AI가 자동으로 내용을 분석하여 항목과 가격을 추출합니다.'
        },
        {
          question: 'OCR 인식이 정확하지 않아요',
          answer: '사진이 흐리거나 각도가 기울어진 경우 인식률이 떨어질 수 있습니다. 깨끗하고 정면에서 촬영한 사진을 사용하고, 인식 결과를 검토하여 필요시 수정하세요.'
        },
        {
          question: '수동으로 영수증을 입력할 수 있나요?',
          answer: '네, 영수증 업로드 화면에서 "직접 입력" 옵션을 선택하여 항목명, 가격, 수량을 직접 입력할 수 있습니다.'
        },
        {
          question: '영수증을 삭제하려면 어떻게 해야 하나요?',
          answer: '방 관리자만 영수증을 삭제할 수 있습니다. 영수증 목록에서 삭제하고자 하는 영수증을 선택하고 삭제 버튼을 클릭하세요.'
        }
      ]
    },
    {
      id: 'splitting',
      title: '비용 분할',
      icon: <Calculator className="w-6 h-6" />,
      items: [
        {
          question: '비용을 어떻게 분할하나요?',
          answer: '각 영수증 항목에 대해 참가자들을 선택하여 비용을 분할할 수 있습니다. 동일하게 나누거나, 비율에 따라 분할하거나, 특정 금액을 지정할 수 있습니다.'
        },
        {
          question: '정산은 어떻게 이루어지나요?',
          answer: '모든 분할이 완료되면 "정산 계산" 버튼을 클릭하여 최적의 정산 방법을 계산할 수 있습니다. 누가 누구에게 얼마를 송금해야 하는지 자동으로 계산됩니다.'
        },
        {
          question: '정산 상태를 변경하려면 어떻게 해야 하나요?',
          answer: '정산을 받을 사람만 해당 정산의 상태를 "정산완료"로 변경할 수 있습니다. 정산 목록에서 해당 항목을 클릭하여 상태를 변경하세요.'
        }
      ]
    },
    {
      id: 'room-management',
      title: '방 관리',
      icon: <Settings className="w-6 h-6" />,
      items: [
        {
          question: '방 관리자는 무엇을 할 수 있나요?',
          answer: '방 관리자는 영수증 삭제, 방 설정 변경, 활동 로그 확인, 데이터 아카이브 다운로드 등의 권한을 가집니다.'
        },
        {
          question: '방에서 나가려면 어떻게 해야 하나요?',
          answer: '방 화면에서 설정 버튼을 클릭하고 "방 나가기" 탭을 선택하세요. 방 이름을 정확히 입력하여 확인해야 합니다.'
        },
        {
          question: '관리자가 방을 나가면 어떻게 되나요?',
          answer: '관리자가 방을 나가면 가장 먼저 참가한 다른 참가자에게 관리자 권한이 자동으로 이전됩니다.'
        },
        {
          question: '방 데이터를 다운로드할 수 있나요?',
          answer: '방 관리자는 설정 페이지에서 방의 모든 데이터를 JSON 형식으로 다운로드할 수 있습니다.'
        }
      ]
    },
    {
      id: 'security',
      title: '보안 및 프라이버시',
      icon: <Shield className="w-6 h-6" />,
      items: [
        {
          question: '내 데이터는 안전한가요?',
          answer: '모든 업로드된 파일은 암호화되어 저장되며, 비밀번호는 해시화되어 저장됩니다. 정산 완료 후 1개월 뒤 자동으로 삭제됩니다.'
        },
        {
          question: '다른 사람이 내 방에 접근할 수 있나요?',
          answer: '방 입장 코드와 비밀번호를 모르는 사람은 방에 접근할 수 없습니다. 입장 코드를 안전하게 관리하세요.'
        },
        {
          question: '데이터는 언제 삭제되나요?',
          answer: '정산이 완료되고 1개월 후 모든 방 데이터가 자동으로 삭제됩니다. 필요하다면 삭제 전에 데이터를 다운로드하세요.'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: '문제 해결',
      icon: <AlertCircle className="w-6 h-6" />,
      items: [
        {
          question: '영수증 업로드가 안 돼요',
          answer: '파일 크기가 너무 크거나, 지원하지 않는 형식일 수 있습니다. JPEG, PNG, WebP 형식의 이미지를 사용하세요. 인터넷 연결도 확인해주세요.'
        },
        {
          question: '정산 계산이 안 돼요',
          answer: '모든 영수증 항목이 분할되어 있는지 확인하세요. 분할되지 않은 항목이 있으면 정산 계산을 할 수 없습니다.'
        },
        {
          question: '방에 접속할 수 없어요',
          answer: '입장 코드와 비밀번호를 다시 확인하세요. 방이 이미 삭제되었거나 일시적인 서버 문제일 수 있습니다.'
        },
        {
          question: '앱이 느려요',
          answer: '브라우저 캐시를 삭제하거나 페이지를 새로고침해보세요. 많은 영수증이 있는 경우 로딩 시간이 길어질 수 있습니다.'
        }
      ]
    }
  ]

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleGoBack}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="text-neutral-600 hover:text-neutral-900"
            >
              뒤로
            </Button>
            <h1 className="text-2xl font-bold text-neutral-900">도움말</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
              <HelpCircle className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">PaySplit 도움말</h2>
              <p className="text-neutral-600">영수증 분할과 정산을 쉽게 관리하세요</p>
            </div>
          </div>
          <p className="text-neutral-700 leading-relaxed">
            PaySplit은 친구들과 함께 식사하거나 여행할 때 발생하는 비용을 쉽게 분할하고 정산할 수 있는 서비스입니다. 
            AI OCR 기술을 활용하여 영수증을 자동으로 분석하고, 최적의 정산 방법을 계산해드립니다.
          </p>
        </div>

        {/* Help Sections */}
        <div className="space-y-6">
          {helpSections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow-sm border border-neutral-200">
              <div className="p-6 border-b border-neutral-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                    {section.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">{section.title}</h3>
                </div>
              </div>
              
              <div className="divide-y divide-neutral-200">
                {section.items.map((item, index) => (
                  <div key={index} className="p-6">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-secondary-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        <Info className="w-4 h-4 text-secondary-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-neutral-900 mb-2">{item.question}</h4>
                        <p className="text-neutral-700 leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="bg-primary-50 rounded-lg border border-primary-200 p-6 mt-8">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
              <HelpCircle className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-primary-900">추가 도움이 필요하신가요?</h3>
          </div>
          <p className="text-primary-800 mb-4">
            위의 내용으로 문제가 해결되지 않으셨다면, 다음과 같은 방법으로 도움을 받으실 수 있습니다:
          </p>
          <div className="space-y-2 text-primary-700">
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2" />
              <span>방 관리자에게 문의</span>
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2" />
              <span>브라우저 캐시 삭제 후 재시도</span>
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2" />
              <span>다른 브라우저나 기기에서 접속</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">빠른 시작</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/${language}`)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="justify-start"
            >
              홈으로 돌아가기
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/${language}/features`)}
              leftIcon={<Camera className="w-4 h-4" />}
              className="justify-start"
            >
              기능 살펴보기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage
