package dev.pleoslab

import ai.pleos.playground.vehicle.Vehicle
import android.car.Car
import android.car.VehiclePropertyIds
import android.car.hardware.CarPropertyValue
import android.car.hardware.property.CarPropertyManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.lang.reflect.InvocationTargetException
import java.lang.reflect.Method
import java.lang.reflect.Proxy
import java.lang.reflect.Modifier

/** Only bundled catalog entries can cross this bridge. No user-provided reflection targets. */
class VehicleApi(private val context: Context, private val event: (String, Any?, String?) -> Unit) {
    private val main = Handler(Looper.getMainLooper())
    private val catalog = JSONObject(context.assets.open("api-catalog.json").bufferedReader().use { it.readText() })
        .getJSONArray("operations").let { entries -> (0 until entries.length()).associate { entries.getJSONObject(it).let { e -> e.getString("id") to e } } }
    private var vehicle: Vehicle? = null
    private var car: Car? = null
    private val domains = mutableMapOf<String, Any>()
    private val subscriptions = mutableMapOf<String, () -> Unit>()
    private val motions = mutableMapOf<String, () -> Unit>()
    private var closed = false

    private fun entry(id: String): JSONObject = catalog[id] ?: error("등록되지 않은 차량 기능입니다.")
    private fun target(op: JSONObject): Pair<Any, Method> {
        val domain = op.getString("domain")
        val session = vehicle ?: Vehicle(context).also { it.initialize(); vehicle = it }
        val owner = Class.forName("ai.pleos.playground.vehicle.api.$domain")
        val instance = domains.getOrPut(domain) { Vehicle::class.java.getMethod("get$domain").invoke(session) }
        val names = op.getJSONArray("parameterTypes").let { a -> (0 until a.length()).map(a::getString) }
        val method = owner.methods.singleOrNull { it.name == op.getString("method") && it.parameterTypes.map(Class<*>::getName) == names }
            ?: error("설치된 SDK와 기능 정의가 다릅니다.")
        return instance to method
    }

    fun invoke(id: String, args: JSONArray, active: () -> Boolean, done: (Any?) -> Unit, failed: (String) -> Unit) {
        try {
            val op = entry(id)
            require(!op.optBoolean("disabled")) { "사용이 중단된 API입니다." }
            require(op.getString("kind") in listOf("read", "write", "capability")) { "이 기능은 감지 시작/해제에서 사용하세요." }
            validateArgs(op, args)
            if (op.has("aaosProperty")) { if (active()) done(readCar(op)); return }
            val execute = {
                if (active() && !closed) call(op, args, { value -> if (active()) done(value) }, { message -> if (active()) failed(message) }, active)
            }
            val cap = op.optString("capability")
            if (cap.isNotEmpty()) call(entry(cap), JSONArray(), { capability ->
                main.post { if (active() && !closed) try { checkCapability(op, args, capability); execute() } catch (e: Exception) { failed(message(e)) } }
            }, failed, active) else execute()
        } catch (e: Exception) { failed(message(e)) }
    }

    fun validateArgs(op: JSONObject, args: JSONArray) {
        require(args.length() == op.getJSONArray("params").length()) { "기능의 입력 개수가 맞지 않습니다." }
        val params = op.getJSONArray("params")
        for (i in 0 until args.length()) {
            val p = params.getJSONObject(i); val v = args.get(i)
            when (p.getString("kind")) {
                "number" -> { require(v is Number && v.toDouble().isFinite()) { "유효한 숫자가 필요합니다." }; if (p.optBoolean("integer")) require(v.toDouble() % 1.0 == 0.0) { "정수가 필요합니다." }; if(p.has("min"))require(v.toDouble()>=p.getDouble("min"));if(p.has("max"))require(v.toDouble()<=p.getDouble("max")) }
                "boolean" -> require(v is Boolean) { "참/거짓 값이 필요합니다." }
                "enum", "area" -> { val choices = p.getJSONArray("options"); val parts=if(v is String && p.getString("kind")=="area")v.split('|')else listOf(v);require(parts.distinct().size==parts.size && parts.all{part->part is String&&(0 until choices.length()).any{choices.getString(it)==part}}) { "지원되는 설정/영역을 선택해 주세요." } }
                "enumList" -> { require(v is JSONArray && v.length() in 1..64) { "구역 설정은 1~64개가 필요합니다." }; val choices = p.getJSONArray("options"); for (j in 0 until v.length()) require((0 until choices.length()).any { choices.getString(it) == v.getString(j) }) { "잘못된 구역 설정입니다." } }
                "waypoints" -> require(v is JSONArray && v.length() <= 2) { "경유지는 두 곳까지 설정할 수 있습니다." }
                else -> require(v is String && v.length <= 4000) { "잘못된 입력입니다." }
            }
        }
    }

