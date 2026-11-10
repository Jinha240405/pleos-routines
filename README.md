# 루틴(Routine)

## 1. 앱 이름 및 한 줄 소개

**투게더 팀 · 루틴** — 운전자가 차량 기능과 실행 조건을 블록처럼 조합해 자신만의 자동화를 만들고 공유할 수 있는 Pleos Connect 차량용 앱입니다.

## 2. 실행 방법

Pleos Connect 에뮬레이터를 부팅하고 정차/P단에서 APK를 설치·실행합니다.

```powershell
adb install "apk/투게더_루틴_release.apk"
adb shell am start -n dev.pleoslab/.MainActivity
```

**내 루틴 → 공식 템플릿 또는 새 루틴 → 블록 편집 → 저장 → ON → 실행** 순서로 사용합니다. 기존 debug 앱이 있다면 필요한 루틴을 JSON으로 보관한 뒤 삭제하고 설치하세요. 서명이 달라 덮어설치할 수 없습니다.

## 3. 테스트 환경 및 필요한 설정

- Pleos Connect **2.1.0 / Android 14(API 34) / x86_64** 에뮬레이터. 차량 기능은 지원 SDK·권한에 따라 동작하며 실차 시험은 완료하지 않았습니다.
- 소스 빌드: **Node.js 22+, JDK 17, Android SDK 35, Build Tools 35.0.0**. [환경 설정](docs/SETUP.md) · [release 빌드](docs/RELEASE.md) · [검증 기록](docs/VERIFICATION.md)
- 자동 감지는 앱이 화면에 열려 있을 때 동작합니다. 백그라운드에서는 일시 중지합니다.
- 제출 APK에는 커뮤니티 서버가 연결되어 있지 않습니다. 공유 기능은 별도 [로컬 서버와 개발용 앱/웹](docs/COMMUNITY.md)에서 사용할 수 있습니다.

## 4. APK 파일 위치

**[apk/투게더_루틴_release.apk](apk/투게더_루틴_release.apk)** — v0.6.1(versionCode 8), 배포 키로 서명한 release APK입니다. [SHA-256](apk/SHA256SUMS.txt)
