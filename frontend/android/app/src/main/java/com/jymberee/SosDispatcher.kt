package com.jymberee

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.util.Log
import com.google.android.gms.location.LocationServices
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

object SosDispatcher {

    private const val TAG = "SosDispatcher"

    private const val SOS_URL = "https://ezeelink.net/api/v3/images/upload-image"

    private const val NOTIFICATION_URL = "https://ezeelink.net/api/v3/notification/send-notification"

    private val client = OkHttpClient()

    @SuppressLint("MissingPermission")
    fun sendSOS(context: Context, description: String, token: String?) {
        if (token.isNullOrEmpty()) {
            Log.e(TAG, "❌ No token found")
            return
        }

        val fusedClient = LocationServices.getFusedLocationProviderClient(context)

        fusedClient.lastLocation
            .addOnSuccessListener { location ->
                if (location == null) {
                    Log.e(TAG, "❌ Location is null")
                    return@addOnSuccessListener
                }

                sendSOSRequest(location, description, token)
            }
            .addOnFailureListener {
                Log.e(TAG, "❌ Location failed", it)
            }
    }

    private fun sendSOSRequest(
        location: Location,
        description: String,
        token: String
    ) {
        val json = JSONObject().apply {
            put("image", JSONObject.NULL)
            put("latitude", location.latitude)
            put("longitude", location.longitude)
            put("description", description)
        }

        val body = json.toString()
            .toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(SOS_URL)
            .post(body)
            .addHeader("Authorization", "Bearer $token")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "❌ SOS Failed", e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!it.isSuccessful) {
                        Log.e(TAG, "❌ SOS error ${it.code}")
                        return
                    }

                    Log.i(TAG, "✅ SOS Sent")
                    sendNotification(description, location, token)
                }
            }
        })
    }

    private fun sendNotification(
        description: String,
        location: Location,
        token: String
    ) {
        val json = JSONObject().apply {
            put("title", "⚠️ Emergency Alert!")
            put("description", description)
            put("latitude", location.latitude)
            put("longitude", location.longitude)
            put("env", "prod")
        }

        val body = json.toString()
            .toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(NOTIFICATION_URL)
            .post(body)
            .addHeader("Authorization", "Bearer $token")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "❌ Notification Failed", e)
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    Log.i(TAG, "✅ Notification Sent")
                }
            }
        })
    }
}