    internal fun checkCapability(op: JSONObject, args: JSONArray, result: Any?) {
        val encoded = encode(result)
        val values = if (encoded is JSONObject && encoded.has("values")) encoded.getJSONArray("values") else JSONArray().put(encoded)
        val access = (0 until values.length()).mapNotNull { values.optJSONObject(it)?.optString("accessType")?.takeIf(String::isNotEmpty) }.firstOrNull()
        if (access != null) {
            val requested = if (op.getString("kind") == "write") "WRITE" else "READ"
            require(access == requested || access == "READ_WRITE") { "이 차량에서 ${op.getString("label")} ${if (requested == "WRITE") "제어" else "조회"}를 지원하지 않습니다. ($access)" }
        }
        val params = op.getJSONArray("params")
        val areaIndex = (0 until params.length()).firstOrNull { params.getJSONObject(it).getString("kind") == "area" }
        if (areaIndex != null) {
            val area = args.getString(areaIndex)
            val choices=params.getJSONObject(areaIndex).getJSONArray("options").let{a->(0 until a.length()).map(a::getString).toSet()}
            val maps = (0 until values.length()).mapNotNull { values.optJSONObject(it) }.filter { !it.has("accessType") && it.keys().asSequence().any { key -> key.split('|').all{it in choices} } }
            val bounds = maps.firstOrNull()
            if (bounds != null) {
                require(bounds.has(area)) { "선택한 영역($area)을 지원하지 않습니다." }
                val range = bounds.optJSONObject(area)
                if (op.getString("kind") == "write" && range != null && range.has("minValue") && range.has("maxValue")) {
                    for (i in 0 until params.length()) if (params.getJSONObject(i).getString("kind") == "number") {
                        val v = args.getDouble(i)
                        val temperature=(0 until values.length()).mapNotNull(values::optJSONObject).firstOrNull{it.has("minCelsius")}
                        val fahrenheit=(0 until params.length()).any{params.getJSONObject(it).optString("type").endsWith("TemperatureUnit")&&args.optString(it)=="FAHRENHEIT"}
                        val min = temperature?.optDouble(if(fahrenheit)"minFahrenheit" else "minCelsius")?:range.optDouble("minValue",Double.NaN)
                        val max = temperature?.optDouble(if(fahrenheit)"maxFahrenheit" else "maxCelsius")?:range.optDouble("maxValue",Double.NaN)
                        if (min.isFinite() && max.isFinite()) require(v in min..max) { "이 차량의 허용 범위는 $min ~ $max 입니다." }
                        val increment=temperature?.optDouble(if(fahrenheit)"incrementFahrenheit"else"incrementCelsius",Double.NaN)?:Double.NaN
                        if(increment.isFinite()&&increment>0){val steps=(v-min)/increment;require(kotlin.math.abs(steps-kotlin.math.round(steps))<0.001){"$increment 단위로 조절해 주세요."}}
                    }
                }
            }
        }
    }

    private fun checkPermission(op: JSONObject) {
        val permission = op.optString("permission").takeUnless { it.isBlank() || it == "null" } ?: return
        require(context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) { "권한이 없습니다: $permission. 연결 화면에서 권한을 확인해 주세요." }
    }

    private fun call(op: JSONObject, args: JSONArray, done: (Any?) -> Unit, failed: (String) -> Unit, active: () -> Boolean) {
        try {
            if (!active() || closed) return
            checkPermission(op)
            val (owner, method) = target(op)
            var index = 0
            var waitForStop = false
            var stopSent = false
            val values = method.parameterTypes.mapIndexed { position, type ->
                if (type.name.startsWith("kotlin.jvm.functions.")) {
                    val failure = method.genericParameterTypes[position].typeName.contains("java.lang.Exception")
                    proxy(type) { _, callbackArgs -> main.post {
                        if (active() && !closed) {
                            if (failure) failed(message(callbackArgs.firstOrNull() as? Throwable ?: Exception("SDK 요청 실패")))
                            else if (!waitForStop || stopSent) done(pack(callbackArgs))
                        }
                    }; Unit }
                } else convert(type, method.genericParameterTypes[position].typeName, args.get(index++))
            }.toTypedArray()
            val movingAt = method.parameterTypes.indexOfFirst { it.simpleName == "MoveControl" }
            if (movingAt >= 0 && (values[movingAt] as Enum<*>).name != "STOP") {
                val motionKey = op.getString("id") + args.optString(0)
                require(!motions.containsKey(motionKey)) { "이 장치는 이동 중입니다." }
                waitForStop = true
                val stop = values.copyOf()
                stop[movingAt] = method.parameterTypes[movingAt].enumConstants.first { (it as Enum<*>).name == "STOP" }
                // Movement commands are bounded pulses; cancellation also issues STOP.
                motions[motionKey] = { stopSent = true; method.invoke(owner, *stop) }
                main.postDelayed({ val action = motions.remove(motionKey); if (action != null) try { action() } catch (e: Exception) { failed(message(e)) } }, 600)
            }
            method.invoke(owner, *values)
        } catch (e: Exception) { failed(message(e)) }
    }

