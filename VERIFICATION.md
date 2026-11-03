# 검증 기록

## 현재 버전 0.6.0 — 2026-11-03

- 기존 블록으로 생활 루틴 5개 추가: 빈 동승석 정리, 충전 후 출발 준비, 차박 독서 자리, 도착 후 다음 일정, 캠핑 철수 브리핑. 총 17개 템플릿. API 지원을 추정해 성공으로 대체하지 않으며 실차 작동 검증과 구분합니다.
- 커뮤니티: 파일 기반 로컬 서버, 실제 게시물 업로드·검색·분류·정렬·다운로드·소유자 삭제. 서버 재시작 후 보존, 동시 쓰기, 다른 기기의 삭제 거부, 잘못된 블록·출처 거부를 검사했습니다. 공개 인터넷 서비스 배포는 하지 않았습니다.
- 가상 차량·테스트 설정·API 테스트 화면 제거. 실제 차량 실행과 실행 기록은 유지. 브라우저의 차량 실행은 비활성화합니다.
- `npm test`: 42/42 통과. 루틴 분기·P단 가드·한 번의 음성 브리핑·미지원 오류 중단과 커뮤니티 서버를 포함합니다. `artifacts-unit.log`.
- Playwright: 전체 36개 중 35개 통과 후, 마지막 삭제 검사에서 빈 목록 요소를 찾던 테스트 assertion을 수정하고 커뮤니티 관련 4/4를 재검사해 모두 통과했습니다. 서로 다른 브라우저 컨텍스트 사이의 업로드 → 검색 → 내려받기 → 새로고침 후 보존 → 본인 삭제를 실제 로컬 서버로 검증했습니다. `artifacts-ui.log`, `artifacts-community-ui.log`.
- 1440·1024·375px에서 가로 넘침 및 상세·업로드 폼 검사 통과. 대표 화면은 `screenshots/community-desktop.png`, `screenshots/community-mobile.png`. 검사에서만 별도 headless Chrome과 네이티브 브리지 대역을 사용합니다. 제품에 테스트 모드를 추가하지 않았습니다.
- `npm run build`, `npm run test:production`: 통과. 배포 번들의 CSP, 로컬 폰트, 커뮤니티 기본 루틴 내려받기, 자동 실행·감지 미활성화, 외부 요청 없음 확인. `artifacts-production.log`.
- Android 디버그 브리지는 에뮬레이터 호스트 `10.0.2.2:8787`의 JSON API를 사용합니다. 릴리스 서버 주소는 비어 있으며 원격 페이지 실행은 계속 차단합니다. 이번 변경의 실차 시험·에뮬레이터 네이티브 HTTP 통신 시험은 수행하지 않았습니다.
- `assembleDebug` 성공. APK: `artifacts/Routines-0.6.0-debug.apk` (versionCode 7). SHA-256: `5BD009D49FC9B40DD7B3E5CC3EB54F62E9EAE604158E2629BA5097BE352E23A8`. `artifacts-apk-final.log`.
- `lintDebug`는 완료하지 못했습니다. 검사 도구 `lint-31.8.2`, `lint-checks`, IntelliJ/Kotlin 분석기 등의 다운로드가 지연되었고, 오프라인 재시도에서 해당 도구 미캐시 오류가 났습니다. 코드 오류 판정이나 lint 통과로 기록하지 않습니다. `artifacts-offline-final.log`.

## 이전 버전 0.5.0 — 2026-11-02

