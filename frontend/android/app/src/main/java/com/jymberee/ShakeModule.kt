package com.jymberee

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class ShakeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var isReceiverRegistered = false

    private val localReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("SHAKE_DETECTED", null)
        }
    }

    override fun getName(): String = "ShakeModule"

    override fun initialize() {
        super.initialize()

        if (!isReceiverRegistered) {
            val filter = IntentFilter("SHAKE_DETECTED_LOCAL")
            LocalBroadcastManager
                .getInstance(reactContext)
                .registerReceiver(localReceiver, filter)

            isReceiverRegistered = true
        }
    }

    override fun onCatalystInstanceDestroy() {
        if (isReceiverRegistered) {
            LocalBroadcastManager
                .getInstance(reactContext)
                .unregisterReceiver(localReceiver)

            isReceiverRegistered = false
        }
        super.onCatalystInstanceDestroy()
    }

    @ReactMethod
    fun startService() {
        val intent = Intent(reactContext, ShakeDetectionService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopService() {
        reactContext.stopService(
            Intent(reactContext, ShakeDetectionService::class.java)
        )
    }

    @ReactMethod
    fun saveToken(token: String) {
        reactContext
            .getSharedPreferences("APP_PREFS", Context.MODE_PRIVATE)
            .edit()
            .putString("token", token)
            .apply()
    }
}
