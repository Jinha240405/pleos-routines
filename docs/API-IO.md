# Pleos API 입출력 목록

확인일: 2026-11-02. 기준: 이 프로젝트에 설치된 `ai.pleos.playground:Vehicle:2.3.2`의 공개 인터페이스와 공식 개발자 문서.

이 문서에서 입력은 루틴이 읽는 차량 상태, 출력은 루틴이 차량/서비스에 요청하는 동작이다. 아래는 SDK에 선언된 API 목록이며, 모든 항목을 현재 에뮬레이터나 모든 실제 차량에서 실행할 수 있다는 의미는 아니다. 각 항목의 지원 영역·허용 값·읽기/쓰기 접근과 권한은 해당 환경에서 확인해야 한다.

20개 도메인에서 중복 오버로드를 합친 공개 메서드 이름 476개를 확인했다: 조회 108개, 제어 56개, 변화 구독 90개, 구독 해제 90개, capability 확인 132개. 제어 56개 중 `setRangeRemainingDistance`는 `Deprecated(ERROR)`이므로 새 구현용 제어 후보는 55개다. 이 수치는 서로 다른 사용자 기능의 개수와 같지 않다.

API 존재 여부·메서드명·권한·폐기 수준은 설치된 SDK의 `javap -public` 및 선언 어노테이션에서 추출했다. 구현 코드를 분석하거나 차량 제어를 실행한 결과가 아니다. [원본 서명 목록](../artifacts/vehicle-sdk-2.3.2-public.txt), [오버로드별 CSV](vehicle-api-2.3.2.csv).

## 분야별 전체 요약

| 분야 | 입력·조회 | 출력·제어 |
|---|---|---|
| 브레이크 (Brake) | 브레이크 페달 상태 | 없음 |
| 차량 정보 (CarInfo) | VIN, 기능별 capability 구성, 구형 CRN 조회 | 없음 |
| 표시 단위 (Display) | 온도 표시 단위 | 없음 |
| 문 (Door) | 문 위치·잠금, 글러브박스 잠금 | 문 위치·잠금, 글러브박스 잠금 |
| 주행 모드 (DrivingMode) | 주행 모드, 크루즈 상태·목표 속도 | 없음 |
| 배터리·충전 (EvBattery) | SOC, 배터리 잔량·용량, 충전 전류 제한, 충전구 열림, 충전 스위치 상태, 현재·순간·충전 후·누적 전비 | 충전 전류 제한, 충전 목표 비율, 충전구 열기·닫기, 충전 스위치 |
| 연료 (Fuel) | 연료 잔량 비율, 현재·순간·주유 후·누적 연비 | 없음 |
| 기어 (Gear) | 선택 기어. 기존 Pleos API는 폐기 예정이며 AAOS GEAR_SELECTION으로 이전 | 없음 |
| 공조 (HVAC) | 현재 온도·설정 온도, 전원, AC, 자동 모드, 자동 내기순환, 성에 제거, 듀얼, 바람 방향·세기, 최대 냉방·최대 성에 제거, 내기순환, 공기청정 | 설정 온도, 전원, AC, 자동 모드, 자동 내기순환, 성에 제거, 듀얼, 바람 방향·세기, 최대 냉방·최대 성에 제거, 내기순환, 공기청정 |
| 조명 (Light) | 독서등·실내등·상향등·하향등·후미등·앞/뒤 안개등의 스위치/상태, 앰비언트 밝기·색상·스위치·상태, 주행 모드 연동 색상 여부 | 독서등·실내등·상향등·하향등·후미등·앞/뒤 안개등 스위치, 앰비언트 밝기·색상·스위치, 주행 모드 연동 색상 |
| 주행 기록 (Odometer) | 총 주행거리, 현재·누적·주유 후 주행 시간/거리, 구형 순간 주행거리·남은 주행거리 API | 새 구현에 사용할 제어 API 없음. setRangeRemainingDistance는 Deprecated(ERROR) |
| 안전·경고 (Safety) | 엔진오일·브레이크액·변속기오일 상태, 워셔액 부족, 출력 저하, 에어백 전개·활성, 안전벨트 미착용 경고, 계기판 표시등 묶음 | 없음 |
| 좌석 (Seat) | 착좌, 앞뒤·높이·기울기·쿠션 깊이, 등받이 각도, 머리받침 앞뒤·높이·각도, 요추 앞뒤·측면 지지, 벨트 체결·높이, 시트 온도·통풍 단계 | 좌석 앞뒤·높이·기울기·쿠션 깊이, 등받이 각도, 머리받침 앞뒤·높이·각도, 요추 앞뒤·측면 지지, 벨트 높이, 메모리 선택, 시트 온도·통풍 단계 |
| 사이드미러 (SideMirror) | 미러 열선 | 미러 열선 |
| 핸들 (SteeringWheel) | 핸들 각도, 열선 상태 | 핸들 열선 |
| 타이어 (Tire) | 바퀴별 공기압, 저압 관련 값 | 없음 |
| 하이패스 (Toll) | ETCS 음성 안내 음량 | ETCS 음성 안내 음량 |
| 방향지시등 (TurnSignal) | 방향지시등 상태 | 없음 |
| 창문 (Window) | 창문 잠금·위치, 블라인드 위치, 스마트글라스 상태·단계·설정 정보 | 창문 잠금·위치, 블라인드 이동, 스마트글라스 상태·구역별 상태·단계 |
| 와이퍼 (Wiper) | 와이퍼 상태·스위치 | 와이퍼 스위치 |

시트·문·창문·미러·바퀴처럼 위치가 나뉘는 API는 지원 영역을 따로 받는다. 좌석 수, 지원 영역, 온도·단계·위치의 범위를 고정값으로 가정하지 않는다. 조회 함수가 있다고 자동으로 변화 구독이나 제어 함수가 생기는 것은 아니다. 아래 목록에 각각의 함수가 있는지 확인한다.

## 사용 가능 여부와 폐기 API

