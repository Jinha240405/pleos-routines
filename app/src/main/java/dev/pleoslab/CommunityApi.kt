package dev.pleoslab

import android.content.Context
import java.net.HttpURLConnection
import java.net.URL
import java.io.ByteArrayOutputStream
import java.security.SecureRandom
import java.util.concurrent.Executors
import org.json.JSONObject

/** Sends JSON data only; remote pages and scripts never enter the WebView. */
class CommunityApi(context: Context) {
    private val executor = Executors.newSingleThreadExecutor()
    private val preferences = context.getSharedPreferences("community", Context.MODE_PRIVATE)
    private val token: String by lazy {
        preferences.getString("ownerKey", null) ?: ByteArray(32).also { SecureRandom().nextBytes(it) }
            .joinToString("") { "%02x".format(it.toInt() and 255) }.also {
                check(preferences.edit().putString("ownerKey", it).commit()) { "모두의 루틴 기기 키를 저장하지 못했어요." }
            }
    }
    fun request(request: JSONObject, active: () -> Boolean, done: (JSONObject) -> Unit, fail: (String) -> Unit) {
        val path = request.getString("path")
        val method = request.optString("method", "GET")
        require(path.matches(Regex("(?:health|posts(?:/[a-f0-9-]{36}(?:/download)?)?)(?:\\?[^#\\r\\n]*)?"))) { "지원하지 않는 모두의 루틴 주소예요." }
        require(method in listOf("GET", "POST", "DELETE"))
        val endpoint = BuildConfig.COMMUNITY_URL
        if (endpoint.isBlank()) { fail("모두의 루틴 서버가 아직 설정되지 않았어요."); return }
        val base = URL(endpoint)
        require(base.protocol == "https" || (BuildConfig.DEBUG && base.host == "10.0.2.2" && base.protocol == "http"))
        val payload = request.optJSONObject("body")?.toString()
        require(payload == null || payload.toByteArray(Charsets.UTF_8).size <= 600_000)
        executor.execute {
            var connection: HttpURLConnection? = null
            try {
                if (!active()) return@execute
                connection = URL(endpoint.trimEnd('/') + "/api/community/" + path).openConnection() as HttpURLConnection
                connection.apply {
                    requestMethod = method; connectTimeout = 4000; readTimeout = 6000; instanceFollowRedirects = false
                    setRequestProperty("Authorization", "Bearer $token")
                    setRequestProperty("Accept", "application/json")
                    if (payload != null) {
                        doOutput = true; setRequestProperty("Content-Type", "application/json; charset=utf-8")
                        outputStream.use { it.write(payload.toByteArray(Charsets.UTF_8)) }
                    }
                }
                val code = connection.responseCode
                val stream = if (code in 200..299) connection.inputStream else connection.errorStream
                val bytes = stream?.use { input ->
                    val output = ByteArrayOutputStream()
                    val buffer = ByteArray(8192)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        require(output.size() + count <= 2_000_000) { "모두의 루틴 응답이 너무 커요." }
                        output.write(buffer, 0, count)
                    }
                    output.toByteArray()
                } ?: ByteArray(0)
                val data = JSONObject(String(bytes, Charsets.UTF_8))
                if (code !in 200..299) error(data.optString("error", "요청을 처리하지 못했어요."))
                if (active()) done(data)
            } catch (e: Exception) {
                if (active()) fail(if (e is java.io.IOException) "모두의 루틴 서버에 연결하지 못했어요. 컴퓨터에서 서버를 켜 주세요." else e.message ?: "모두의 루틴 요청에 실패했어요.")
            } finally { connection?.disconnect() }
        }
    }
    fun release() { executor.shutdownNow() }
}
