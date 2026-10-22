package com.jymberee

import android.app.*
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import kotlin.math.abs
import kotlin.math.sqrt

class ShakeDetectionService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private val CHOP_THRESHOLD = 15.5f
    private val MIN_ACTIVE_TIME_MS = 30L
    private val MAX_FLIP_INTERVAL_MS = 220L
    private val REQUIRED_CHOPS = 5
    private val CHOP_WINDOW_MS = 1300L
    private val COOLDOWN_MS = 2000L


    private val FILTER_ALPHA = 0.82f

    /* =========================
       STATE
       ========================= */

    private var lastX = 0f
    private var lastY = 0f
    private var lastZ = 0f

    private var lastDirection = 0
    private var chopCount = 0

    private var firstChopTime = 0L
    private var lastFlipTime = 0L
    private var lastTriggerTime = 0L

    private var activeStartTime = 0L

    override fun onCreate() {
        super.onCreate()
        startForegroundSafely()
        registerAccelerometer()
    }

    /* ========================= */

    private fun startForegroundSafely() {
        val channelId = "chop_detection_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Emergency Chop Detection",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }

        val notification = Notification.Builder(this, channelId)
            .setContentTitle("Emergency Chop Gesture Active")
            .setContentText("Perform strong chop gesture to trigger SOS")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setOngoing(true)
            .build()

        startForeground(101, notification)
    }

    private fun registerAccelerometer() {
        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        if (sensor != null) {
            sensorManager.registerListener(
                this,
                sensor,
                SensorManager.SENSOR_DELAY_GAME
            )
        } else stopSelf()
    }

    /* =========================
       SENSOR CORE (IMPORTANT)
       ========================= */

    override fun onSensorChanged(event: SensorEvent) {

        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]

        val dx = x - lastX
        val dy = y - lastY
        val dz = z - lastZ

        lastX = x * FILTER_ALPHA + lastX * (1 - FILTER_ALPHA)
        lastY = y * FILTER_ALPHA + lastY * (1 - FILTER_ALPHA)
        lastZ = z * FILTER_ALPHA + lastZ * (1 - FILTER_ALPHA)

        val now = System.currentTimeMillis()

        if (now - lastTriggerTime < COOLDOWN_MS) return

        /* -------------------------
           PLANAR MOTION (KEY FIX)
           ------------------------- */

        val planar = sqrt(dx * dx + dy * dy)

        // ❌ Reject stabbing / vertical thrust
        if (abs(dz) > planar * 0.8f) return

        // Use dominant planar axis for direction
        val axis = if (abs(dx) > abs(dy)) dx else dy

        val direction = when {
            axis > CHOP_THRESHOLD -> 1
            axis < -CHOP_THRESHOLD -> -1
            else -> 0
        }

        if (direction == 0) {
            activeStartTime = 0L
            return
        }

        /* -------------------------
           SUSTAIN CHECK
           ------------------------- */

        if (activeStartTime == 0L) {
            activeStartTime = now
            return
        }

        if (now - activeStartTime < MIN_ACTIVE_TIME_MS) return

        /* -------------------------
           DIRECTION FLIP DETECTION
           ------------------------- */

        if (direction == lastDirection) return

        if (lastFlipTime == 0L) {
            chopCount = 1
            firstChopTime = now
        } else {
            val interval = now - lastFlipTime
            if (interval <= MAX_FLIP_INTERVAL_MS) {
                chopCount++
            } else {
                chopCount = 1
                firstChopTime = now
            }
        }

        lastFlipTime = now
        lastDirection = direction
        activeStartTime = 0L

        Log.d("ChopService", "Chop $chopCount / $REQUIRED_CHOPS")

        /* -------------------------
           WINDOW GUARD
           ------------------------- */

        if (now - firstChopTime > CHOP_WINDOW_MS) {
            reset()
            return
        }

        /* -------------------------
           SUCCESS
           ------------------------- */

        if (chopCount >= REQUIRED_CHOPS) {
            triggerSOS()
            lastTriggerTime = now
            reset()
        }
    }

    /* ========================= */

    private fun triggerSOS() {
        try {
            Log.e("ChopService", "🔥 CHOP SOS TRIGGERED 🔥")

            LocalBroadcastManager.getInstance(this)
                .sendBroadcast(Intent("SHAKE_DETECTED_LOCAL"))

            val token = getSharedPreferences("APP_PREFS", Context.MODE_PRIVATE)
                .getString("token", null)

            SosDispatcher.sendSOS(
                this,
                "Emergency triggered by chop gesture",
                token
            )

        } catch (e: Exception) {
            Log.e("ChopService", "SOS error", e)
        }
    }

    private fun reset() {
        chopCount = 0
        firstChopTime = 0L
        lastFlipTime = 0L
        lastDirection = 0
        activeStartTime = 0L
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    override fun onBind(intent: Intent?): IBinder? = null
}