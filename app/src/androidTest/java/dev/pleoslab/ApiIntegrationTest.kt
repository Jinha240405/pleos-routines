package dev.pleoslab

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.json.JSONObject
import org.json.JSONArray
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class ApiIntegrationTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private fun catalog() = JSONObject(context.assets.open("api-catalog.json").bufferedReader().use { it.readText() }).getJSONArray("operations")

    @Test fun everyVehicleDeclarationMatchesBundledSdkAndArgumentsConvert() {
        val entries=catalog();var checked=0
        for(i in 0 until entries.length()){
            val op=entries.getJSONObject(i)
            if(op.optString("source")!="vehicle")continue
            val klass=Class.forName("ai.pleos.playground.vehicle.api.${op.getString("domain")}")
            val names=op.getJSONArray("parameterTypes").let{a->(0 until a.length()).map(a::getString)}
            val method=klass.methods.singleOrNull{it.name==op.getString("method")&&it.parameterTypes.map{p->p.name}==names}
            assertNotNull("SDK method missing: ${op.getString("id")}",method)
            var arg=0
            for(p in method!!.parameterTypes.indices){val type=method.parameterTypes[p];if(type.name.startsWith("kotlin.jvm.functions.")||type.name.contains(".listener."))continue
                val definition=op.getJSONArray("params").getJSONObject(arg++)
                assertNotNull(VehicleApi.convert(type,method.genericParameterTypes[p].typeName,definition.get("default")))
            }
            assertEquals(op.getJSONArray("params").length(),arg);checked++
        }
        assertEquals(476,checked)
    }

    @Test fun rejectsUnknownAndRetiredRequestsBeforeCallingService(){
        val errors=mutableListOf<String>()
        lateinit var api:VehicleApi
        instrumentation.runOnMainSync {api=VehicleApi(context){_,_,_->};api.invoke("java.lang.Runtime.exec",JSONArray(),{true},{fail("Unexpected success")},{errors.add(it)});api.invoke("Odometer.setRangeRemainingDistance",JSONArray().put(100),{true},{fail("Retired action succeeded")},{errors.add(it)});api.release()}
        assertEquals(2,errors.size)
    }

    @Test fun combinedAreasAndTemperatureUnitsUseDeviceCapabilities(){
        val entries=catalog();val op=(0 until entries.length()).map(entries::getJSONObject).first{it.getString("id")=="HVAC.setHvacTemperature"}
        val params=op.getJSONArray("params");val args=JSONArray();var numberIndex=0
        for(i in 0 until params.length()){val p=params.getJSONObject(i);args.put(when{p.getString("kind")=="area"->"ROW_1_LEFT";p.getString("kind")=="number"->{numberIndex=i;72};else->"FAHRENHEIT"})}
        val capability=JSONObject("""{"values":[{"accessType":"READ_WRITE"},{"ROW_1_LEFT":{"minValue":15,"maxValue":30}},{"minCelsius":15,"maxCelsius":30,"incrementCelsius":0.5,"minFahrenheit":58,"maxFahrenheit":88,"incrementFahrenheit":1}]}""")
        val api=VehicleApi(context){_,_,_->}
        try{api.checkCapability(op,args,capability);for(value in listOf(22,72.5,89)){args.put(numberIndex,value);assertThrows(IllegalArgumentException::class.java){api.checkCapability(op,args,capability)}}
            val areaType=params.getJSONObject(0).getString("type");val type=Class.forName(areaType)
            assertEquals("ROW_1_LEFT|ROW_1_RIGHT",VehicleApi.encode(VehicleApi.convert(type,areaType,"ROW_1_LEFT|ROW_1_RIGHT")))
        }finally{api.release()}
    }

    @Test fun actualDoorReadAndRepresentativeCapabilitiesReturnExplicitOutcomes(){
        lateinit var api:VehicleApi
        instrumentation.runOnMainSync {api=VehicleApi(context){_,_,_->}}
        val ids=listOf("Door.getCurrentDoorPosition","HVAC.checkHvacTemperatureCapabilities","Seat.checkSeatTemperatureCapabilities","Light.checkAmbientLightBrightnessCapabilities","EvBattery.checkEvBatteryStateOfChargeCapabilities","Window.checkWindowPositionCapabilities","Tire.checkTirePressureCapabilities","Wiper.checkWiperSwitchCapabilities")
        val outcomes=JSONArray()
        try{for(id in ids){val latch=CountDownLatch(1);var success=false;var value:Any?=null;var error:String?=null;var active=true
            instrumentation.runOnMainSync{api.invoke(id,if(id.startsWith("Door."))JSONArray().put("ROW_1_LEFT")else JSONArray(),{active},{success=true;value=VehicleApi.encode(it);latch.countDown()},{error=it;latch.countDown()})}
            val completed=latch.await(12,TimeUnit.SECONDS);active=false
            outcomes.put(JSONObject().put("id",id).put("completed",completed).put("success",success).put("value",value).put("error",error))
            assertTrue("No SDK callback: $id",completed)
            if(id.startsWith("Door.")){assertTrue("Door read: $error",success);assertTrue(value is Number)}
        }}finally{context.openFileOutput("api-probe-results.json",0).use{it.write(outcomes.toString(2).toByteArray())};instrumentation.runOnMainSync{api.release()}}
    }
}