- 공식 [지원 확인 방식](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/intro): capability → 지원 영역/허용 값 확인 → 조회/제어 → 비동기 성공·실패 콜백 처리.
- 공식 [권한 안내](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/Vehicle/vehicle-permission): 일반적으로 CAR_*는 읽기, CONTROL_CAR_*는 제어 권한이다. 정확한 권한은 함수별 RequiresPermission을 따른다. [앱 배포 시 승인 범위](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/)도 별개로 확인한다.
- 기어는 기존 Pleos 메서드 대신 AAOS `GEAR_SELECTION`, 배터리 에너지 잔량은 `EV_BATTERY_LEVEL`, 배터리 용량은 `INFO_EV_BATTERY_CAPACITY`, 충전구 열림 조회는 `EV_CHARGE_PORT_OPEN`, 남은 주행거리 조회는 `RANGE_REMAINING`으로 이전하도록 SDK 어노테이션에 명시돼 있다.
- `getCRNInfo`는 `getVINInfo`로 이전한다. 순간 트립 주행거리 API도 폐기 예정이다.
- 같은 capability 함수에도 폐기된 구형 오버로드와 현재 오버로드가 함께 있을 수 있다. 아래에서 “일부 오버로드 폐기”를 구분했고, CSV에는 각각의 서명·권한·폐기 메시지를 기록했다.
- `setRangeRemainingDistance`는 Kotlin 폐기 수준 ERROR이다. 공개 바이너리의 함수 개수에는 포함했으나 새 출력 블록 후보에서는 제외한다.
- 차량 속도는 이 Vehicle SDK의 공개 조회 함수 목록에 없다. AAOS `PERF_VEHICLE_SPEED` 경로를 별도로 검토해야 하며, 권한과 에뮬레이터/차량 지원은 아직 확인하지 않았다. 이 값의 표준 단위는 m/s이다. [Android VehiclePropertyIds](https://developer.android.com/reference/android/car/VehiclePropertyIds#PERF_VEHICLE_SPEED)

## 다른 Pleos SDK로 연결할 수 있는 입출력

아래는 공식 문서에서 확인한 다른 모듈의 기능 범위다. 위 Vehicle SDK 전체 메서드 집계에는 포함하지 않았으며 현재 프로젝트에 연결하지 않았다.

| 모듈 | 입력 | 출력/요청 |
|---|---|---|
| [FusedLocation 1.1.3](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/FusedLocation/intro) | 마지막 위치, 위치 업데이트, 위도·경도·고도·진행 방향·신뢰도·타임스탬프, 설정 영역 진입/이탈 | 근접 영역 알림 등록/해제, 위치 접근 차단 안내 팝업 |
| [NaviHelper 3.0.5](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/NaviHelper/intro) | 목적지·경유지·내비게이션 정보, 경로 탐색/주행 상태 이벤트 | 목적지 설정/취소, 경유지 추가/제거, 경로 옵션 변경·재탐색, 경유지 포함 경로 요청, 내비게이션 화면 열기 |
| [SpeechToText 3.3.1](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/SpeechToText/intro) | 음성 인식 결과 텍스트 | 인식 시작/중지, 언어 설정. 음성을 텍스트로 바꾸며 실제 차량 동작은 앱이 구현 |
| [TextToSpeech 3.3.1](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/TextToSpeech/intro) | 합성/재생 관련 이벤트 | 텍스트 읽기, 중지, 언어 설정 |
| [Gleo Interface](https://document.pleos.ai/docs/pleos-only/app-integration-guide/guide/core-concepts) | Gleo가 호출한 앱 함수와 인자 | 앱 함수 실행 결과를 callback으로 응답 |

STT/TTS의 ON_DEVICE는 네트워크 없이 동작하는 모드이고, SERVER/HYBRID의 서버 사용에는 앱 등록이 필요하다. FusedLocation은 `isSupported()` 확인이 필요하며 마지막 위치는 null일 수 있다. 내비게이션 이벤트도 Navigation 앱 구현과 상태에 따라 달라진다.

## 현재 우리 앱의 연결 상태

- Vehicle SDK 실제 연결: 운전석 문 열림 상태 조회. `MainActivity.readDoor`에서 capability를 확인하고 위치 값을 읽는다.
- 실제 기기 출력: Android 기본 TextToSpeech. Pleos 전용 TextToSpeech SDK 연동은 아니다.
- 현재 시뮬레이션 입력: 실내 온도·배터리·주행 속도·문 상태. Pleos 모드에서 실제로 읽는 것은 문 상태뿐이다.
- 현재 시뮬레이션 출력: 공조 설정 온도·풍량. 실제 차량 제어 연결은 아직 없다.
- 앱 내부 기능: 화면 알림·로그, 변수·조건·반복·대기, 저장/내보내기. 별도의 차량 센서/API가 아니다.
- 현재 AndroidManifest의 차량 권한은 CAR_DOORS만 선언돼 있다. 모든 조회/제어 권한이 준비된 상태가 아니다.

## 공개 메서드 전체 목록

함수 이름별 목록이다. 한 함수의 여러 오버로드는 한 행으로 합쳤다. CSV에는 오버로드를 분리했다. “폐기 예정”은 WARNING 수준, “사용 제외”는 ERROR 수준을 뜻한다. 권한 표시는 SDK의 어노테이션 기준이고 실제 권한 부여나 실행 성공을 보장하지 않는다.

### 브레이크 · Brake

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkBrakePedalStatusCapabilities` | 현재 선언 |
| 입력·조회 | `getCurrentBrakePedalStatus` | 현재 선언 |
| 변화 구독 | `registerBrakePedalStatus` | 현재 선언 |
| 구독 해제 | `unregisterBrakePedalStatus` | 현재 선언 |

### 차량 정보 · CarInfo

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkCRNInfoCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkVINInfoCapabilities` | 현재 선언 |
| 입력·조회 | `getVINInfo` | 현재 선언 |
| 입력·조회 | `getCRNInfo` | 폐기 예정 · WARNING |
| 입력·조회 | `getCapabilityInfo` | 현재 선언 |

### 표시 단위 · Display

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkTemperatureDisplayUnitCapabilities` | 현재 선언 |
| 입력·조회 | `getCurrentTemperatureDisplayUnit` | 현재 선언 |
| 변화 구독 | `registerTemperatureDisplayUnit` | 현재 선언 |
| 구독 해제 | `unregisterTemperatureDisplayUnit` | 현재 선언 |

### 문 · Door

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkGloveBoxLockCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkDoorLockCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkDoorPositionCapabilities` | 일부 오버로드 폐기 |
| 입력·조회 | `getDoorLockState` | 현재 선언 |
| 출력·제어 | `setGloveBoxLock` | 현재 선언 |
| 입력·조회 | `getCurrentGloveBoxLockState` | 현재 선언 |
| 입력·조회 | `getCurrentDoorPosition` | 현재 선언 |
| 출력·제어 | `setDoorLock` | 현재 선언 |
| 출력·제어 | `setDoorPosition` | 현재 선언 |
| 변화 구독 | `registerDoorPosition` | 현재 선언 |
| 구독 해제 | `unregisterDoorPosition` | 현재 선언 |
| 변화 구독 | `registerDoorLockState` | 현재 선언 |
| 구독 해제 | `unregisterDoorLockState` | 현재 선언 |
| 변화 구독 | `registerGloveBoxLockState` | 현재 선언 |
| 구독 해제 | `unregisterGloveBoxLockState` | 현재 선언 |

### 주행 모드 · DrivingMode

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkCruiseControlTargetSpeedCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkCruiseControlStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkDrivingModeStateCapabilities` | 현재 선언 |
| 입력·조회 | `getCruiseControlTargetSpeed` | 현재 선언 |
| 입력·조회 | `getCruiseControlState` | 현재 선언 |
| 입력·조회 | `getCurrentDrivingModeState` | 현재 선언 |
| 변화 구독 | `registerCruiseControlTargetSpeed` | 현재 선언 |
| 구독 해제 | `unregisterCruiseControlTargetSpeed` | 현재 선언 |
| 변화 구독 | `registerCruiseControlState` | 현재 선언 |
| 구독 해제 | `unregisterCruiseControlState` | 현재 선언 |
| 변화 구독 | `registerDrivingModeState` | 현재 선언 |
| 구독 해제 | `unregisterDrivingModeState` | 현재 선언 |

### 배터리·충전 · EvBattery

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkInstantaneousEvEfficiencyCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSinceChargeEvEfficiencyCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkCumulativeEvEfficiencyCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkCurrentEvEfficiencyCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkEvBatteryStateOfChargeCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkEvChargeCurrentDrawLimitCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkEvChargePercentLimitCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkEvChargePortOpenCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkEvChargeSwitchCapabilities` | 현재 선언 |
| 입력·조회 | `getInstantaneousEvEfficiency` | 현재 선언 |
| 입력·조회 | `getSinceChargeEvEfficiency` | 현재 선언 |
| 입력·조회 | `getCumulativeEvEfficiency` | 현재 선언 |
| 입력·조회 | `getCurrentEvEfficiency` | 현재 선언 |
| 입력·조회 | `getEvBatteryStateOfCharge` | 현재 선언 |
| 입력·조회 | `getEvBatteryLevel` | 폐기 예정 · WARNING |
| 변화 구독 | `registerCurrentEvEfficiency` | 현재 선언 |
| 구독 해제 | `unregisterCurrentEvEfficiency` | 현재 선언 |
| 변화 구독 | `registerEvBatteryStateOfCharge` | 현재 선언 |
| 구독 해제 | `unregisterEvBatteryStateOfCharge` | 현재 선언 |
| 출력·제어 | `setEvChargeCurrentDrawLimit` | 현재 선언 |
| 입력·조회 | `getEvChargeCurrentDrawLimit` | 현재 선언 |
| 출력·제어 | `setEvChargePercentLimit` | 현재 선언 |
| 입력·조회 | `isEvChargePortOpen` | 폐기 예정 · WARNING |
| 출력·제어 | `setEvChargePortOpen` | 현재 선언 |
| 출력·제어 | `setEvChargeSwitch` | 현재 선언 |
| 입력·조회 | `getEvChargeSwitchState` | 현재 선언 |
| 입력·조회 | `getEvBatteryCapacity` | 폐기 예정 · WARNING |
| 변화 구독 | `registerInstantaneousEvEfficiency` | 현재 선언 |
| 구독 해제 | `unregisterInstantaneousEvEfficiency` | 현재 선언 |
| 변화 구독 | `registerSinceChargeEvEfficiency` | 현재 선언 |
| 구독 해제 | `unregisterSinceChargeEvEfficiency` | 현재 선언 |
| 변화 구독 | `registerCumulativeEvEfficiency` | 현재 선언 |
| 구독 해제 | `unregisterCumulativeEvEfficiency` | 현재 선언 |
| 변화 구독 | `registerEvBatteryLevel` | 폐기 예정 · WARNING |
| 구독 해제 | `unregisterEvBatteryLevel` | 폐기 예정 · WARNING |
| 변화 구독 | `registerEvChargePortOpen` | 폐기 예정 · WARNING |
| 구독 해제 | `unregisterEvChargePortOpen` | 폐기 예정 · WARNING |

### 연료 · Fuel

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkInstantaneousFuelEconomyCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSinceChargeFuelEconomyCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkCumulativeFuelEconomyCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkCurrentFuelEconomyCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkFuelPercentCapabilities` | 현재 선언 |
| 입력·조회 | `getInstantaneousFuelEconomy` | 현재 선언 |
| 입력·조회 | `getSinceChargeFuelEconomy` | 현재 선언 |
| 입력·조회 | `getCumulativeFuelEconomy` | 현재 선언 |
| 입력·조회 | `getCurrentFuelEconomy` | 현재 선언 |
| 입력·조회 | `getFuelPercent` | 현재 선언 |
| 변화 구독 | `registerInstantaneousFuelEconomy` | 현재 선언 |
| 구독 해제 | `unregisterInstantaneousFuelEconomy` | 현재 선언 |
| 변화 구독 | `registerSinceChargeFuelEconomy` | 현재 선언 |
| 구독 해제 | `unregisterSinceChargeFuelEconomy` | 현재 선언 |
| 변화 구독 | `registerCumulativeFuelEconomy` | 현재 선언 |
| 구독 해제 | `unregisterCumulativeFuelEconomy` | 현재 선언 |
| 변화 구독 | `registerCurrentFuelEconomy` | 현재 선언 |
| 구독 해제 | `unregisterCurrentFuelEconomy` | 현재 선언 |
| 변화 구독 | `registerFuelPercent` | 현재 선언 |
| 구독 해제 | `unregisterFuelPercent` | 현재 선언 |

### 기어 · Gear

| 구분 | 함수 | 상태 |
|---|---|---|
| 입력·조회 | `getCurrentGearSelectionState` | 폐기 예정 · WARNING |
| 변화 구독 | `registerGearSelection` | 폐기 예정 · WARNING |
| 구독 해제 | `unregisterGearSelection` | 폐기 예정 · WARNING |

### 공조 · HVAC

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkHvacAcCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacAutoCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacRecirculationCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacDefrosterCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacDualCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacFanDirectionCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacFanSpeedCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacMaxAcCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacMaxDefrostCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacPowerCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacAutoRecirculationCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacAirCleanerCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacTemperatureCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHvacTemperatureCurrentCapabilities` | 현재 선언 |
| 출력·제어 | `setHvacAc` | 현재 선언 |
| 입력·조회 | `getHvacAcState` | 현재 선언 |
| 출력·제어 | `setHvacAuto` | 현재 선언 |
| 입력·조회 | `getHvacAutoState` | 현재 선언 |
| 출력·제어 | `setHvacAutoRecirculation` | 현재 선언 |
| 입력·조회 | `getHvacAutoRecirculationState` | 현재 선언 |
| 출력·제어 | `setHvacDefroster` | 현재 선언 |
| 입력·조회 | `getHvacDefrosterState` | 현재 선언 |
| 출력·제어 | `setHvacDual` | 현재 선언 |
| 입력·조회 | `getHvacDualState` | 현재 선언 |
| 출력·제어 | `setHvacFanDirection` | 현재 선언 |
| 입력·조회 | `getHvacFanDirection` | 현재 선언 |
| 출력·제어 | `setHvacFanSpeed` | 현재 선언 |
| 입력·조회 | `getHvacFanSpeed` | 현재 선언 |
| 출력·제어 | `setHvacMaxAc` | 현재 선언 |
| 입력·조회 | `getHvacMaxAcState` | 현재 선언 |
| 출력·제어 | `setHvacMaxDefrost` | 현재 선언 |
| 입력·조회 | `getHvacMaxDefrostState` | 현재 선언 |
| 출력·제어 | `setHvacPower` | 현재 선언 |
| 입력·조회 | `getHvacPowerState` | 현재 선언 |
| 출력·제어 | `setHvacRecirculation` | 현재 선언 |
| 입력·조회 | `getHvacRecirculationState` | 현재 선언 |
| 출력·제어 | `setHvacAirCleaner` | 현재 선언 |
| 입력·조회 | `getHvacAirCleanerState` | 현재 선언 |
| 입력·조회 | `getHvacTemperature` | 현재 선언 |
| 출력·제어 | `setHvacTemperature` | 현재 선언 |
| 입력·조회 | `getHvacTemperatureCurrent` | 현재 선언 |
| 변화 구독 | `registerHvacAcState` | 현재 선언 |
| 구독 해제 | `unregisterHvacAcState` | 현재 선언 |
| 변화 구독 | `registerHvacAutoState` | 현재 선언 |
| 구독 해제 | `unregisterHvacAutoState` | 현재 선언 |
| 변화 구독 | `registerHvacAutoRecirculationState` | 현재 선언 |
| 구독 해제 | `unregisterHvacAutoRecirculationState` | 현재 선언 |
| 변화 구독 | `registerHvacDefrosterState` | 현재 선언 |
| 구독 해제 | `unregisterHvacDefrosterState` | 현재 선언 |
| 변화 구독 | `registerHvacDualState` | 현재 선언 |
| 구독 해제 | `unregisterHvacDualState` | 현재 선언 |
| 변화 구독 | `registerHvacMaxAcState` | 현재 선언 |
| 구독 해제 | `unregisterHvacMaxAcState` | 현재 선언 |
| 변화 구독 | `registerHvacMaxDefrostState` | 현재 선언 |
| 구독 해제 | `unregisterHvacMaxDefrostState` | 현재 선언 |
| 변화 구독 | `registerHvacPowerState` | 현재 선언 |
| 구독 해제 | `unregisterHvacPowerState` | 현재 선언 |
| 변화 구독 | `registerHvacAirCleanerState` | 현재 선언 |
| 구독 해제 | `unregisterHvacAirCleanerState` | 현재 선언 |
| 변화 구독 | `registerHvacTemperatureCurrent` | 현재 선언 |
| 구독 해제 | `unregisterHvacTemperatureCurrent` | 현재 선언 |
| 변화 구독 | `registerHvacTemperature` | 현재 선언 |
| 구독 해제 | `unregisterHvacTemperature` | 현재 선언 |
| 변화 구독 | `registerHvacFanSpeed` | 현재 선언 |
| 구독 해제 | `unregisterHvacFanSpeed` | 현재 선언 |
| 변화 구독 | `registerHvacRecirculationState` | 현재 선언 |
| 구독 해제 | `unregisterHvacRecirculationState` | 현재 선언 |

### 조명 · Light

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkReadingLightSwitchCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkCabinLightSwitchCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkHighBeamLightSwitchCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkLowBeamLightSwitchCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkTailLampLightSwitchCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkFrontFogLightSwitchCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkRearFogLightSwitchCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkReadingLightStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkCabinLightStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkHighBeamLightStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkLowBeamLightStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkTailLampLightStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkFrontFogLightStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkRearFogLightStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkAmbientLightBrightnessCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkAmbientLightBrightnessColorCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkAmbientLightSwitchCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkAmbientLightStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkAmbientColorAutoByDriveModeEnabledCapabilities` | 현재 선언 |
| 입력·조회 | `getReadingLightSwitch` | 현재 선언 |
| 출력·제어 | `setReadingLightSwitch` | 현재 선언 |
| 입력·조회 | `getCurrentReadingLightState` | 현재 선언 |
| 입력·조회 | `getCabinLightSwitch` | 현재 선언 |
| 출력·제어 | `setCabinLightSwitch` | 현재 선언 |
| 입력·조회 | `getCurrentCabinLightState` | 현재 선언 |
| 입력·조회 | `getCurrentHighBeamLightState` | 현재 선언 |
| 입력·조회 | `getHighBeamLightSwitch` | 현재 선언 |
| 출력·제어 | `setHighBeamLightSwitch` | 현재 선언 |
| 출력·제어 | `setLowBeamLightSwitch` | 현재 선언 |
| 입력·조회 | `getLowBeamLightSwitch` | 현재 선언 |
| 입력·조회 | `getCurrentLowBeamLightState` | 현재 선언 |
| 입력·조회 | `getCurrentTailLampLightState` | 현재 선언 |
| 입력·조회 | `getTailLampLightSwitch` | 현재 선언 |
| 출력·제어 | `setTailLampLightSwitch` | 현재 선언 |
| 입력·조회 | `getCurrentFrontFogLightState` | 현재 선언 |
| 입력·조회 | `getFrontFogLightSwitch` | 현재 선언 |
| 출력·제어 | `setFrontFogLightSwitch` | 현재 선언 |
| 입력·조회 | `getCurrentRearFogLightState` | 현재 선언 |
| 입력·조회 | `getRearFogLightSwitch` | 현재 선언 |
| 출력·제어 | `setRearFogLightSwitch` | 현재 선언 |
| 입력·조회 | `getAmbientLightBrightness` | 현재 선언 |
| 출력·제어 | `setAmbientLightBrightness` | 현재 선언 |
| 입력·조회 | `getAmbientLightBrightnessColor` | 현재 선언 |
| 출력·제어 | `setAmbientLightBrightnessColor` | 현재 선언 |
| 입력·조회 | `getAmbientLightSwitch` | 현재 선언 |
| 출력·제어 | `setAmbientLightSwitch` | 현재 선언 |
| 입력·조회 | `getAmbientLightState` | 현재 선언 |
| 입력·조회 | `getAmbientColorAutoByDriveModeEnabled` | 현재 선언 |
| 출력·제어 | `setAmbientColorAutoByDriveModeEnabled` | 현재 선언 |
| 변화 구독 | `registerHighBeamLightState` | 현재 선언 |
| 구독 해제 | `unregisterHighBeamLightState` | 현재 선언 |
| 변화 구독 | `registerLowBeamLightState` | 현재 선언 |
| 구독 해제 | `unregisterLowBeamLightState` | 현재 선언 |
| 변화 구독 | `registerTailLampLightState` | 현재 선언 |
| 구독 해제 | `unregisterTailLampLightState` | 현재 선언 |
| 변화 구독 | `registerFrontFogLightState` | 현재 선언 |
| 구독 해제 | `unregisterFrontFogLightState` | 현재 선언 |
| 변화 구독 | `registerRearFogLightState` | 현재 선언 |
| 구독 해제 | `unregisterRearFogLightState` | 현재 선언 |
| 변화 구독 | `registerReadingLightState` | 현재 선언 |
| 구독 해제 | `unregisterReadingLightState` | 현재 선언 |
| 변화 구독 | `registerCabinLightState` | 현재 선언 |
| 구독 해제 | `unregisterCabinLightState` | 현재 선언 |
| 변화 구독 | `registerAmbientLightBrightnessListener` | 현재 선언 |
| 구독 해제 | `unregisterAmbientLightBrightnessListener` | 현재 선언 |
| 변화 구독 | `registerAmbientLightBrightnessColorListener` | 현재 선언 |
| 구독 해제 | `unregisterAmbientLightBrightnessColorListener` | 현재 선언 |
| 변화 구독 | `registerAmbientLightStateListener` | 현재 선언 |
| 구독 해제 | `unregisterAmbientLightStateListener` | 현재 선언 |
| 변화 구독 | `registerAmbientColorAutoByDriveModeEnabled` | 현재 선언 |
| 구독 해제 | `unregisterAmbientColorAutoByDriveModeEnabled` | 현재 선언 |

### 주행 기록 · Odometer

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkCurrentDistanceDrivenCapabilities` | 현재 선언 |
| 입력·조회 | `getCurrentDistanceDriven` | 현재 선언 |
| 지원·범위 확인 | `checkTripDrivingTimeCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkTripCurrentDrivingTimeCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkTripCumulativeDrivingTimeCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkTripSinceRefillDrivingTimeCapabilities` | 현재 선언 |
| 입력·조회 | `getTripCurrentDrivingTime` | 현재 선언 |
| 입력·조회 | `getTripCumulativeDrivingTime` | 현재 선언 |
| 입력·조회 | `getTripSinceRefillDrivingTime` | 현재 선언 |
| 지원·범위 확인 | `checkTripDrivingDistanceCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkTripCurrentDrivingDistanceCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkTripInstantaneousDrivingDistanceCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkTripCumulativeDrivingDistanceCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkTripSinceRefillDrivingDistanceCapabilities` | 현재 선언 |
| 입력·조회 | `getTripCurrentDrivingDistance` | 현재 선언 |
| 입력·조회 | `getTripInstantaneousDrivingDistance` | 폐기 예정 · WARNING |
| 입력·조회 | `getTripCumulativeDrivingDistance` | 현재 선언 |
| 입력·조회 | `getTripSinceRefillDrivingDistance` | 현재 선언 |
| 출력·제어 | `setRangeRemainingDistance` | 사용 제외 · ERROR |
| 입력·조회 | `getRangeRemainingDistance` | 폐기 예정 · WARNING |
| 변화 구독 | `registerRangeRemainingListener` | 폐기 예정 · WARNING |
| 구독 해제 | `unregisterRangeRemainingListener` | 폐기 예정 · WARNING |
| 변화 구독 | `registerDistanceDriven` | 현재 선언 |
| 구독 해제 | `unregisterDistanceDriven` | 현재 선언 |
| 변화 구독 | `registerTripCurrentDrivingTime` | 현재 선언 |
| 구독 해제 | `unregisterTripCurrentDrivingTime` | 현재 선언 |
| 변화 구독 | `registerTripCumulativeDrivingTime` | 현재 선언 |
| 구독 해제 | `unregisterTripCumulativeDrivingTime` | 현재 선언 |
| 변화 구독 | `registerTripSinceRefillDrivingTime` | 현재 선언 |
| 구독 해제 | `unregisterTripSinceRefillDrivingTime` | 현재 선언 |
| 변화 구독 | `registerTripCurrentDrivingDistance` | 현재 선언 |
| 구독 해제 | `unregisterTripCurrentDrivingDistance` | 현재 선언 |
| 변화 구독 | `registerTripInstantaneousDrivingDistance` | 폐기 예정 · WARNING |
| 구독 해제 | `unregisterTripInstantaneousDrivingDistance` | 폐기 예정 · WARNING |
| 변화 구독 | `registerTripCumulativeDrivingDistance` | 현재 선언 |
| 구독 해제 | `unregisterTripCumulativeDrivingDistance` | 현재 선언 |
| 변화 구독 | `registerTripSinceRefillDrivingDistance` | 현재 선언 |
| 구독 해제 | `unregisterTripSinceRefillDrivingDistance` | 현재 선언 |

### 안전·경고 · Safety

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkAirbagCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkAirbagDeployedCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatBuckledCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkSeatNotBuckledWarningCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkEngineOilLevelStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkBrakeFluidLevelStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkTransmissionOilLevelStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkLowWasherFluidWarningStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkPowerDownWarningIndicatorCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkTelltalesCapabilities` | 현재 선언 |
| 입력·조회 | `getEngineOilLevelState` | 현재 선언 |
| 입력·조회 | `getBrakeFluidLevelState` | 현재 선언 |
| 입력·조회 | `getTransmissionOilLevelState` | 현재 선언 |
| 입력·조회 | `hasLowWasherFluidWarning` | 현재 선언 |
| 입력·조회 | `hasSeatAirbagBeenDeployed` | 현재 선언 |
| 입력·조회 | `hasPowerDownWarningIndicator` | 현재 선언 |
| 입력·조회 | `hasSeatAirbagEnabled` | 현재 선언 |
| 입력·조회 | `hasSeatBeltNotBuckledWarning` | 현재 선언 |
| 입력·조회 | `getTelltalesInfo` | 현재 선언 |
| 변화 구독 | `registerPowerDownWarningIndicator` | 현재 선언 |
| 구독 해제 | `unregisterPowerDownWarningIndicator` | 현재 선언 |
| 변화 구독 | `registerSeatAirbagEnabled` | 현재 선언 |
| 구독 해제 | `unregisterSeatAirbagEnabled` | 현재 선언 |
| 변화 구독 | `registerSeatBeltNotBuckledWarning` | 현재 선언 |
| 구독 해제 | `unregisterSeatBeltNotBuckledWarning` | 현재 선언 |
| 변화 구독 | `registerLowWasherFluidWaringState` | 현재 선언 |
| 구독 해제 | `unregisterLowWasherFluidWaringState` | 현재 선언 |
| 변화 구독 | `registerBrakeFluidLevelState` | 현재 선언 |
| 구독 해제 | `unregisterBrakeFluidLevelState` | 현재 선언 |
| 변화 구독 | `registerTransmissionOilLevelState` | 현재 선언 |
| 구독 해제 | `unregisterTransmissionOilLevelState` | 현재 선언 |
| 변화 구독 | `registerEngineOilLevelState` | 현재 선언 |
| 구독 해제 | `unregisterEngineOilLevelState` | 현재 선언 |
| 변화 구독 | `registerSeatAirbagDeployed` | 현재 선언 |
| 구독 해제 | `unregisterSeatAirbagDeployed` | 현재 선언 |
| 변화 구독 | `registerTelltales` | 현재 선언 |
| 구독 해제 | `unregisterTelltales` | 현재 선언 |

### 좌석 · Seat

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkSeatOccupancyCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkSeatBeltBuckledCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkSeatBackrestAngleCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatBackrestAnglePositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatHeadrestAngleCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatHeadrestAnglePositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatHeadrestForeAftCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatHeadrestForeAftPositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatHeadrestHeightCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatHeadrestHeightPositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatHeightCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatHeightPositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatLumbarForeAftCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatLumbarForeAftPositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatLumbarSideSupportCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatLumbarSideSupportPositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatTiltCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatTiltPositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatDepthCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatDepthPositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatForeAftCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatForeAftPositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatBeltHeightCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkSeatBeltHeightPositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatTemperatureCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkSeatVentilationCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkMoveSeatBackrestAngleCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkMoveSeatHeadrestForeAftCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkMoveSeatBeltHeightCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkMoveSeatHeadrestHeightCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkMoveSeatHeightCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkMoveSeatLumbarForeAftCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkMoveSeatLumbarSideSupportCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkMoveSeatTiltCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkMoveSeatDepthCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkMoveSeatHeadrestAngleCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkMoveSeatForeAftCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSeatMemoryCapabilities` | 현재 선언 |
| 입력·조회 | `getCurrentSeatOccupancy` | 현재 선언 |
| 출력·제어 | `moveSeatBackrestAngle` | 현재 선언 |
| 출력·제어 | `moveSeatHeadrestForeAft` | 현재 선언 |
| 입력·조회 | `getCurrentSeatHeadrestForeAftPosition` | 현재 선언 |
| 출력·제어 | `moveSeatHeadrestHeight` | 현재 선언 |
| 입력·조회 | `getCurrentSeatHeadrestHeightAftPosition` | 현재 선언 |
| 출력·제어 | `moveSeatHeight` | 현재 선언 |
| 입력·조회 | `getCurrentSeatHeightPosition` | 현재 선언 |
| 출력·제어 | `moveSeatLumbarForeAft` | 현재 선언 |
| 입력·조회 | `getCurrentSeatLumbarForeAftPosition` | 현재 선언 |
| 출력·제어 | `moveSeatLumbarSideSupport` | 현재 선언 |
| 입력·조회 | `getCurrentSeatLumbarSideSupportPosition` | 현재 선언 |
| 출력·제어 | `selectSeatMemory` | 현재 선언 |
| 출력·제어 | `moveSeatTilt` | 현재 선언 |
| 입력·조회 | `getCurrentSeatTiltPosition` | 현재 선언 |
| 출력·제어 | `moveSeatDepth` | 현재 선언 |
| 입력·조회 | `getCurrentSeatDepthPosition` | 현재 선언 |
| 입력·조회 | `getCurrentSeatForeAftPosition` | 현재 선언 |
| 출력·제어 | `moveSeatHeadrestAngle` | 현재 선언 |
| 입력·조회 | `getCurrentSeatHeadrestAnglePosition` | 현재 선언 |
| 입력·조회 | `getCurrentSeatBackrestAnglePosition` | 현재 선언 |
| 입력·조회 | `getCurrentSeatBeltBuckledState` | 현재 선언 |
| 출력·제어 | `moveSeatBeltHeight` | 현재 선언 |
| 입력·조회 | `getCurrentSeatBeltHeightPosition` | 현재 선언 |
| 출력·제어 | `moveSeatForeAft` | 현재 선언 |
| 출력·제어 | `setHvacSeatTemperature` | 현재 선언 |
| 입력·조회 | `getHvacSeatTemperature` | 현재 선언 |
| 입력·조회 | `getHvacSeatVentilationState` | 현재 선언 |
| 출력·제어 | `setHvacSeatVentilation` | 현재 선언 |
| 변화 구독 | `registerSeatOccupancy` | 현재 선언 |
| 구독 해제 | `unregisterSeatOccupancy` | 현재 선언 |
| 변화 구독 | `registerSeatBackrestAnglePosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatBackrestAnglePosition` | 현재 선언 |
| 변화 구독 | `registerSeatBeltBuckledState` | 현재 선언 |
| 구독 해제 | `unregisterSeatBeltBuckledState` | 현재 선언 |
| 변화 구독 | `registerSeatBeltHeightPosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatBeltHeightPosition` | 현재 선언 |
| 변화 구독 | `registerSeatDepthPosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatDepthPosition` | 현재 선언 |
| 변화 구독 | `registerSeatForeAftPosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatForeAftPosition` | 현재 선언 |
| 변화 구독 | `registerSeatHeadrestAnglePosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatHeadrestAnglePosition` | 현재 선언 |
| 변화 구독 | `registerSeatHeadrestForeAftPosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatHeadrestForeAftPosition` | 현재 선언 |
| 변화 구독 | `registerSeatHeadrestHeightAftPosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatHeadrestHeightAftPosition` | 현재 선언 |
| 변화 구독 | `registerSeatHeightPosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatHeightPosition` | 현재 선언 |
| 변화 구독 | `registerSeatLumbarForeAftPosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatLumbarForeAftPosition` | 현재 선언 |
| 변화 구독 | `registerSeatLumbarSideSupportPosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatLumbarSideSupportPosition` | 현재 선언 |
| 변화 구독 | `registerSeatTiltPosition` | 현재 선언 |
| 구독 해제 | `unregisterSeatTiltPosition` | 현재 선언 |
| 변화 구독 | `registerHvacSeatTemperature` | 현재 선언 |
| 구독 해제 | `unregisterHvacSeatTemperature` | 현재 선언 |
| 변화 구독 | `registerHvacSeatVentilation` | 현재 선언 |
| 구독 해제 | `unregisterHvacSeatVentilation` | 현재 선언 |

### 사이드미러 · SideMirror

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkHvacSideMirrorHeatCapabilities` | 일부 오버로드 폐기 |
| 입력·조회 | `getHvacSideMirrorHeatState` | 현재 선언 |
| 출력·제어 | `setHvacSideMirrorHeat` | 현재 선언 |
| 변화 구독 | `registerHvacSideMirrorHeatState` | 현재 선언 |
| 구독 해제 | `unregisterHvacSideMirrorHeatState` | 현재 선언 |

### 핸들 · SteeringWheel

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkHvacSteeringWheelHeatCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkSteeringWheelAngleCapabilities` | 현재 선언 |
| 입력·조회 | `getHvacSteeringWheelHeatState` | 현재 선언 |
| 출력·제어 | `setHvacSteeringWheelHeat` | 현재 선언 |
| 입력·조회 | `getCurrentSteeringWheelAngle` | 현재 선언 |
| 변화 구독 | `registerSteeringWheelAngle` | 현재 선언 |
| 구독 해제 | `unregisterSteeringWheelAngle` | 현재 선언 |
| 변화 구독 | `registerHvacSteeringWheelHeatState` | 현재 선언 |
| 구독 해제 | `unregisterHvacSteeringWheelHeatState` | 현재 선언 |

### 타이어 · Tire

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkWheelAreaCapabilities` | 폐기 예정 · WARNING |
| 지원·범위 확인 | `checkLowTirePressureCapabilities` | 현재 선언 |
| 입력·조회 | `getLowTirePressure` | 현재 선언 |
| 지원·범위 확인 | `checkTirePressureCapabilities` | 현재 선언 |
| 입력·조회 | `getTirePressure` | 현재 선언 |
| 변화 구독 | `registerTirePressure` | 현재 선언 |
| 구독 해제 | `unregisterTirePressure` | 현재 선언 |

### 하이패스 · Toll

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkEtcsVoiceGuidanceVolumeCapabilities` | 현재 선언 |
| 입력·조회 | `getCurrentEtcsVoiceGuidanceVolume` | 현재 선언 |
| 출력·제어 | `setEtcsVoiceGuidanceVolume` | 현재 선언 |
| 변화 구독 | `registerEtcsVoiceGuidanceVolume` | 현재 선언 |
| 구독 해제 | `unregisterEtcsVoiceGuidanceVolume` | 현재 선언 |

### 방향지시등 · TurnSignal

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkTurnSignalStateCapabilities` | 현재 선언 |
| 입력·조회 | `getCurrentTurnSignalState` | 현재 선언 |
| 변화 구독 | `registerTurnSignalState` | 현재 선언 |
| 구독 해제 | `unregisterTurnSignalState` | 현재 선언 |

### 창문 · Window

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkMoveWindowBlindCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkWindowBlindPositionCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSmartGlassStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSmartGlassZoneStateCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkSmartGlassLevelCapabilities` | 현재 선언 |
| 지원·범위 확인 | `checkWindowLockCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkWindowPositionCapabilities` | 일부 오버로드 폐기 |
| 출력·제어 | `setWindowLock` | 현재 선언 |
| 입력·조회 | `getCurrentWindowLockState` | 현재 선언 |
| 입력·조회 | `getCurrentWindowPosition` | 현재 선언 |
| 출력·제어 | `setWindowPosition` | 현재 선언 |
| 입력·조회 | `getCurrentWindowBlindPosition` | 현재 선언 |
| 출력·제어 | `moveWindowBlind` | 현재 선언 |
| 입력·조회 | `getCurrentSmartGlassState` | 현재 선언 |
| 출력·제어 | `setSmartGlassState` | 현재 선언 |
| 출력·제어 | `setSmartGlassZoneState` | 현재 선언 |
| 입력·조회 | `getSmartGlassConfig` | 현재 선언 |
| 입력·조회 | `getCurrentSmartGlassLevel` | 현재 선언 |
| 출력·제어 | `setSmartGlassLevel` | 현재 선언 |
| 변화 구독 | `registerWindowLockState` | 현재 선언 |
| 구독 해제 | `unregisterWindowLockState` | 현재 선언 |
| 변화 구독 | `registerWindowPosition` | 현재 선언 |
| 구독 해제 | `unregisterWindowPosition` | 현재 선언 |
| 변화 구독 | `registerWindowBlindPosition` | 현재 선언 |
| 구독 해제 | `unregisterWindowBlindPosition` | 현재 선언 |
| 변화 구독 | `registerSmartGlassLevel` | 현재 선언 |
| 구독 해제 | `unregisterSmartGlassLevel` | 현재 선언 |
| 변화 구독 | `registerSmartGlassState` | 현재 선언 |
| 구독 해제 | `unregisterSmartGlassState` | 현재 선언 |

### 와이퍼 · Wiper

| 구분 | 함수 | 상태 |
|---|---|---|
| 지원·범위 확인 | `checkWiperStateCapabilities` | 일부 오버로드 폐기 |
| 지원·범위 확인 | `checkWiperSwitchCapabilities` | 일부 오버로드 폐기 |
| 입력·조회 | `getCurrentWiperState` | 현재 선언 |
| 입력·조회 | `getCurrentWiperSwitch` | 현재 선언 |
| 출력·제어 | `setWiperSwitch` | 현재 선언 |
| 변화 구독 | `registerWiperState` | 현재 선언 |
| 구독 해제 | `unregisterWiperState` | 현재 선언 |

## 계기판 표시등 종류

TelltaleType에 선언된 95개 항목이다. 경고/상태 표시 종류이며 센서 원시값이나 해당 장치의 제어 권한을 뜻하지 않는다. 예를 들어 PARKING_BRAKE 표시등과 주차 브레이크 제어는 별개다. 실제 수신 항목은 차량/서비스 지원에 따른다.

- `PARKING_BRAKE`
- `ELECTRONIC_PARKING_BRAKE`
- `SEAT_BELT`
- `DOOR_OPEN`
- `ABS`
- `MDPS`
- `TPMS`
- `LOW_VOLT_BATTERY`
- `ESC`
- `ESC_OFF`
- `AIRBAG`
- `AFS`
- `MASTER_WARNING`
- `AUTO_HOLD`
- `AUTO_HIGH_BEAM`
- `HEADLAMP_LOW`
- `HEADLAMP_HIGH`
- `POSITION_LAMP`
- `FRONT_FOG_LAMP`
- `REAR_FOG_LAMP`
- `ENGINE_OIL_PRESSURE`
- `ENGINE_TEMPERATURE`
- `EMERGENCY_CALL`
- `EV_SYSTEM`
- `POWER_DOWN`
- `RBS`
- `IMMOBILIZER`
- `ENGINE`
- `LED_HEADLAMP`
- `PREHEAT`
- `PARTICLE_FILTER`
- `H2_SENSOR`
- `H2_LEAK`
- `PASSENGER_AIRBAG_OFF`
- `PASSENGER_AIRBAG_ON`
- `TURN_SIGNAL_LEFT`
- `TURN_SIGNAL_RIGHT`
- `ICY_ROAD`
- `OVER_SPEED`
- `WATER_SEPARATOR`
- `SCR`
- `LOW_EV_BATTERY`
- `HEV_SYSTEM`
- `FCEV_SYSTEM`
- `EREV_SYSTEM`
- `LPI`
- `EV_CHARGING_CONNECTOR`
- `AWD_LOCK`
- `HEV_MODE`
- `ISG`
- `DBC`
- `REV`
- `XEV_READY`
- `I_PEDAL`
- `LOW_FUEL`
- `LOW_FUEL_FCEV`
- `EV_BATTERY_CONDITIONING`
- `TRUNK_OPEN`
- `CHILD_PRESENCE_DETECTION_OFF`
- `DRIVE_MODE`
- `DRIVE_MODE_SPORT`
- `DRIVE_MODE_ECO`
- `DRIVE_MODE_COMFORT`
- `DRIVE_MODE_TERRAIN`
- `FORCED_ALL_WHEEL_DRIVE`
- `FOUR_WHEEL_DRIVE_MODE_2H`
- `FOUR_WHEEL_DRIVE_MODE_4A`
- `FOUR_WHEEL_DRIVE_MODE_4H`
- `FOUR_WHEEL_DRIVE_MODE_4L`
- `TOW_MODE`
- `ESC_SPORT`
- `CREEP_OFF`
- `DRIFT_MODE`
- `TRACK_MODE`
- `UTILITY_MODE`
- `GREEN_ZONE`
- `PHEV_MODE`
- `PHEV_MODE_HEV`
- `PHEV_MODE_AUTO`
- `PHEV_MODE_EV_PLUS`
- `EREV_MODE`
- `LAUNCH_MODE`
- `ACCEL_RESPONSE_DASH`
- `ACCEL_RESPONSE_ACCEL`
- `N_BATTERY_DRAG`
- `N_BATTERY_SPRINT`
- `N_BATTERY_ENDURANCE`
- `FCA`
- `LKA`
- `LFA`
- `LCA_LEFT`
- `LCA_RIGHT`
- `ELK`
- `ICC`
- `DRIVER_ATTENTION`
