// android/app/src/main/java/com/jymberee/MainApplication.kt
package com.jymberee

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {

            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    add(ShakePackage())
                }

            override fun getJSMainModuleName() = "index"
            override fun getUseDeveloperSupport() = BuildConfig.DEBUG
            override val isNewArchEnabled = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(this, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
        // ❌ DO NOT REGISTER RECEIVERS HERE
    }
}