    fun subscribe(id: String, args: JSONArray, token: String, active: () -> Boolean, done: () -> Unit, failed: (String) -> Unit) {
        try {
            val op = entry(id)
            require(op.getString("kind") == "subscribe" && token.length in 1..120) { "잘못된 감지 요청입니다." }
            require(subscriptions.size < 32 || subscriptions.containsKey(token)) { "동시에 32개까지 감지할 수 있습니다." }
            validateArgs(op, args); unsubscribe(token)
            if (op.has("aaosProperty")) { subscribeCar(op, token); done(); return }
            val register = {
                if (active() && !closed) {
                    checkPermission(op)
                    val (owner, method) = target(op); var index = 0
                    val values = method.parameterTypes.mapIndexed { position, type ->
                        if (type.name.contains(".listener.")) proxy(type) { name, data ->
                            main.post { if (subscriptions.containsKey(token) && !closed) {
                                if (name.contains("error", true) || name.contains("fail", true)) event(token, null, "감지 오류: ${data.joinToString()}")
                                else event(token, pack(data), null)
                            } }; Unit
                        } else convert(type, method.genericParameterTypes[position].typeName, args.get(index++))
                    }.toTypedArray()
                    val (_, removal) = target(entry(op.getString("unsubscribe")))
                    val removalValues = removal.parameterTypes.map { t -> values[method.parameterTypes.indexOf(t)] }.toTypedArray()
                    subscriptions[token] = { removal.invoke(owner, *removalValues) }
                    try { method.invoke(owner, *values); done() } catch (e: Exception) { unsubscribe(token); throw e }
                }
            }
            val cap = op.optString("capability")
            if (cap.isEmpty()) register() else call(entry(cap), JSONArray(), { result -> main.post { if (active()) try { checkCapability(op,args,result); register() } catch (e: Exception) { failed(message(e)) } } }, failed, active)
        } catch (e: Exception) { failed(message(e)) }
    }

    fun unsubscribe(token: String) { subscriptions.remove(token)?.let { try { it() } catch (_: Exception) {} } }
    fun clearSubscriptions() { subscriptions.keys.toList().forEach(::unsubscribe) }
    fun stopMotion() { val pending = motions.values.toList(); motions.clear(); pending.forEach { try { it() } catch (_: Exception) {} } }
    fun release() { clearSubscriptions(); stopMotion(); closed = true; main.removeCallbacksAndMessages(null); try { vehicle?.release() } catch (_: Exception) {}; car?.disconnect(); domains.clear() }

    private fun propertyManager(): CarPropertyManager {
        val session = car ?: (Car.createCar(context) ?: error("Android Automotive 차량 서비스가 없습니다.")).also { car = it }
        return session.getCarManager(Car.PROPERTY_SERVICE) as? CarPropertyManager ?: error("차량 속성 서비스가 없습니다.")
    }
    private fun property(op: JSONObject): Int = VehiclePropertyIds::class.java.getField(op.getString("aaosProperty")).getInt(null)
    private fun readCar(op: JSONObject): Any? {
        val manager = propertyManager(); val id = property(op)
        require(manager.getCarPropertyConfig(id) != null) { "이 차량에서 ${op.getString("label")}을 지원하지 않습니다." }
        val value = manager.getProperty<Any>(id, 0).value
        return if (op.optString("aaosProperty") == "PERF_VEHICLE_SPEED") (value as Number).toDouble() * 3.6 else value
    }
    private fun subscribeCar(op: JSONObject, token: String) {
        val manager = propertyManager(); val id = property(op)
        require(manager.getCarPropertyConfig(id) != null) { "이 차량에서 ${op.getString("label")}을 지원하지 않습니다." }
        val callback = object : CarPropertyManager.CarPropertyEventCallback {
            override fun onChangeEvent(value: CarPropertyValue<*>) { main.post { if (subscriptions.containsKey(token)) event(token, if (op.optString("aaosProperty") == "PERF_VEHICLE_SPEED") (value.value as Number).toDouble()*3.6 else value.value, null) } }
            override fun onErrorEvent(propId: Int, areaId: Int) { event(token, null, "차량 속성 감지 오류: $propId / $areaId") }
        }
        subscriptions[token] = { manager.unregisterCallback(callback, id) }
        try { require(manager.registerCallback(callback, id, CarPropertyManager.SENSOR_RATE_NORMAL)) { "차량 상태 감지 등록을 거부했습니다." } } catch (e: Exception) { unsubscribe(token); throw e }
    }

