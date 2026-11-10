# 제출용 release APK

팀명은 **투게더**, 앱 이름은 **루틴**입니다. 제출 파일은 `apk/투게더_루틴_release.apk`이며, debug APK의 파일명만 변경한 것이 아니라 release 빌드 타입으로 생성하고 배포 키로 서명합니다.

## 빌드

JDK 17, Android SDK 35, Node.js 22 이상을 준비합니다. 서명 키와 비밀번호는 저장소 밖에 보관하고 아래 환경변수로 전달합니다.

| 환경변수 | 값 |
| --- | --- |
| `ROUTINE_KEYSTORE` | 배포용 keystore의 절대 경로 |
| `ROUTINE_STORE_PASSWORD` | keystore 비밀번호 |
| `ROUTINE_KEY_ALIAS` | 서명 키의 alias |
| `ROUTINE_KEY_PASSWORD` | 서명 키 비밀번호 |

```powershell
npm ci
# 위의 네 환경변수를 현재 프로세스에 설정한 뒤 실행
./build.ps1 -Release
```

결과는 `app/build/outputs/apk/release/app-release.apk`입니다. 서명 정보가 없으면 release 빌드는 실패합니다. 서명 키·비밀번호 파일은 Git에 포함하지 않습니다. 이 앱의 업데이트 APK에는 동일한 배포 키를 계속 사용해야 합니다.

## 패키지 확인 및 제출

```powershell
. ./environment.ps1
& "$env:ANDROID_HOME/build-tools/35.0.0/apksigner.bat" verify --verbose --print-certs app/build/outputs/apk/release/app-release.apk
& "$env:ANDROID_HOME/build-tools/35.0.0/aapt.exe" dump badging app/build/outputs/apk/release/app-release.apk
```

패키지 서명을 확인하고 `application-debuggable` 항목이 없는지 확인합니다. Pleos 에뮬레이터에 설치해 앱 시작과 화면 로딩을 검증한 뒤 `apk/투게더_루틴_release.apk`로 복사하고 SHA-256을 기록합니다.

저장소에는 APK와 해당 APK를 빌드한 소스를 함께 올립니다. APK가 GitHub의 파일 업로드 용량을 초과할 경우에는 GitHub Releases에 올리고 해당 페이지를 제출합니다.

## 현재 실행 범위

release APK는 일반 HTTP 연결과 WebView 디버깅을 허용하지 않습니다. 공개 커뮤니티 서버가 준비되지 않아 release의 서버 주소는 비어 있습니다. 루틴 편집·저장·공식 템플릿·지원 차량 API 실행을 사용할 수 있으며, 커뮤니티 업로드·다운로드는 로컬 서버와 개발용 APK 또는 웹앱으로 확인합니다.

기존 debug 앱과 서명이 달라 그대로 덮어설치할 수 없습니다. 필요한 루틴을 JSON으로 보관하고 debug 앱을 삭제한 후 release를 설치하세요. 앱 삭제 시 저장된 데이터가 삭제됩니다.
