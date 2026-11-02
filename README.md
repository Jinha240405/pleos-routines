# Pleos Routines

운전자가 시작·조건·동작 카드를 연결해 만드는 차량용 루틴. React 카드 편집기, 데이터 기반 실행 엔진, 차량 시뮬레이터와 Android 오프라인 앱을 구현했습니다.

## 실행

```powershell
npm ci
npm run dev
```

브라우저: http://127.0.0.1:5173

```powershell
# JDK 17 / Android SDK가 없는 경우
./scripts/setup-toolchain.ps1
# Android APK (웹 편집기도 함께 빌드)
./build.ps1
# 실행 중인 에뮬레이터에 설치
./build.ps1 -Install
```

## 구현한 기능

- 시작·조건·동작 카드, 조건 분기, 반복, 값·연산, 변수, 알림/TTS. 기존 22종 데이터 형식과 호환.
- 카드 클릭으로 설정 편집, 동작 추가, 카드 드래그/메뉴로 순서 변경, 복제·삭제·사용 설정, 실행 취소/다시 실행.
- 출발·쾌적함·충전·도착 12개 템플릿, 루틴 저장·복제·삭제, JSON 가져오기/내보내기.
- 조건은 상태 → 비교 방식 → 기준값으로 편집하고 여러 조건은 모두/하나라도 맞으면으로 연결합니다. 조회 결과와 그 세부 항목을 이름 입력 없이 바로 조건·동작에 사용할 수 있습니다.
- 테스트 설정과 기록은 버튼으로 여는 대화상자에 모았습니다. 편집기에는 상시 사이드바가 없습니다.
- 가상 온도·배터리·도어·속도 입력, 공조·풍량 결과, 실행 기록과 변수 확인.
- 실행/중지, 단계별 강조, 잘못된 입력·반복 횟수·실행 시간 제한.
- React + shadcn/ui + Tailwind CSS. Pleos 중립 색상과 파란 강조색, Asta Sans 로컬 폰트.
- APK는 같은 편집기를 오프라인 WebView로 제공합니다. 원격 웹페이지나 임의 JS를 실행하지 않습니다.

테스트 차량은 **시뮬레이션**입니다. Android의 Pleos 연결은 Vehicle·AAOS·Location·Navi·STT·TTS·Gleo 브리지를 사용합니다. 카탈로그 510개 항목을 노출하지만 실제 차량별 지원·권한은 다르며, 실제 오류를 데모 성공으로 대체하지 않습니다. Gleo는 별도 스키마 승인이 필요합니다. 백그라운드 자동화·실차 검증은 완료하지 않았습니다.

## 검증과 문서

```powershell
npm test
npm run test:ui
npm run build
npm run test:production
```

- [현재 디자인 시스템 / 색상·한글 기준](docs/PLEOS-DESIGN.md)
- [간단한 조건·조회 결과 연결 설계](docs/SIMPLE-CONDITIONS.md)
- [카드 편집기 설계](docs/CARD-EDITOR.md)
- [검증 기록](VERIFICATION.md)
- [구조와 실행 범위](docs/ARCHITECTURE.md)
- [공모전 공식 요건 정리](docs/CONTEST.md)
- [개발 환경](SETUP.md)
- [제품 방향](VISION.md)
- [오픈소스 고지](THIRD_PARTY_NOTICES.md)

Kotlin 2.0 · JDK 17 · Gradle 8.10.2 · compileSdk 35 · minSdk 28 · targetSdk 34 · Vehicle SDK 2.3.2.