- 조건 편집을 상태 → 비교 방식 → 기준값으로 정리했습니다. 모두/하나라도 조건, 바로 조회, 이전 조회 결과와 세부 항목 선택, 동작 입력에 결과 재사용을 지원합니다. 계산식과 혼합 논리식은 고급 편집에 보존합니다.
- 조회 결과는 블록 ID로 분리하여 변수 이름 없이 연결합니다. 이름 충돌, 실행하지 않은 분기의 결과, 재실행의 오래된 결과, 내부 조회가 있는 그룹 복제 등을 검사했습니다. 기본 선택 목록에는 같은 실행 경로에서 앞서 실행하는 조회만 표시합니다.
- 템플릿 12개(기존 4개 + 추가 8개), 출발/쾌적함/충전/도착 필터. 모든 템플릿의 유효성과 예시 입력 실행을 확인했습니다. API 템플릿의 테스트 데이터는 다시 열기에도 복원되며 실제 SDK 모드에서 대체 응답으로 사용되지 않습니다.
- 실행 엔진·모델·템플릿 테스트 35/35 통과. `artifacts/routines-0.5.0-runtime-tests.log`.
- Playwright Chromium 전체 33/33 통과. `artifacts/routines-0.5.0-ui-tests.log`. 마지막 가로 배치 수정 후 관련 8개를 재검사해 통과했습니다. `artifacts/routines-0.5.0-layout-tests.log`.
- 1440×1000 / 375×812 세 차례 시각 검증 후 에뮬레이터의 짧은 가로 화면을 추가 점검했습니다. 첫 회 모바일 조건 추가 가림을 수정했고, 다음 회 템플릿 아이콘·한글 크기를 통일했으며, 마지막 회 결과 선택 순서·스크롤 및 가로 조건 배치를 확인했습니다. 캡처: `artifacts/conditions-round-{1,2,3}`, 대표 화면: `screenshots/conditions-desktop.png`, `screenshots/conditions-mobile.png`.
- 최종 APK 웹 번들의 CSP·오프라인 실행 검사 통과(외부 요청/JS 오류 0, 로컬 폰트). `assembleDebug`, `lintDebug` 성공. lint 0 errors / 10 warnings이며 네이티브 코드·권한은 0.4.1과 동일합니다.
- `emulator-5554`에 0.5.0(versionCode 6)을 기존 데이터 유지 설치하고 실제 조건 화면과 조건 추가 버튼을 확인했습니다. `artifacts/routines-0.5.0-emulator.png`.
- APK: `artifacts/Routines-0.5.0-debug.apk`. SHA-256: `26B9ACEDCCD58DCDE9414E4ECF5446509E9631A46595C2238B7B4F6A9CB08532`.
- 실제 차량별 API 지원 차이, Gleo 스키마 승인, 화면을 열어 둔 동안만 감지하는 제한은 아래 0.4.1 기록과 같습니다. 이번 검증은 실차 시험이 아닙니다.

## 이전 버전 0.4.1 — 2026-11-02

- 앱 이름 `Routines`, versionCode 5. 사용자가 지정한 두 점·곡선 로고를 런처 적응형 아이콘, Android 13 단색 아이콘, 웹 파비콘에 반영했습니다.
- 시작 방식, 감지할 상태, 값 종류를 아이콘 카드로 선택합니다. 방식별 설정을 보존하고 키보드 방향키·포커스 이동도 지원합니다.
- 실행 엔진 27/27, Playwright 25/25, Android instrumentation 4/4 통과. 기록: `artifacts/routines-0.4.1-{runtime,ui,device}-tests.log`.
- APK와 동일한 CSP로 최종 웹 번들을 실행했습니다. 외부 요청 0, JS 오류 0, 로컬 Asta Sans 폰트 및 기본 루틴 실행을 확인했습니다.
- `assembleDebug`, `assembleDebugAndroidTest`, `lintDebug` 성공. lint 오류 0, 경고 10(대상 SDK·테스트 라이브러리 버전·백업 메타데이터·아이콘 리소스 구성·진단 화면 문자열).
- 1440px/375px에서 직접 실행 → 차량 상태 감지 → API 상태 변화 감지의 3회 시각 검증. 6개 캡처에서 카드 정렬·한글 가독성·가로 넘침·스크롤과 고정 적용 버튼을 확인했습니다. `artifacts/start-choice-rounds/round-{1,2,3}-{1440,375}.png`.
- Pleos Connect 2.1 Android 14 에뮬레이터(`emulator-5554`, 사용자 10)에 기존 데이터를 유지하여 설치하고, 설치 버전과 실제 실행 화면·새 아이콘을 확인했습니다. `artifacts/routines-0.4.1-emulator.png`.
- 최종 APK: `artifacts/Routines-0.4.1-debug.apk`.
- SHA-256: `A0BE0E46879C5C9EF1DF98804C89FABD2FBE34284180A1F33A3BC71E30B8AAF0`.

### 현재 API 범위와 한계

카탈로그 510개 항목을 노출합니다(Vehicle 476, AAOS 2, Connect 32). Vehicle 선언과 인자 변환 476개를 SDK와 대조했습니다. ERROR deprecated 쓰기 1개는 실행을 거부하며 활성 쓰기 55개는 capability 검사를 거칩니다. 복합 위치 값과 섭씨/화씨 범위·단위 변환도 검사했습니다.

