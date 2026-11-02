const n=(label,value=0,min,max)=>({kind:'number',label,default:value,min,max});
const t=(label,value='')=>({kind:'text',label,default:value});
const e=(label,options)=>({kind:'enum',label,options,default:options[0]});
const coordinate=[n('위도',37.5665,-90,90),n('경도',126.978,-180,180)];
const routeOptions=['RECOMMENDED','SHORT_DISTANCE','SHORT_TIME','FREE','HIGHWAY','COMFORTABLE','SCHOOL_ZONE'];
const locale=e('언어',['ko-KR','en-US']);
const definitions=[
 ['Location.lastKnown','위치','read','현재 위치',[]],['Location.supported','위치','read','위치 서비스 지원 여부',[]],
 ['Location.changed','위치','subscribe','위치 변경',[]],['Location.proximity','위치','subscribe','장소 진입·이탈',[...coordinate,n('반경 (m)',200,1,100000),e('감지할 변화',['BOTH','ENTER','EXIT'])]],
 ['Location.blockedPopup','위치','write','위치 접근 설정 열기',[]],
 ['Navi.requestRoute','내비게이션','write','목적지 안내 시작',[...coordinate,t('목적지 이름','목적지'),e('경로 옵션',routeOptions)]],
 ['Navi.requestRouteWithWaypoints','내비게이션','write','경유지를 거쳐 안내',[...coordinate,t('목적지 이름','목적지'),e('경로 옵션',routeOptions),{kind:'waypoints',label:'경유지',default:[]}]],
 ['Navi.addWaypoint','내비게이션','write','경유지 추가',[...coordinate,t('경유지 이름','경유지'),e('순서',['FIRST','SECOND'])]],
 ['Navi.removeWaypoint','내비게이션','write','경유지 제거',[e('순서',['FIRST','SECOND','ALL'])]],
 ['Navi.changeRouteOption','내비게이션','write','경로 옵션 변경',[e('경로 옵션',routeOptions)]],
 ['Navi.requestReRoute','내비게이션','write','경로 다시 찾기',[]],['Navi.cancelRoute','내비게이션','write','길 안내 종료',[]],
 ['Navi.requestNavigationScreen','내비게이션','write','내비게이션 화면 열기',[e('화면',['Foreground','MoveToCurrentLocationOnMap','FavoriteMain','RecentDestinations','RouteOptionList','EditRoute','NearbyChargingStations','Settings','AddHomeFavorite','AddWorkFavorite','SearchPlace','POIDetailPopup']),t('검색어 또는 장소 ID'),t('장소 하위 ID')]],
 ['Navi.requestTrip','내비게이션','read','목적지 여정 정보',[...coordinate,t('목적지 이름','목적지')]],
 ...Object.entries({getDestinationInfo:'목적지',getWaypointInfo:'경유지',getCurrentLocationInfo:'내비 현재 위치',getRouteStateInfo:'길 안내 상태',getTBTInfo:'회전 안내',getBookmarkInfo:'즐겨찾기',getRecentDestinationInfo:'최근 목적지',getChargerOperatorInfo:'충전 사업자'}).map(([method,label])=>[`Navi.${method}`,'내비게이션','read',label,[]]),
 ['Navi.events','내비게이션','subscribe','내비게이션 이벤트',[e('이벤트',['onDestinationArrived','onWayPointArrived','onRouteStarted','onRouteEnded','onRoutingCompleted','onReRouteEnded','onRouteOptionChanged','onRouteCancelled','onWaypointChanged','onBookMarkChanged','onDestinationChanged','onCurrentLocationInfo','onRouteStateInfo','onDestinationInfo','onWayPointInfo','onRecentDestinationInfo','onBookmarkInfo','onCurrentRoadSpeedLimit','onCameraAlert','onDrivingInfo','onNavigationStatus','onTBTInfo','onChargerOperatorInfo','onCautionPointInfo','onTripInfo'])]],
 ['STT.listen','음성 인식','read','말한 내용 받아쓰기',[locale]],['STT.stop','음성 인식','write','음성 인식 중지',[]],['STT.locale','음성 인식','write','인식 언어 설정',[locale]],
 ['TTS.speak','음성 출력','write','Pleos 음성 안내',[t('안내 내용','출발 준비가 완료되었습니다.'),locale]],['TTS.stop','음성 출력','write','Pleos 음성 중지',[]],['TTS.locale','음성 출력','write','안내 언어 설정',[locale]],['TTS.events','음성 출력','subscribe','음성 재생 이벤트',[e('이벤트',['onStart','onDone','onStop','onReady'])]],
 ['Gleo.command','Gleo','subscribe','Gleo 명령 받기',[e('명령',['RUN_ROUTINE','STOP_ROUTINE','LIST_ROUTINES'])]],['Gleo.respond','Gleo','write','Gleo에 결과 전달',[e('명령',['RUN_ROUTINE','STOP_ROUTINE','LIST_ROUTINES']),e('결과',['success','failure']),t('응답 메시지','요청을 처리했습니다.'),t('응답 데이터')]],
];
export const connectOperations=definitions.map(([id,domainLabel,kind,label,params])=>({id,domain:id.split('.')[0],domainLabel,kind,label,method:id.split('.')[1],params:params.map((p,i)=>({...p,key:`arg${i}`})),source:'connect'}));
