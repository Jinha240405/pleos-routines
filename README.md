# Pleos Routines

**운전자가 직접 만드는 차량용 단축어.**

Apple 단축어처럼 트리거, 데이터, 연산, 분기, 반복, 차량 기능과 외부 서비스를 블록으로 조합하는 Pleos Connect용 자동화 앱 프로젝트입니다.

AND/OR만 있는 규칙 앱이나 고정 템플릿 모음으로 한정하지 않습니다. 변수를 연결하고, 조건 안에서 반복하고, 블록 결과를 다음 동작의 입력으로 쓰는 확장 가능한 제작 도구를 목표로 합니다. **Gleo 연동은 후순위**입니다.

## 문서

- [제품 방향과 블록 체계](VISION.md) — 가장 최근 사용자 결정
- [공모전·경쟁 서비스·사업성 검토](ROUTINES.md) — 초기 검토, 범위는 VISION.md 우선
- [개발 환경과 실행 방법](SETUP.md)
- [API 실행 검증 기록](VERIFICATION.md)

## 현재 상태

- 기획과 Android 개발 환경을 준비했습니다.
- Vehicle SDK 2.3.2를 사용한 진단 앱 소스가 있습니다.
- Pleos Connect 2.1.0 / Android 14 에뮬레이터 부팅과 Virtual Console 연결을 확인했습니다.
- 블록 제작 도구는 개발 중입니다. 목표 기능과 구현 완료 기능을 구분합니다.
- 차량 API는 실제 capability와 권한을 검사해 사용합니다. 모든 차량 기능이 제3자 앱에 개방되어 있다고 가정하지 않습니다.

## 기술 기준

Kotlin 2.0.0 · JDK 17 · Gradle 8.10.2 · AGP 8.8.2 · compileSdk 35 · minSdk 28 · targetSdk 34.

일반 Android 환경에서는 이 폴더를 Android Studio로 열고 SDK 경로를 local.properties에 설정하거나 ANDROID_HOME을 지정한 후 ./gradlew assembleDebug로 빌드합니다. 이 작업 PC의 격리된 도구 환경은 SETUP.md를 참고하세요.

## 참고

- [Pleos 시작 가이드](https://document.pleos.ai/docs/pleos-only/getting-started)
- [Vehicle SDK](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/intro)
- [공식 Vehicle 샘플](https://github.com/Pleos-Playground/pleos-sample-vehicle-app)

Pleos Routines는 공모전 개발 프로젝트의 임시 이름이며 Hyundai/Pleos의 공식 제품이 아닙니다.