네이티브 도어 조회와 대표 capability 응답은 `artifacts/routines-0.4.1-device-probe.json`에 기록했습니다. 에뮬레이터의 타이어 압력은 `ERROR_NOT_SUPPORTED_PROPERTY`를 반환합니다. 목록에 노출된 모든 기능의 실차 지원을 의미하지 않으며, 실제 오류를 데모 성공으로 대체하지 않습니다. Gleo는 별도 스키마 승인이 필요합니다. 이벤트 감지는 현재 앱 화면을 열어 둔 동안만 동작하며 백그라운드 자동화·실차 검증은 완료하지 않았습니다.

## 이전 버전 기록 — 0.3.0

아래는 당시 구현 범위와 결과를 보존한 과거 기록입니다. 현재 버전의 범위는 위 0.4.1 절을 따릅니다.

2026-11-02 · 카드 편집기 0.3.0. 브라우저, Android 패키지, SDK 및 실차 검증을 구분합니다.

## 기능 검증

- 실행 엔진 `npm test`: 17 / 17 통과. 조건, 반복, 변수, 타입 오류, 취소, 실행 제한, 가져오기 검증 및 SDK 오류 전파.
- 실제 Chromium `npm run test:ui`: 12 / 12 통과. 카드 수정/실행/저장/복원, 추가/삭제/되돌리기/다시 실행, 실제 드래그로 분기 이동, 메뉴 정렬/복제, 기존 JSON 호환, 이벤트 opt-in, 중지, 미지원 SDK 표시, 반복/변수, 조건 편집, 빈 숫자 오류, 반응형, 키보드/모달.
- `npm run test:production`: 최종 APK 웹 번들, 동일 CSP 조건에서 실행 성공. 외부 요청 0, JS 오류 0, 로컬 폰트 확인.
- `assembleDebug lintDebug`: 성공. lint 0 errors / 5 warnings. targetSdk 34, 기존 API 28 백업 메타데이터, 진단 화면의 한국어 하드코딩 경고.
- npm audit: 취약점 0. Blockly 런타임 의존성 및 생성 미디어 제거.

## 시각 검증

1440×960 / 375×812에서 Playwright로 실제 화면을 캡처하고 검토했습니다. 추가로 1024px를 검사했습니다.

| 회차 | 확인 및 조치 |
| --- | --- |
| 카드 1차 | 오른쪽 패널·왼쪽 팔레트 제거, 흰 카드·연결선·모바일 세로 분기. 전체 구조와 한글 크기 확인 |
| 카드 2차 | 숫자 값 정렬, 분기 합류선, 추가 버튼 의미 구분. 조건 편집·동작 추가·테스트 결과·보관함 확인 |
| 카드 3차 | 긴 한글 문장, 카드 메뉴, 파일 오류, 키보드 포커스. 넘침·글자 잘림·JS 오류 없음 |
| 마지막 점검 | 모바일 설정 창의 불필요한 스크롤바 여백 제거 후 재촬영. 반복 안의 동작과 분기 중첩을 1440px/375px에서 확인 |

대표 파일: `screenshots/routines-editor.png`, `screenshots/routines-mobile.png`.
원본 및 JSON: `artifacts/cards-round-1`, `cards-round-2`, `cards-round-3`, `cards-final`.
이전 `visual-round-*`는 0.2 퍼즐 편집기의 비교 기록입니다.

## Android와 SDK

공식 Connect 2.1.0 / Android 14 x86_64, WHPX 가속, AVD `Pleos_Connect_v2_1`.

- 0.3 APK를 `emulator-5554`에 기존 데이터 유지 설치(`adb install -r`)하고 MainActivity 시작 요청 성공.
- SDK 브리지와 실행 엔진은 유지했습니다. 이전 0.2 네이티브 검증에서 테스트 루틴 22°C / 풍량 3, 실제 SDK 도어 닫힘 `0`, Virtual Console FL door를 연 후 진단 화면의 `1` 응답을 확인했습니다. 이 기록은 새로운 차량 제어 기능의 검증으로 확대 해석하지 않습니다.
- D단에서는 Pleos 시스템이 편집기를 제한합니다. P단으로 전환하면 사용할 수 있습니다.
- 최종 APK: `artifacts/pleos-routines-0.3.0-debug.apk`.
- SHA-256: `E31C1BC766F411ED2C01CA3444B57193A42B69799307671CB2F65AEABD4C170B`.

## 범위

공조·풍량·배터리·속도는 앱 내부 테스트 데이터입니다. 네이티브 SDK 어댑터는 운전석 도어 조회만 구현합니다. 실차 검증, 백그라운드 자동화, Gleo, 외부 서비스 호출은 완료로 주장하지 않습니다.
