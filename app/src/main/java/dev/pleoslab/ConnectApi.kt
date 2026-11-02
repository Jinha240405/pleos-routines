package dev.pleoslab

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import ai.pleos.playground.location.fused.FusedLocation
import ai.pleos.playground.location.fused.listener.FusedLocationListener
import ai.pleos.playground.location.fused.listener.ProximityAlertListener
import ai.pleos.playground.location.fused.model.*
import ai.pleos.playground.navi.helper.NaviHelper
import ai.pleos.playground.navi.helper.listener.NaviHelperEventListener
import ai.pleos.playground.navi.data.*
import ai.pleos.playground.navi.constants.*
import ai.pleos.playground.stt.SpeechToText
import ai.pleos.playground.tts.TextToSpeech
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/** Dedicated lifecycle adapters for navigation, location and on-device speech. */
class ConnectApi(private val context: Context, private val event: (String, Any?, String?) -> Unit) {
    private val main = Handler(Looper.getMainLooper())
    private var location: FusedLocation? = null
    private var navi: NaviHelper? = null
    private var stt: SpeechToText? = null
    private var tts: TextToSpeech? = null
    private var naviReady = false
    private var sttReady = false
    private var ttsReady = false
    private var closed = false
    private val removes = mutableMapOf<String, () -> Unit>()
    private val eventFilters = mutableMapOf<String, Pair<String, String>>()
    private data class Waiting(val event: String, val active: () -> Boolean, val done: (Any?) -> Unit, val failed: (String) -> Unit)
    private var navWaiting: Waiting? = null
    private var speechWaiting: Waiting? = null
    private var voiceWaiting: Waiting? = null
    private val navListener = VehicleApi.proxy(NaviHelperEventListener::class.java) { name, args -> main.post {
        if (!closed) {
            val value = VehicleApi.pack(args)
            if (name == "onError") { navWaiting?.let { if (it.active()) it.failed("내비게이션: $value") }; navWaiting = null }
            else if (name == navWaiting?.event) { val pending = navWaiting; navWaiting = null; if (pending?.active() == true) pending.done(value) }
            publish("Navi",name,value)
        }
    } } as NaviHelperEventListener
    private fun publish(domain: String, name: String, value: Any?) { eventFilters.toMap().forEach { (token, filter) -> if (filter.first == domain && filter.second == name) event(token, value, null) } }
    private fun loc(): FusedLocation {
        val client = location ?: FusedLocation(context).also { location = it }
        require(client.isSupported()) { "이 환경에서는 Pleos 위치 서비스를 지원하지 않습니다." }
        if (locationInitialized.not()) { client.initialize(); locationInitialized = true }
        return client
    }
    private var locationInitialized = false
    private fun nav(active: () -> Boolean, done: (NaviHelper) -> Unit, failed: (String) -> Unit) {
        val client = navi ?: NaviHelper(context).also { navi=it }
        if (naviReady) { if (active()) done(client); return }
        client.initialize(onConnected = { main.post { if (!closed) { naviReady=true; client.addListener(navListener); if(active())done(client) } } }, onFailed = { e -> main.post { if(active())failed(VehicleApi.message(e)) } })
    }
    private val sttListener = object : ai.pleos.playground.stt.listener.ResultListener {
        override fun onUpdated(text: String, isFinal: Boolean) { main.post { if (isFinal) { val p=speechWaiting;speechWaiting=null;if(p?.active()==true)p.done(text);stt?.stop() } } }
        override fun onError(error: ai.pleos.playground.stt.constant.ErrorType) { main.post { val p=speechWaiting;speechWaiting=null;if(p?.active()==true)p.failed("음성 인식: $error") } }
        override fun onEndedRecognition() {}
        override fun onStartedRecognition() {}
        override fun onReady() {}
        override fun onUpdatedEpdData(start: Long, end: Long) {}
        override fun onUpdatedRms(value: Double) {}
    }
    private val ttsListener = object : ai.pleos.playground.tts.listener.EventListener {
        override fun onDone() { main.post { val p=voiceWaiting;voiceWaiting=null;if(p?.active()==true)p.done(JSONObject().put("status","completed"));publish("TTS","onDone",true) } }
        override fun onError(error: ai.pleos.playground.tts.constant.ErrorType) { main.post { val p=voiceWaiting;voiceWaiting=null;if(p?.active()==true)p.failed("음성 출력: $error"); eventFilters.filterValues { it.first=="TTS" }.keys.forEach { event(it,null,"음성 출력: $error") } } }
        override fun onStart() { main.post { publish("TTS","onStart",true) } }
        override fun onReady() { main.post { publish("TTS","onReady",true) } }
        override fun onStop() { main.post { publish("TTS","onStop",true) } }
        override fun onUpdatedRms(value: Double) {}
    }
    private fun speech(active: () -> Boolean, done: (SpeechToText) -> Unit, failed: (String) -> Unit) {
        val client=stt?:SpeechToText(context,ai.pleos.playground.stt.constant.Mode.ON_DEVICE).also { stt=it }
        if(sttReady){if(active())done(client);return}
        client.initialize(object:ai.pleos.playground.stt.listener.OnInitializeListener{
            override fun onSuccess(){main.post{if(!closed){sttReady=true;client.addListener(sttListener);if(active())done(client)}}}
            override fun onFailure(error:ai.pleos.playground.stt.constant.ErrorType){main.post{if(active())failed("음성 인식 초기화: $error")}}
        })
    }
    private fun voice(active: () -> Boolean, done: (TextToSpeech) -> Unit, failed: (String) -> Unit) {
        val client=tts?:TextToSpeech(context,ai.pleos.playground.tts.constant.Mode.ON_DEVICE).also { tts=it }
        if(ttsReady){if(active())done(client);return}
        client.initialize(object:ai.pleos.playground.tts.listener.OnInitializeListener{
            override fun onSuccess(){main.post{if(!closed){ttsReady=true;client.addEventListener(ttsListener);if(active())done(client)}}}
            override fun onFailure(error:ai.pleos.playground.tts.constant.ErrorType){main.post{if(active())failed("음성 출력 초기화: $error")}}
        })
    }