    companion object {
        fun message(error: Throwable): String = (if (error is InvocationTargetException) error.targetException else error).let { "${it.javaClass.simpleName}: ${it.message ?: "기기 요청 실패"}" }.take(1600)
        fun pack(values: Array<out Any?>): Any? = if (values.size == 1) values[0] else JSONObject().put("values", JSONArray(values.map { encode(it) }))
        fun proxy(type: Class<*>, action: (String, Array<out Any?>) -> Unit): Any = Proxy.newProxyInstance(type.classLoader, arrayOf(type)) { self, method, args ->
            when (method.name) { "toString" -> "PleosRoutinesListener"; "hashCode" -> System.identityHashCode(self); "equals" -> self === args?.firstOrNull(); else -> { action(method.name, args ?: emptyArray()); Unit } }
        }
        fun convert(type: Class<*>, generic: String, value: Any): Any {
            return when {
                type.isEnum -> type.enumConstants.firstOrNull { (it as Enum<*>).name == value } ?: error("잘못된 설정 값: $value")
                type.simpleName.endsWith("Area") -> {
                    val ctor = type.constructors.single { it.parameterTypes.size == 1 && it.parameterTypes[0].isArray }
                    val enumType = ctor.parameterTypes[0].componentType
                    val parts=(value as String).split('|');require(parts.distinct().size==parts.size)
                    val array = java.lang.reflect.Array.newInstance(enumType,parts.size)
                    parts.forEachIndexed { i,part->val e=enumType.enumConstants.firstOrNull{(it as Enum<*>).name==part}?:error("잘못된 차량 영역");java.lang.reflect.Array.set(array,i,e) }
                    ctor.newInstance(array)
                }
                type == Int::class.javaPrimitiveType || type == java.lang.Integer::class.java -> (value as Number).toDouble().also { require(it in Int.MIN_VALUE.toDouble()..Int.MAX_VALUE.toDouble() && it % 1 == 0.0) { "정수 범위를 초과했습니다." } }.toInt()
                type == Float::class.javaPrimitiveType || type == java.lang.Float::class.java -> (value as Number).toFloat().also { require(it.isFinite()) }
                type == Double::class.javaPrimitiveType || type == java.lang.Double::class.java -> (value as Number).toDouble()
                type == Long::class.javaPrimitiveType || type == java.lang.Long::class.java -> (value as Number).toLong()
                type == Boolean::class.javaPrimitiveType || type == java.lang.Boolean::class.java -> value as Boolean
                type == List::class.java -> { val name = Regex("ai\\.pleos\\.playground\\.vehicle\\.constant\\.control\\.\\w+").find(generic)?.value ?: error("지원하지 않는 목록"); val enum = Class.forName(name); val a=value as JSONArray; (0 until a.length()).map { convert(enum,name,a.get(it)) } }
                type == String::class.java -> value as String
                else -> error("지원하지 않는 인자 형식: ${type.simpleName}")
            }
        }
        private fun areaName(value: Any): String? {
            if (!value.javaClass.name.contains(".model.area.")) return null
            return try { (value.javaClass.getMethod("getValues").invoke(value) as Array<*>).joinToString("|") { (it as Enum<*>).name } } catch (_: Exception) { null }
        }
        fun encode(value: Any?, depth: Int = 0): Any {
            if (value == null) return JSONObject.NULL
            if (depth > 8) return "[depth limit]"
            return when (value) {
                is JSONObject, is JSONArray, is String, is Boolean -> value
                is Number -> if (value.toDouble().isFinite()) value else JSONObject.NULL
                is Enum<*> -> value.name
                is Map<*, *> -> JSONObject().also { out -> value.entries.take(500).forEach { (k,v) -> out.put(k?.let { areaName(it) ?: (it as? Enum<*>)?.name ?: it.toString() } ?: "null", encode(v,depth+1)) } }
                is Iterable<*> -> JSONArray(value.take(500).map { encode(it,depth+1) })
                else -> {
                    areaName(value)?.let { return it }
                    if (value.javaClass.isArray) return JSONArray((0 until minOf(500,java.lang.reflect.Array.getLength(value))).map { encode(java.lang.reflect.Array.get(value,it),depth+1) })
                    if (!value.javaClass.name.startsWith("ai.pleos.")) return value.toString().take(4000)
                    JSONObject().also { out -> value.javaClass.methods.filter { it.parameterCount==0 && !Modifier.isStatic(it.modifiers) && it.name.startsWith("get") && it.name!="getClass" && !it.name.contains('$') }.take(100).forEach { method -> try { out.put(method.name.removePrefix("get").replaceFirstChar(Char::lowercase), encode(method.invoke(value),depth+1)) } catch (_: Exception) {} } }
                }
            }
        }
    }
}
