package com.wix.detox

import android.content.Context
import android.support.test.espresso.IdlingResource
import android.util.Log
import com.wix.invoke.MethodInvocation
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.lang.Exception
import java.lang.reflect.InvocationTargetException

const val LOG_TAG = "DetoxManager"

interface DetoxActionHandler {
    fun handle(params: String, messageId: Long)
}

class ReadyActionHandler(
        private val wsClient: WebSocketClient,
        private val testEngineFacade: TestEngineFacade)
    : DetoxActionHandler {

    override fun handle(params: String, messageId: Long) {
        testEngineFacade.awaitIdle()
        wsClient.sendAction("ready", emptyMap<Any, Any>(), messageId)
    }
}

class ReactNativeReloadActionHandler(
        private val rnContext: Context,
        private val wsClient: WebSocketClient,
        private val testEngineFacade: TestEngineFacade)
    : DetoxActionHandler {

    override fun handle(params: String, messageId: Long) {
        testEngineFacade.syncIdle()
        testEngineFacade.reloadReactNative(rnContext)
        wsClient.sendAction("ready", emptyMap<Any, Any>(), messageId)
    }
}

class InvokeActionHandler(
        private val methodInvocation: MethodInvocation,
        private val wsClient: WebSocketClient)
    : DetoxActionHandler {

    private val validResultData = mapOf<String, Any>(Pair("result", "(null)"))

    override fun handle(params: String, messageId: Long) {
        try {
            methodInvocation.invoke(params)
            wsClient.sendAction("invokeResult", validResultData, messageId)
        } catch (e: InvocationTargetException) {
            Log.e(LOG_TAG, "Exception", e)
            wsClient.sendAction("error", mapOf<String, Any?>(Pair("error", e.targetException?.message)), messageId)
        } catch (e: Exception) {
            Log.i(LOG_TAG, "Test exception", e)
            wsClient.sendAction("testFailed", mapOf<String, Any?>(Pair("details", e.message)), messageId)
        }
    }
}

class CleanupActionHandler(
        private val rnContext: Context,
        private val wsClient: WebSocketClient,
        private val testEngineFacade: TestEngineFacade,
        private val doStopDetox: () -> Unit)
    : DetoxActionHandler {
    override fun handle(params: String, messageId: Long) {
        val stopRunner = JSONObject(params).optBoolean("stopRunner", false)
        if (stopRunner) {
            testEngineFacade.softResetReactNative()
            doStopDetox()
        } else {
            testEngineFacade.hardResetReactNative(rnContext)
        }
        wsClient.sendAction("cleanupDone", emptyMap<Any, Any>(), messageId)
    }
}

class QueryStatusActionHandler(
        private val wsClient: WebSocketClient,
        private val testEngineFacade: TestEngineFacade)
    : DetoxActionHandler {

    override fun handle(params: String, messageId: Long) {
        val busyResources = testEngineFacade.getBusyIdlingResources()
        val data = mutableMapOf<String, Any>()

        if (busyResources.isEmpty()) {
            data["state"] = "idle"
        } else {
            val resources = JSONArray()
            busyResources.forEach {
                try {
                    resources.put(getIdleResourceInfo(it))
                } catch (je: JSONException) {
                    Log.d(LOG_TAG, "Couldn't collect busy resource '${it.name}'", je)
                }
            }

            data["resources"] = resources
            data["state"] = "busy"
        }

        wsClient.sendAction("currentStatusResult", data, messageId)
    }

    private fun getIdleResourceInfo(resource: IdlingResource) =
        JSONObject().apply {
            put("name", resource.javaClass.simpleName)
            put("info", JSONObject().apply {
                put("prettyPrint", resource.name)
            })
        }
}
