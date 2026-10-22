package com.jymberee

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.localbroadcastmanager.content.LocalBroadcastManager

class ShakeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        val localIntent = Intent("SHAKE_DETECTED_LOCAL")
        LocalBroadcastManager.getInstance(context!!).sendBroadcast(localIntent)
    }
}
