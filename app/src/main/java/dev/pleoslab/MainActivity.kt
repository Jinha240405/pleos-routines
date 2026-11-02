package dev.pleoslab

import ai.pleos.playground.vehicle.Vehicle
import ai.pleos.playground.vehicle.api.model.area.DoorArea
import ai.pleos.playground.vehicle.constant.area.DoorValue
import android.annotation.SuppressLint
import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream
import java.util.Locale
import org.json.JSONObject
import org.json.JSONArray

/** Offline card editor with catalogued, typed native requests. */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private val main = Handler(Looper.getMainLooper())
    private var vehicle: Vehicle? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var alive = true
    private var foreground = false
    private var subscriptionGeneration = 0
    private val pending = mutableSetOf<Int>()
    private var exportText: String? = null
    private val area = DoorArea(DoorValue.ROW_1_LEFT)
    private val vehicleApi by lazy { VehicleApi(this, ::emitEvent) }
    private val connectApi by lazy { ConnectApi(this, ::emitEvent) }
    private val apiCatalog by lazy { JSONObject(assets.open("api-catalog.json").bufferedReader().use { it.readText() }).getJSONArray("operations").let { entries -> (0 until entries.length()).associate { entries.getJSONObject(it).let { e -> e.getString("id") to e } } } }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.WHITE
        window.navigationBarColor = Color.WHITE
        window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        WebView.setWebContentsDebuggingEnabled(applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0)
        web = WebView(this)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = false
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            useWideViewPort = true
            loadWithOverviewMode = true
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = true
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
                val path = request.url.path.orEmpty()
                if (request.url.scheme != "https" || request.url.host != "appassets.androidplatform.net" ||
                    !path.startsWith("/assets/editor/") || path.contains("..") || path.contains('\\')) return blocked()
                return try {
                    val mime = when (path.substringAfterLast('.')) {
                        "html" -> "text/html"
                        "js" -> "application/javascript"
                        "css" -> "text/css"
                        "svg" -> "image/svg+xml"
                        "woff2" -> "font/woff2"
                        "png" -> "image/png"
                        "gif" -> "image/gif"
                        "mp3" -> "audio/mpeg"
                        else -> "application/octet-stream"
                    }
                    WebResourceResponse(mime, "UTF-8", 200, "OK", mapOf(
                        "Content-Security-Policy" to "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'",
                        "X-Content-Type-Options" to "nosniff"
                    ), assets.open(path.removePrefix("/assets/")))
                } catch (_: Exception) { blocked() }
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onJsConfirm(view: WebView, url: String, message: String, result: android.webkit.JsResult): Boolean {
                android.app.AlertDialog.Builder(this@MainActivity).setMessage(message)
                    .setPositiveButton("확인") { _, _ -> result.confirm() }
                    .setNegativeButton("취소") { _, _ -> result.cancel() }
                    .setOnCancelListener { result.cancel() }.show()
                return true
            }
        }
        web.addJavascriptInterface(Bridge(), "AndroidBridge")
        setContentView(web)
        tts = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                val language = tts?.setLanguage(Locale.KOREAN)
                ttsReady = language != null && language >= TextToSpeech.LANG_AVAILABLE
            }
        }
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) { utteranceId?.toIntOrNull()?.let { reply(it, true) } }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) { utteranceId?.toIntOrNull()?.let { fail(it, "기기 음성 출력에 실패했어요.") } }
            override fun onError(utteranceId: String?, errorCode: Int) { onError(utteranceId) }
        })
        web.loadUrl("https://appassets.androidplatform.net/assets/editor/index.html")
        receiveGleo(intent)
    }
    private fun blocked() = WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", emptyMap(), ByteArrayInputStream(ByteArray(0)))

    inner class Bridge {
        @JavascriptInterface fun loadState(): String = getSharedPreferences("routines", MODE_PRIVATE).getString("workspace", "").orEmpty()
        // Runs on the WebView bridge thread; commit lets the UI report disk failures accurately.
        @SuppressLint("ApplySharedPref")
        @JavascriptInterface fun saveState(text: String): Boolean {
            if (text.length > 5_000_000) return false
            return try {
                val state = JSONObject(text)
                if (state.optInt("version") != 1 || state.getJSONArray("routines").length() > 50) return false
                getSharedPreferences("routines", MODE_PRIVATE).edit().putString("workspace", text).commit()
            } catch (_: Exception) { false }
        }
        @JavascriptInterface fun copyText(text: String) {
            if (text.length > 500_000) return
            main.post { (getSystemService(CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Pleos Routine", text)) }
        }
        @JavascriptInterface fun request(text: String) {
            if (text.length > 600_000) return
            try {
                val request = JSONObject(text)
                val id = request.getInt("id")
                main.post {
                    if (!alive) return@post
                    pending.add(id)
                    main.postDelayed({ if (pending.contains(id)) fail(id, "기기 응답 시간이 초과됐어요.") }, 11000)
                    if (!foreground && request.optString("action") != "cancel") { fail(id, "앱 화면에서 다시 실행해 주세요."); return@post }
                    try {
                        when (request.getString("action")) {
                            "door" -> readDoor(id)
                            "speak" -> speak(id, request.getString("text"))
                            "cancel" -> { tts?.stop(); vehicleApi.stopMotion(); connectApi.cancel(); cancelPending(id); reply(id, true) }
                            "api.invoke", "api.subscribe" -> apiRequest(id, request)
                            "api.unsubscribe" -> { val token=request.getString("token");vehicleApi.unsubscribe(token);connectApi.unsubscribe(token);reply(id,true) }
                            "api.clearSubscriptions" -> {subscriptionGeneration++;vehicleApi.clearSubscriptions();connectApi.clearSubscriptions();reply(id,true)}
                            "permissions" -> { requestVehiclePermissions();reply(id,permissionState()) }
                            "permissionState" -> reply(id,permissionState())
                            "diagnostics" -> { reply(id, true); startActivity(Intent(this@MainActivity, DiagnosticsActivity::class.java)) }
                            "export" -> export(id, request.getString("text"), request.optString("name", "routine"))
                            else -> fail(id, "지원하지 않는 기기 요청입니다.")
                        }
                    } catch (e: Exception) { fail(id, e.message ?: "기기 연결에 실패했어요.") }
                }
            } catch (_: Exception) { /* Invalid envelopes have no executable action. */ }
        }
    }
    private fun apiRequest(id:Int, request:JSONObject) {
        val key=request.getString("operation")
        val spec=apiCatalog[key]?:error("등록되지 않은 기능입니다.")
        require(!spec.optBoolean("disabled")){"이 기능은 사용이 중단되었습니다."}
        val args=request.optJSONArray("args")?:JSONArray()
        vehicleApi.validateArgs(spec,args)
        val generation=subscriptionGeneration
        val subscribing=request.getString("action")=="api.subscribe"
        val active={alive && foreground && pending.contains(id) && (!subscribing||generation==subscriptionGeneration)}
        val failure:(String)->Unit={fail(id,it)}
        val connect=spec.optString("source")=="connect"
        if(request.getString("action")=="api.subscribe") {
            require(spec.getString("kind")=="subscribe")
            val token=request.getString("token");require(token.length in 1..120)
            if(connect)connectApi.subscribe(key,args,token,active,{reply(id,JSONObject().put("status","registered"))},failure)
            else vehicleApi.subscribe(key,args,token,active,{reply(id,JSONObject().put("status","registered"))},failure)
        }else{
            require(spec.getString("kind") in listOf("read","write","capability"))
            val done:(Any?)->Unit={reply(id,VehicleApi.encode(it))}
            if(connect)connectApi.invoke(key,args,active,done,failure) else vehicleApi.invoke(key,args,active,done,failure)
        }
    }
    private fun emitEvent(token:String,value:Any?,error:String?) {
        val payload=JSONObject().put("value",VehicleApi.encode(value))
        main.post {if(alive&&foreground)web.evaluateJavascript("window.PleosNative && window.PleosNative.event(${JSONObject.quote(token)}, ($payload).value, ${error?.let(JSONObject::quote)?:"null"});",null)}
    }
    @Suppress("DEPRECATION")
    private fun permissionState():JSONArray {
        val names=packageManager.getPackageInfo(packageName,android.content.pm.PackageManager.GET_PERMISSIONS).requestedPermissions?:emptyArray()
        return JSONArray(names.map {name->JSONObject().put("permission",name).put("granted",checkSelfPermission(name)==android.content.pm.PackageManager.PERMISSION_GRANTED)})
    }
    private fun requestVehiclePermissions(){
        val state=permissionState()
        val names=(0 until state.length()).map(state::getJSONObject).filter{!it.getBoolean("granted")}.map{it.getString("permission")}.filter{try{packageManager.getPermissionInfo(it,0).protectionLevel and android.content.pm.PermissionInfo.PROTECTION_MASK_BASE == android.content.pm.PermissionInfo.PROTECTION_DANGEROUS}catch(_:Exception){false}}
        if(names.isNotEmpty())requestPermissions(names.toTypedArray(),102)
    }
    override fun onNewIntent(intent:Intent){super.onNewIntent(intent);setIntent(intent);receiveGleo(intent)}
    private fun receiveGleo(intent:Intent){
        val action=intent.action?:return
        if(action !in ConnectApi.gleoActions)return
        try{val raw=intent.getStringExtra("ACTION_PARAM")?:"{}";require(raw.length<=4000);val decoded=org.json.JSONTokener(raw).nextValue();val args=if(decoded is String)JSONObject(decoded)else decoded as JSONObject;connectApi.receiveGleo(action,args)}catch(_:Exception){connectApi.respondGleo(action,"failure","명령 인자를 확인해 주세요.","")}
    }
    private fun readDoor(id: Int) {
        val session = vehicle ?: Vehicle(applicationContext).also { it.initialize(); vehicle = it }
        val door = session.getDoor()
        door.checkDoorPositionCapabilities(
            onComplete = { _, ranges ->
                if (!alive || !foreground) return@checkDoorPositionCapabilities
                if (ranges[area] == null) fail(id, "운전석 도어 조회를 지원하지 않는 차량이에요.")
                else try {
                    door.getCurrentDoorPosition(area = area,
                        onComplete = { value ->
                            if (value == null) fail(id, "SDK가 도어 값을 반환하지 않았어요.")
                            else reply(id, JSONObject().put("raw", value).put("open", value > 0))
                        },
                        onFailed = { error -> fail(id, "도어 조회 실패: ${error.message}") }
                    )
                } catch (e: Exception) { fail(id, "도어 조회 예외: ${e.message}") }
            },
            onFailed = { error -> fail(id, "지원 범위 조회 실패: ${error.message}") }
        )
    }
    private fun speak(id: Int, text: String) {
        if (!ttsReady) { fail(id, "한국어 TTS 엔진이 준비되지 않았어요. 기기의 음성 설정을 확인해 주세요."); return }
        if (text.length > 4000) { fail(id, "음성 문장은 4,000자 이하여야 해요."); return }
        if (tts?.speak(text, TextToSpeech.QUEUE_ADD, null, id.toString()) == TextToSpeech.ERROR) fail(id, "음성 출력을 시작하지 못했어요.")
    }
    private fun export(id: Int, text: String, name: String) {
        if (text.length > 500_000) { fail(id, "루틴 파일이 너무 큽니다."); return }
        exportText = text
        reply(id, true)
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE); type = "application/json"
            putExtra(Intent.EXTRA_TITLE, name.replace(Regex("[<>:\"/\\\\|?*]"), "_") + ".pleos.json")
        }
        @Suppress("DEPRECATION")
        startActivityForResult(intent, 101)
    }
    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 101 && resultCode == RESULT_OK) {
            try {
                val uri = data?.data ?: return
                val text = exportText ?: return
                contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray(Charsets.UTF_8)) }
                    ?: throw IllegalStateException("파일을 열 수 없어요.")
                android.widget.Toast.makeText(this, "루틴 파일을 저장했어요.", android.widget.Toast.LENGTH_SHORT).show()
            } catch (e: Exception) { android.widget.Toast.makeText(this, "저장 실패: ${e.message}", android.widget.Toast.LENGTH_LONG).show() }
        }
        exportText = null
    }
    private fun reply(id: Int, value: Any) = deliver(id, JSONObject().put("ok", true).put("value", value))
    private fun fail(id: Int, message: String) = deliver(id, JSONObject().put("ok", false).put("error", message))
    private fun deliver(id: Int, response: JSONObject) {
        main.post {
            if (alive && pending.remove(id)) web.evaluateJavascript("window.PleosNative && window.PleosNative.resolve($id, $response);", null)
        }
    }
    private fun cancelPending(except: Int? = null) { pending.toList().filter { it != except }.forEach { fail(it, "실행을 중지했어요.") } }
    override fun onResume() { super.onResume(); foreground = true; if (::web.isInitialized) web.onResume() }
    override fun onPause() {
        foreground = false; subscriptionGeneration++;tts?.stop(); vehicleApi.stopMotion(); vehicleApi.clearSubscriptions();connectApi.clearSubscriptions();connectApi.cancel();cancelPending()
        if (::web.isInitialized) { web.evaluateJavascript("window.PleosNative && window.PleosNative.pause();", null); web.onPause() }
        super.onPause()
    }
    override fun onDestroy() {
        alive = false; main.removeCallbacksAndMessages(null); pending.clear(); tts?.stop(); tts?.shutdown()
        try { vehicle?.release() } catch (_: Exception) {}
        vehicleApi.release();connectApi.release()
        web.removeJavascriptInterface("AndroidBridge"); web.destroy()
        super.onDestroy()
    }
}