    fun invoke(id: String, args: JSONArray, active: () -> Boolean, done: (Any?) -> Unit, failed: (String) -> Unit) {
        if (!active() || closed) return
        try {
            when(id) {
                "Location.supported" -> done((location?:FusedLocation(context).also{location=it}).isSupported())
                "Location.lastKnown" -> loc().getLastKnownLocation(object:FusedLocationListener{
                    override fun onChanged(data:LocationData?){main.post{if(active())done(data)}}
                    override fun onError(e:Exception){main.post{if(active())failed(VehicleApi.message(e))}}
                })
                "Location.blockedPopup" -> {loc().showLocationAccessBlockedPopup();done(requested())}
                "STT.listen" -> speech(active,{ client ->
                    try{require(speechWaiting?.active()!=true){"음성 인식이 진행 중입니다."};client.setLocale(language(args.getString(0)));speechWaiting=Waiting("",active,done,failed);client.request()}catch(e:Exception){failed(VehicleApi.message(e))}
                },failed)
                "STT.stop" -> {speechWaiting?.failed?.invoke("음성 인식을 중지했어요.");speechWaiting=null;stt?.stop();done(requested())}
                "STT.locale" -> speech(active,{it.setLocale(language(args.getString(0)));done(requested())},failed)
                "TTS.speak" -> voice(active,{ client ->
                    try{require(voiceWaiting?.active()!=true){"음성 안내가 진행 중입니다."};val text=args.getString(0);require(text.length in 1..4000);client.setLocale(language(args.getString(1)));voiceWaiting=Waiting("",active,done,failed);client.speak(text,true)}catch(e:Exception){failed(VehicleApi.message(e))}
                },failed)
                "TTS.stop" -> {voiceWaiting?.failed?.invoke("음성 출력을 중지했어요.");voiceWaiting=null;tts?.stop();done(requested())}
                "TTS.locale" -> voice(active,{it.setLocale(language(args.getString(0)));done(requested())},failed)
                "Gleo.respond" -> { respondGleo(args.getString(0),args.getString(1),args.getString(2),args.optString(3));done(requested()) }
                else -> if(id.startsWith("Navi.")) nav(active,{ client -> try { navigation(client,id.removePrefix("Navi."),args,active,done,failed) }catch(e:Exception){failed(VehicleApi.message(e))} },failed) else error("등록되지 않은 연결 기능입니다.")
            }
        }catch(e:Exception){failed(VehicleApi.message(e))}
    }

