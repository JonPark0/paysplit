import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, 
  ArrowLeft, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Clock, 
  Zap,
  XCircle,
  Info,
  Scale
} from 'lucide-react'

import Button from '../components/common/Button'
import { useSettingsStore } from '../stores/settingsStore'

const TermsOfServicePage = () => {
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
            <h1 className="text-2xl font-bold text-neutral-900">이용약관</h1>
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
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">서비스 이용약관</h2>
              <p className="text-neutral-600">PaySplit 서비스 이용에 관한 약관</p>
            </div>
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-primary-800 text-sm">
              <strong>최종 업데이트:</strong> 2024년 12월<br />
              <strong>적용 범위:</strong> PaySplit 서비스 (paysplit.nphani.com)<br />
              <strong>언어:</strong> 한국어, 영어 지원
            </p>
          </div>
        </div>

        {/* Service Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center mr-3">
              <Info className="w-5 h-5 text-secondary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">서비스 개요</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">PaySplit 서비스</h4>
              <p className="text-neutral-700 leading-relaxed">
                PaySplit은 그룹 내 비용 분할 및 정산을 위한 웹 기반 서비스입니다. 
                사용자들은 방을 생성하여 영수증을 업로드하고, AI OCR 기술을 활용하여 
                자동으로 항목을 분석하며, 최적의 정산 계획을 계산할 수 있습니다.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-neutral-900 mb-2">서비스 특징</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>AI OCR 분석:</strong> 영수증 자동 인식 및 데이터 추출</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>최적 정산 계산:</strong> 최소 송금 횟수로 정산 완료</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>실시간 협업:</strong> 다중 사용자 동시 편집 지원</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>데이터 보안:</strong> 암호화 저장 및 자동 삭제</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Terms of Use */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
              <Scale className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">이용 조건</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">서비스 이용 자격</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>만 14세 이상의 개인 또는 법인</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>정확한 정보 제공 및 본인 인증</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>이용약관 및 개인정보 처리방침 동의</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>관련 법령 및 규정 준수</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-neutral-900 mb-2">서비스 이용 방법</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>방 생성:</strong> 새로운 정산 방 만들기</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>방 참가:</strong> 입장 코드를 통한 기존 방 참가</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>영수증 업로드:</strong> 이미지 파일 업로드 및 OCR 처리</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>비용 분할:</strong> 항목별 참가자 선택 및 금액 배분</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>정산 완료:</strong> 계산된 송금 계획 실행 및 상태 업데이트</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* User Responsibilities */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-accent-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">사용자 의무</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">준수 사항</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>정확한 정보 제공:</strong> 영수증 및 분할 정보의 정확성</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>비밀번호 관리:</strong> 개인 계정 보안 유지</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>적절한 사용:</strong> 서비스 목적에 맞는 이용</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>타인 권리 존중:</strong> 다른 사용자 개인정보 보호</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-neutral-900 mb-2">금지 행위</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <XCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>시스템 남용:</strong> 서비스 안정성을 해치는 행위</span>
                </li>
                <li className="flex items-start">
                  <XCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>허위 정보:</strong> 고의적인 잘못된 정보 입력</span>
                </li>
                <li className="flex items-start">
                  <XCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>무단 접근:</strong> 다른 사용자의 방 무단 침입</span>
                </li>
                <li className="flex items-start">
                  <XCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>상업적 이용:</strong> 영리 목적의 무단 사용</span>
                </li>
                <li className="flex items-start">
                  <XCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>법령 위반:</strong> 관련 법률 및 규정 위반</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Service Limitations */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-secondary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">서비스 제한</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">기술적 제한</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>OCR 정확도:</strong> 영수증 상태에 따른 인식률 차이</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>파일 크기:</strong> 업로드 파일 크기 제한</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>동시 접속:</strong> 서버 성능에 따른 접속 제한</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>브라우저 호환:</strong> 모던 브라우저 환경 필요</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-neutral-900 mb-2">서비스 중단</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>정기 점검:</strong> 서비스 개선을 위한 정기 점검</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>긴급 조치:</strong> 보안 또는 안정성 문제 발생시</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>외부 요인:</strong> 네트워크 장애, 서버 오류 등</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>사전 통지:</strong> 가능한 한 사전 공지 후 중단</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
              <Clock className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">데이터 관리</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Shield className="w-4 h-4 text-primary-600 mr-2" />
                <h4 className="font-medium text-primary-900">자동 삭제 정책</h4>
              </div>
              <p className="text-primary-800 text-sm">
                모든 방 데이터는 정산 완료 후 <strong>1개월</strong> 뒤 자동으로 삭제됩니다. 
                필요한 경우 삭제 전에 아카이브를 다운로드하세요.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-neutral-900 mb-2">데이터 백업</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>아카이브 다운로드:</strong> 방 관리자 권한으로 전체 데이터 백업</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>개별 영수증:</strong> 각 영수증별 개별 다운로드</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>정산 기록:</strong> 최종 정산 결과 및 과정 저장</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>활동 로그:</strong> 방 내 모든 활동 기록 보관</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-accent-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">면책 조항</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">서비스 제공자 책임 제한</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>OCR 정확성:</strong> 자동 인식 결과의 정확성 보장하지 않음</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>정산 분쟁:</strong> 사용자 간 정산 분쟁에 대한 책임 없음</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>데이터 손실:</strong> 기술적 문제로 인한 데이터 손실 가능</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>서비스 중단:</strong> 예기치 못한 서비스 중단 가능</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-neutral-900 mb-2">사용자 책임</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>데이터 검증:</strong> 입력 및 분석 결과의 정확성 확인</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>백업 관리:</strong> 중요 데이터의 별도 백업 보관</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>실제 정산:</strong> 계산 결과 기반 실제 송금 실행</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-accent-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>분쟁 해결:</strong> 참가자 간 분쟁 자율 해결</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Terms Changes */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center mr-3">
              <Zap className="w-5 h-5 text-secondary-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">약관 변경</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">변경 절차</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>사전 공지:</strong> 변경 내용 7일 전 서비스 내 공지</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>중요 변경:</strong> 실질적 변경시 30일 전 개별 통지</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>동의 간주:</strong> 변경 후 서비스 이용 시 동의로 간주</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>거부 권리:</strong> 변경 거부 시 서비스 이용 중단 가능</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-neutral-900 mb-2">효력 및 해석</h4>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>우선 순위:</strong> 개별 약정 &gt; 이용약관 &gt; 관련 법령</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>준거법:</strong> 대한민국 법률 적용</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>관할 법원:</strong> 서비스 제공자 소재지 법원</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-secondary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>부분 무효:</strong> 일부 조항 무효시 나머지 조항 유효</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-neutral-100 rounded-lg border border-neutral-200 p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center mr-3">
              <Info className="w-5 h-5 text-neutral-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">문의 및 지원</h3>
          </div>
          
          <div className="space-y-4 text-neutral-700">
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">서비스 문의</h4>
              <p className="text-sm">
                서비스 이용에 관한 문의사항이나 약관 관련 질문은 방 관리자를 통해 
                처리하거나 도움말 페이지를 참고하시기 바랍니다.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-neutral-900 mb-2">분쟁 해결</h4>
              <p className="text-sm">
                서비스 이용 중 발생하는 분쟁은 상호 협의를 통해 해결하며, 
                협의가 불가능한 경우 관련 법령에 따라 해결합니다.
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

export default TermsOfServicePage