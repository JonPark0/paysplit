import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, 
  ArrowLeft, 
  Lock, 
  Eye, 
  Database, 
  FileText, 
  Clock, 
  Users, 
  AlertCircle,
  CheckCircle
} from 'lucide-react'

import Button from '../components/common/Button'
import { useSettingsStore } from '../stores/settingsStore'

const PrivacyPolicyPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()

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
            <h1 className="text-2xl font-bold text-neutral-900">개인정보 처리방침</h1>
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
              <Shield className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">개인정보 보호</h2>
              <p className="text-neutral-600">PaySplit 개인정보 처리방침</p>
            </div>
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-primary-800 text-sm">
              <strong>최종 업데이트:</strong> 2024년 12월<br />
              <strong>적용 범위:</strong> PaySplit 서비스 (paysplit.nphani.com)
            </p>
          </div>
        </div>

        {/* Data Collection */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center mr-3">
              <Database className="w-5 h-5 text-secondary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">수집하는 정보</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">필수 수집 정보</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>참가자 이름:</strong> 방 내에서 사용할 표시명</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>비밀번호:</strong> 방 접근 인증용 (해시화 저장)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>영수증 이미지:</strong> 업로드한 영수증 사진 (암호화 저장)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>분할 정보:</strong> 비용 분할 및 정산 데이터</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-neutral-900 mb-2">자동 수집 정보</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>활동 로그:</strong> 방 내 활동 기록 (보안 및 감사 목적)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>세션 정보:</strong> 로그인 상태 유지를 위한 임시 토큰</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>기술적 정보:</strong> 브라우저 유형, 언어 설정 등</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Data Usage */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
              <Eye className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">정보 이용 목적</h3>
          </div>
          
          <ul className="space-y-3 text-neutral-700">
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>서비스 제공:</strong> 비용 분할 및 정산 계산 기능</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>사용자 인증:</strong> 방 접근 권한 확인 및 보안 유지</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>OCR 처리:</strong> 영수증 자동 분석 및 데이터 추출</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>활동 추적:</strong> 방 내 변경사항 기록 및 투명성 보장</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>기술적 개선:</strong> 서비스 안정성 및 성능 향상</span>
            </li>
          </ul>
        </div>

        {/* Data Security */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center mr-3">
              <Lock className="w-5 h-5 text-accent-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">보안 조치</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">데이터 보호</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>암호화 저장:</strong> 업로드된 모든 파일은 AES-256 암호화</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>비밀번호 해시:</strong> BCrypt 12 라운드 해싱 적용</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>HTTPS 통신:</strong> 모든 데이터 전송 시 SSL/TLS 암호화</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>접근 제어:</strong> 방 코드 및 비밀번호 기반 인증</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-neutral-900 mb-2">기술적 보안</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>CSP 헤더:</strong> 콘텐츠 보안 정책 적용</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Rate Limiting:</strong> 무차별 대입 공격 방지</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>reCAPTCHA:</strong> 자동화된 공격 차단</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>세션 관리:</strong> JWT 토큰 기반 안전한 세션 처리</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Data Retention */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center mr-3">
              <Clock className="w-5 h-5 text-secondary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">데이터 보관 및 삭제</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-4 h-4 text-secondary-600 mr-2" />
                <h4 className="font-medium text-secondary-900">자동 삭제 정책</h4>
              </div>
              <p className="text-secondary-800 text-sm">
                모든 방 데이터는 <strong>정산 완료 후 1개월</strong> 뒤 자동으로 영구 삭제됩니다.
              </p>
            </div>

            <ul className="space-y-2 text-neutral-700">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>영수증 이미지:</strong> 암호화된 파일 완전 삭제</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>개인정보:</strong> 참가자 이름, 비밀번호 등 모든 개인정보 삭제</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>활동 로그:</strong> 방 관련 모든 활동 기록 삭제</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>세션 정보:</strong> 임시 토큰 및 인증 정보 삭제</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Data Sharing */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">정보 공유 및 제공</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Shield className="w-4 h-4 text-primary-600 mr-2" />
                <h4 className="font-medium text-primary-900">개인정보 제3자 제공 없음</h4>
              </div>
              <p className="text-primary-800 text-sm">
                PaySplit은 사용자의 개인정보를 외부 업체나 제3자에게 제공하지 않습니다.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-neutral-900 mb-2">방 내 정보 공유</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>참가자 이름:</strong> 같은 방 참가자들에게만 표시</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>분할 정보:</strong> 관련 참가자들에게만 표시</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>활동 로그:</strong> 방 관리자만 열람 가능</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* User Rights */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center mr-3">
              <FileText className="w-5 h-5 text-accent-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">사용자 권리</h3>
          </div>
          
          <ul className="space-y-3 text-neutral-700">
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>데이터 조회:</strong> 방 내에서 본인 관련 정보 열람</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>데이터 수정:</strong> 본인이 업로드한 영수증 편집</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>데이터 삭제:</strong> 방 나가기를 통한 개인정보 삭제</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>데이터 이동:</strong> 방 관리자의 아카이브 다운로드</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>처리 거부:</strong> 언제든지 방에서 나가기 가능</span>
            </li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="bg-neutral-100 rounded-lg border border-neutral-200 p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center mr-3">
              <AlertCircle className="w-5 h-5 text-neutral-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">정책 변경 및 문의</h3>
          </div>
          
          <div className="space-y-4 text-neutral-700">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">정책 변경 통지</h4>
              <p className="text-sm">
                개인정보 처리방침이 변경되는 경우, 변경사항을 서비스 내 공지사항으로 안내합니다.
                중요한 변경사항의 경우 방 접속 시 별도 안내를 제공합니다.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">문의 및 요청</h4>
              <p className="text-sm">
                개인정보 처리와 관련한 문의사항이나 권리 행사 요청은 방 관리자를 통해 처리됩니다.
                기술적 문제나 보안 관련 문의는 서비스 개발팀으로 직접 연락 가능합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Button
            onClick={() => navigate(`/${language}`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicyPage
