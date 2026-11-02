# Pleos 개발 환경

2026-11-02 Windows 11 환경에 구성했습니다. 앱 주제는 **운전자가 차량 자동화를 만들고 공유하는 앱**이며, 이 프로젝트는 제품 구현에 앞서 SDK 연결을 검증하는 조회 전용 시작점입니다.

## 현재 구성

| 항목 | 설치 버전 / 설정 |
| --- | --- |
| Android Studio | Rabbit 2 · 2026.2.2.8, 작업 폴더에 설치 |
| 빌드 JDK | Temurin 17.0.20.1+1 |
| Android SDK | API 34 / 35, Build Tools 35.0.0 |
| Gradle / AGP / Kotlin | 8.10.2 / 8.8.2 / 2.0.0 |
| Pleos Vehicle SDK | 2.3.2 |
| Pleos 시스템 이미지 | Connect v2.1.0, Android 14, x86_64 |
| AVD | `Pleos_Connect_v2_1`, RAM 4096 MB, Cold Boot |
| 하드웨어 가속 | WHPX 정상 확인 |

Android Studio, JDK, 명령줄 도구는 게시된 SHA-256을, Pleos 이미지는 배포 메타데이터의 SHA-1을 확인했습니다. 설치 도구·SDK·Gradle 캐시는 작업 폴더의 `work/android-toolchain`에 있습니다. Windows 전역 PATH와 기존 개발 도구 설정은 변경하지 않았습니다.

## 실행

PowerShell에서 이 README가 있는 폴더로 이동한 뒤 실행합니다.

```powershell
# IDE 열기
./open-studio.ps1

# 에뮬레이터 실행 — 처음 부팅은 몇 분 걸릴 수 있습니다.
./start-emulator.ps1

# Virtual Console 연결 — 에뮬레이터 부팅 후 별도 터미널에서 실행
./console.ps1

# APK 빌드
./build.ps1

# 빌드 + 실행 중인 에뮬레이터에 설치
./build.ps1 -Install
```

Virtual Console 주소는 `http://127.0.0.1:8088/`입니다. 기어·도어·창문·배터리·공조 등의 가상 상태를 바꿔 테스트할 수 있습니다. 콘솔에서 바꿀 수 있는 기능이 모두 앱의 공개 SDK에서 제공된다는 뜻은 아닙니다.

16 GB PC에서 IDE·브라우저·에뮬레이터를 동시에 실행하면 메모리가 빠듯합니다. 실행 스크립트는 여유 RAM 5 GB를 권장하며, 사용자가 상태를 확인하고 실행하려면 `./start-emulator.ps1 -AllowLowMemory`를 사용할 수 있습니다. 재부팅 뒤 이 옵션에 해당하는 설정으로 실제 부팅을 확인했습니다.

## 확인 결과

- Pleos AVD 등록 및 Android 14 부팅 완료(`sys.boot_completed=1`).
- ADB 연결 완료, 실제 인포테인먼트 화면 캡처: `screenshots/pleos-home.png`.
- Virtual Console HTTP 200 및 ADB 포트 포워딩 확인.
- 앱 빌드와 SDK 조회 결과는 `VERIFICATION.md`에 기록합니다.

현재 홈 화면의 지도 로딩, 서버 음성·외부 AI 인증, 차량 제어 권한과 API별 동작은 각각 별도 검증 대상입니다. SDK가 빌드된 것과 서비스가 실제 값을 반환하는 것은 구분합니다.

## 조회 전용 앱

`dev.pleoslab`은 Vehicle SDK 초기화 → 도어 capability 확인 → 운전석 도어 값 조회를 수행합니다. 외부 HTTPS 연결 확인 버튼도 있으며 차량 데이터를 전송하지 않습니다. 외부 AI 키·과금 서비스는 설정하지 않았습니다.

## 공식 근거

- [시작 가이드](https://document.pleos.ai/docs/pleos-only/getting-started)
- [에뮬레이터 설치](https://document.pleos.ai/docs/connect/guide/getting-started/application-development/setup-connect-sdk-emulator)
- [Vehicle SDK 2.3.2 가이드](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/intro)
- [Virtual Console 연결](https://document.pleos.ai/docs/connect/guide/getting-started/application-development/use-vehicle-emulator)
- [공식 Vehicle 샘플](https://github.com/Pleos-Playground/pleos-sample-vehicle-app)

빠른 시작과 샘플 일부에는 2.3.1이 남아 있으나 현재 상세 가이드와 Maven에서 확인한 2.3.2로 구성했습니다. Android Studio 내장 JBR 25 대신 프로젝트 빌드에는 JDK 17을 사용합니다.