    private fun navigation(client:NaviHelper,method:String,a:JSONArray,active:()->Boolean,done:(Any?)->Unit,failed:(String)->Unit){
        val responses=mapOf("getDestinationInfo" to "onDestinationInfo","getWaypointInfo" to "onWayPointInfo","getCurrentLocationInfo" to "onCurrentLocationInfo","getRouteStateInfo" to "onRouteStateInfo","getTBTInfo" to "onTBTInfo","getBookmarkInfo" to "onBookmarkInfo","getRecentDestinationInfo" to "onRecentDestinationInfo","getChargerOperatorInfo" to "onChargerOperatorInfo","requestTrip" to "onTripInfo","requestRoute" to "onRoutingCompleted","requestRouteWithWaypoints" to "onRoutingCompleted","cancelRoute" to "onRouteCancelled","requestReRoute" to "onReRouteEnded","addWaypoint" to "onWaypointChanged","removeWaypoint" to "onWaypointChanged","changeRouteOption" to "onRouteOptionChanged")
        require(navWaiting?.active()!=true){"다른 내비게이션 응답을 기다리는 중입니다."}
        responses[method]?.let{navWaiting=Waiting(it,active,done,failed)}
        try { when(method){
            "getDestinationInfo" -> client.getDestinationInfo()
            "getWaypointInfo" -> client.getWaypointInfo()
            "getCurrentLocationInfo" -> client.getCurrentLocationInfo()
            "getRouteStateInfo" -> client.getRouteStateInfo()
            "getTBTInfo" -> client.getTBTInfo()
            "getBookmarkInfo" -> client.getBookmarkInfo()
            "getRecentDestinationInfo" -> client.getRecentDestinationInfo()
            "getChargerOperatorInfo" -> client.getChargerOperatorInfo()
            "requestTrip" -> client.requestTrip(TripRequest(latitude(a.getDouble(0)),longitude(a.getDouble(1)),"",a.getString(2),""))
            "requestRoute" -> client.requestRoute(route(a))
            "requestRouteWithWaypoints" -> {val points=a.getJSONArray(4);require(points.length()<=2){"경유지는 두 곳까지 설정할 수 있습니다."};client.requestRouteWithWaypoints(RouteWithWaypointsRequest(route(a),(0 until points.length()).map{i->val p=points.getJSONObject(i);RequestWaypointInfo(latitude(p.getDouble("latitude")),longitude(p.getDouble("longitude")),p.optString("name"),if(i==0)WaypointIndex.FIRST else WaypointIndex.SECOND,"","","","")}))}
            "addWaypoint" -> client.addWaypoint(RequestWaypointInfo(latitude(a.getDouble(0)),longitude(a.getDouble(1)),a.getString(2),WaypointIndex.valueOf(a.getString(3)),"","","",""))
            "removeWaypoint" -> client.removeWaypoint(WaypointIndex.valueOf(a.getString(0)))
            "changeRouteOption" -> client.changeRouteOption(RouteOption.valueOf(a.getString(0)))
            "requestReRoute" -> client.requestReRoute()
            "cancelRoute" -> client.cancelRoute()
            "requestNavigationScreen" -> {client.requestNavigationScreen(screen(a));done(requested())}
            else -> error("등록되지 않은 내비게이션 기능입니다.")
        }}catch(e:Exception){navWaiting=null;throw e}
    }
    private fun route(a:JSONArray)=RouteInfo(latitude(a.getDouble(0)),longitude(a.getDouble(1)),null,null,a.getString(2),"","","",RouteOption.valueOf(a.getString(3)),"",false)
    private fun screen(a:JSONArray):NavigationScreenRequest=when(a.getString(0)){
        "Foreground" -> NavigationScreenRequest.Foreground
        "MoveToCurrentLocationOnMap" -> NavigationScreenRequest.MoveToCurrentLocationOnMap
        "FavoriteMain" -> NavigationScreenRequest.FavoriteMain
        "RecentDestinations" -> NavigationScreenRequest.RecentDestinations
        "RouteOptionList" -> NavigationScreenRequest.RouteOptionList
        "EditRoute" -> NavigationScreenRequest.EditRoute
        "NearbyChargingStations" -> NavigationScreenRequest.NearbyChargingStations
        "Settings" -> NavigationScreenRequest.Settings
        "AddHomeFavorite" -> NavigationScreenRequest.AddHomeFavorite
        "AddWorkFavorite" -> NavigationScreenRequest.AddWorkFavorite
        "SearchPlace" -> NavigationScreenRequest.SearchPlace(a.getString(1))
        "POIDetailPopup" -> NavigationScreenRequest.POIDetailPopup(a.getString(1),a.getString(2))
        else -> error("지원하지 않는 내비게이션 화면입니다.")
    }
    fun subscribe(id:String,a:JSONArray,token:String,active:()->Boolean,done:()->Unit,failed:(String)->Unit){
        try{require(removes.size<32||removes.containsKey(token));unsubscribe(token)
            when(id){
                "Location.changed" -> {
                    val client=loc();val listener=object:FusedLocationListener{
                        override fun onChanged(data:LocationData?){main.post{if(removes.containsKey(token))event(token,data,null)}}
                        override fun onError(e:Exception){main.post{if(removes.containsKey(token))event(token,null,VehicleApi.message(e))}}
                    };removes[token]={client.unregisterFusedLocationCallback(listener)};client.registerFusedLocationCallback(listener);done()
                }
                "Location.proximity" -> {
                    val client=loc();val types=when(a.getString(3)){"ENTER"->setOf(ProximityTransition.ENTER);"EXIT"->setOf(ProximityTransition.EXIT);"BOTH"->setOf(ProximityTransition.ENTER,ProximityTransition.EXIT);else->error("잘못된 진입/이탈 설정")}
                    val radius=a.getDouble(2);require(radius in 1.0..100000.0)
                    removes[token]={}
                    client.addProximityAlert(ProximityAlertRequest(latitude(a.getDouble(0)),longitude(a.getDouble(1)),radius.toFloat(),types),object:ProximityAlertListener{
                        override fun onRegistered(id:String){main.post{if(removes.containsKey(token)&&active()){removes[token]={client.removeProximityAlert(id)};done()}else client.removeProximityAlert(id)}}
                        override fun onTransition(value:ProximityAlertEvent){main.post{if(removes.containsKey(token))event(token,value,null)}}
                        override fun onError(e:Exception){main.post{unsubscribe(token);if(active())failed(VehicleApi.message(e))}}
                    })
                }
                "Navi.events" -> nav(active,{eventFilters[token]="Navi" to a.getString(0);removes[token]={eventFilters.remove(token)};done()},failed)
                "TTS.events" -> voice(active,{eventFilters[token]="TTS" to a.getString(0);removes[token]={eventFilters.remove(token)};done()},failed)
                "Gleo.command" -> {require(a.getString(0) in gleoActions);eventFilters[token]="Gleo" to a.getString(0);removes[token]={eventFilters.remove(token)};done()}
                else -> error("지원하지 않는 이벤트입니다.")
            }
        }catch(e:Exception){unsubscribe(token);failed(VehicleApi.message(e))}
    }
    fun receiveGleo(action:String,parameters:JSONObject):Boolean{
        if(action !in gleoActions)return false
        val matches=eventFilters.filterValues{it.first=="Gleo"&&it.second==action}
        if(matches.isEmpty()){respondGleo(action,"failure","앱에서 Gleo 명령 감지를 먼저 켜 주세요.","");return false}
        publish("Gleo",action,parameters);return true
    }
    fun respondGleo(action:String,status:String,message:String,data:String){
        require(action in gleoActions&&status in listOf("success","failure"));require(message.length<=4000&&data.length<=4000)
        val response=JSONObject().put("functionName",action).put("status",status).put("message",message).put("data",data)
        context.sendBroadcast(Intent("ai.pleos.playground.intent.action.APP_ACTION_RESPONSE").putExtra("packageName",context.packageName).putExtra("response",response.toString()))
    }
    fun unsubscribe(token:String){removes.remove(token)?.let{try{it()}catch(_:Exception){}};eventFilters.remove(token)}
    fun clearSubscriptions(){removes.keys.toList().forEach(::unsubscribe)}
    fun cancel(){navWaiting=null;speechWaiting=null;voiceWaiting=null;try{stt?.stop()}catch(_:Exception){};try{tts?.stop()}catch(_:Exception){}}
    fun release(){clearSubscriptions();cancel();closed=true;main.removeCallbacksAndMessages(null);try{location?.release()}catch(_:Exception){};try{navi?.removeListener(navListener);navi?.release()}catch(_:Exception){};try{stt?.removeListener(sttListener);stt?.release()}catch(_:Exception){};try{tts?.removeEventListener(ttsListener);tts?.release()}catch(_:Exception){}}
    companion object{
        val gleoActions=setOf("RUN_ROUTINE","STOP_ROUTINE","LIST_ROUTINES")
        private fun requested()=JSONObject().put("status","requested")
        private fun latitude(v:Double)=v.also{require(it.isFinite()&&it in -90.0..90.0){"위도 범위를 확인해 주세요."}}
        private fun longitude(v:Double)=v.also{require(it.isFinite()&&it in -180.0..180.0){"경도 범위를 확인해 주세요."}}
        private fun language(tag:String)=Locale.forLanguageTag(tag.also{require(it in listOf("ko-KR","en-US"))})
    }
}
