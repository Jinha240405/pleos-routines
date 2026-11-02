package dev.pleoslab

import ai.pleos.playground.vehicle.Vehicle
import ai.pleos.playground.vehicle.api.model.area.DoorArea
import ai.pleos.playground.vehicle.constant.area.DoorValue
import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.net.URL
import java.util.concurrent.Executors
import javax.net.ssl.HttpsURLConnection

/** Read-only environment probe; no vehicle control calls are present. */
class DiagnosticsActivity : Activity() {
    private var vehicle: Vehicle? = null
    private var initialized = false
    @Volatile private var alive = true
    @Volatile private var requestId = 0
    private val main = Handler(Looper.getMainLooper())
    private val network = Executors.newSingleThreadExecutor()
    private lateinit var status: TextView
    private lateinit var logView: TextView
    private lateinit var readButton: Button
    private val entries = ArrayDeque<String>()
    private val area = DoorArea(DoorValue.ROW_1_LEFT)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(15, 24, 30)
        window.navigationBarColor = Color.rgb(15, 24, 30)
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(32), dp(26), dp(32), dp(32))
            setBackgroundColor(Color.rgb(15, 24, 30))
        }
        val scroll = ScrollView(this).apply { addView(body) }
        setContentView(scroll)
        body.addView(label("PLEOS LAB   /   DEVELOPMENT WORKSPACE", 14, "#BCE88D"))
        body.addView(label("차량 앱 개발의 첫 연결", 30, "#F4F5EF").apply { setPadding(0, dp(20), 0, dp(12)) })
        body.addView(label("Vehicle SDK 2.3.2  ·  Android API ${android.os.Build.VERSION.SDK_INT}  ·  minSdk 28", 15, "#AAB9C0"))
        status = label("연결 대기 · 버튼을 눌러 실제 SDK 응답을 확인하세요.", 18, "#F4F5EF")
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(22), dp(24), dp(22))
            background = GradientDrawable().apply { cornerRadius = dp(20).toFloat(); setColor(Color.rgb(29, 42, 49)) }
        }
        body.addView(card, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(26) })
        card.addView(status)
        readButton = Button(this).apply {
            text = "SDK 연결 및 운전석 도어 상태 읽기"
            isAllCaps = false
            minHeight = dp(64)
            setOnClickListener { probeDoor() }
        }
        card.addView(readButton, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(16) })
        card.addView(Button(this).apply {
            text = "외부 HTTPS 연결 확인"
            isAllCaps = false
            minHeight = dp(56)
            setOnClickListener { testNetwork(this) }
        })
        card.addView(label("조회 전용 진단 앱입니다. 표시값은 SDK 응답이며 임의 값으로 대체하지 않습니다.", 14, "#AAB9C0"))
        body.addView(label("API ACTIVITY", 13, "#BCE88D").apply { setPadding(0, dp(24), 0, dp(10)) })
        logView = label("아직 실행한 API가 없습니다.", 14, "#BECBD1").apply { typeface = Typeface.MONOSPACE; setTextIsSelectable(true) }
        body.addView(logView)
        event("Ready. Vehicle SDK is linked; service connectivity is not yet verified.")
        if (intent.getBooleanExtra("probe_readonly", false)) {
            main.postDelayed({ if (alive) probeDoor() }, 1500)
        }
    }

    private fun probeDoor() {
        val current = ++requestId
        readButton.isEnabled = false
        status.text = "차량 서비스와 지원 범위 확인 중…"
        val timeout = Runnable {
            if (alive && current == requestId) {
                requestId++
                status.text = "응답 시간 초과 · Pleos 전용 에뮬레이터인지 확인하세요."
                readButton.isEnabled = true
                event("TIMEOUT: no completed door read within 12 seconds.")
            }
        }
        main.postDelayed(timeout, 12000)
        fun finish(message: String) = runOnUiThread {
            if (alive && current == requestId) {
                main.removeCallbacks(timeout)
                status.text = message
                readButton.isEnabled = true
                event(message)
            }
        }
        try {
            val session = vehicle ?: Vehicle(applicationContext).also { vehicle = it }
            if (!initialized) {
                session.initialize()
                initialized = true
                event("initialize() returned; this alone does not prove service readiness.")
            }
            val door = session.getDoor()
            door.checkDoorPositionCapabilities(
                onComplete = { config, ranges ->
                    if (alive && current == requestId) {
                        val range = ranges[area]
                        event("CAPABILITY access=${config.accessType}; driver range=${range?.minValue}..${range?.maxValue}")
                        if (range == null) {
                            finish("운전석 도어의 지원 범위를 받지 못했습니다.")
                        } else {
                            try {
                                door.getCurrentDoorPosition(
                                    area = area,
                                    onComplete = { value -> finish(if (value == null) "응답 성공 · 현재 도어 값은 null입니다." else "실제 SDK 응답 · 운전석 도어 위치: $value") },
                                    onFailed = { error -> finish("도어 조회 실패: ${error.message ?: error.javaClass.simpleName}") }
                                )
                            } catch (error: Exception) {
                                finish("도어 조회 예외: ${error.message ?: error.javaClass.simpleName}")
                            }
                        }
                    }
                },
                onFailed = { error -> finish("지원 범위 확인 실패: ${error.message ?: error.javaClass.simpleName}") }
            )
        } catch (error: Exception) {
            finish("SDK 연결 실패: ${error.message ?: error.javaClass.simpleName}")
        }
    }

    private fun testNetwork(button: Button) {
        button.isEnabled = false
        event("HTTPS: connecting to developers.pleos.ai (no vehicle data sent).")
        network.submit {
            var connection: HttpsURLConnection? = null
            val result = try {
                connection = URL("https://developers.pleos.ai/playground").openConnection() as HttpsURLConnection
                connection.connectTimeout = 7000
                connection.readTimeout = 7000
                connection.requestMethod = "HEAD"
                "HTTPS result: HTTP ${connection.responseCode} (AI credentials / access tested separately)."
            } catch (error: Exception) { "HTTPS failed: ${error.javaClass.simpleName}: ${error.message}" }
            finally { connection?.disconnect() }
            runOnUiThread { if (alive) { event(result); button.isEnabled = true } }
        }
    }

    private fun event(message: String) {
        Log.i("PleosLab", message)
        runOnUiThread {
            if (alive && ::logView.isInitialized) {
                entries.addFirst(message)
                while (entries.size > 20) entries.removeLast()
                logView.text = entries.joinToString("\n\n")
            }
        }
    }
    private fun label(value: String, size: Int, color: String) = TextView(this).apply {
        text = value; textSize = size.toFloat(); setTextColor(Color.parseColor(color)); setLineSpacing(dp(3).toFloat(), 1f)
    }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    override fun onDestroy() {
        alive = false
        requestId++
        main.removeCallbacksAndMessages(null)
        network.shutdownNow()
        try { if (initialized) vehicle?.release() } catch (ignored: Exception) { Log.w("PleosLab", "release failed", ignored) }
        super.onDestroy()
    }
}
