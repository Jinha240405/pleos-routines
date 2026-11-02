# 개발 환경과 실행

2026-11-02. 현재 소스는 블록 편집기와 Android 앱입니다. 초기 진단 앱은 DiagnosticsActivity에 보존했습니다.

## 웹 / Android

```powershell
npm ci
npm run dev
# http://127.0.0.1:5173

./scripts/setup-toolchain.ps1
./build.ps1
```

JDK 17, Android SDK 35, Gradle 8.10.2, AGP 8.8.2, Vehicle SDK 2.3.2를 사용합니다. JAVA_HOME / ANDROID_HOME을 설정한 경우 해당 환경을 사용합니다. 별도 설정이 없으면 도구는 `%LOCALAPPDATA%/PleosRoutines/toolchain`에 설치합니다. Windows 전역 PATH는 변경하지 않습니다.

## Pleos 에뮬레이터

공식 이미지: Connect 2.1.0 / Android 14 / x86_64. 압축 파일 4,087,751,964 bytes, 공식 SHA-1 `b4f858d5bcc6c71506d7edfc872bcb9e5a11acaa`를 검증했습니다.

```powershell
. ./environment.ps1
# emulator 패키지가 없는 개발 PC에서 한 번 실행
sdkmanager 'emulator'
./scripts/install-pleos-image.ps1
./start-emulator.ps1
# 부팅 후 다른 터미널
./build.ps1 -Install
./console.ps1
```

첫 실행 시 이미지를 내려받고 검증한 뒤 SDK에 설치하고 AVD를 만듭니다. 이미 설치된 기기의 사용자 데이터는 지우지 않습니다. 실행 스크립트는 RAM 4096MB, Cold Boot를 사용합니다. AVD 정의는 기본적으로 `ANDROID_USER_HOME/avd`에 있습니다.

Virtual Console: http://127.0.0.1:8088/ . 콘솔에서 지원하는 차량 항목과 앱에서 구현한 SDK API는 서로 다릅니다.

편집기는 정차/P단에서 사용합니다. D단에서 “주행 중에는 사용할 수 없습니다.”가 나타나는 것은 Pleos 시스템의 주행 중 사용 제한입니다. 콘솔에서 P를 선택하면 다시 열립니다.

## 이번 PC의 가속 문제와 해결 상태

처음 확인했을 때 Ryzen 5 3600의 `VirtualizationFirmwareEnabled=false`, `HypervisorPresent=false`, 가속 검사 코드 6(사용 가능한 하이퍼바이저 없음)이었습니다. 이후 사용자가 설정을 바꾸고 재부팅한 뒤 두 값 모두 true, `WHPX(10.0.26300) is installed and usable` / 코드 0으로 확인했습니다.

이런 경우 BIOS의 AMD SVM과 Windows Hypervisor Platform을 켜고 재부팅해야 합니다. 이번 작업에서는 BIOS나 Windows 가상화 설정을 대신 변경하거나 PC를 재부팅하지 않았습니다.

## 공식 참고

- https://document.pleos.ai/docs/connect/guide/getting-started/application-development/setup-connect-sdk-emulator
- https://document.pleos.ai/docs/connect/guide/getting-started/application-development/use-vehicle-emulator
- https://developer.android.com/studio/run/emulator-acceleration

실제 앱 설치·도어 응답 등 런타임 결과는 VERIFICATION.md에서 확인합니다.
