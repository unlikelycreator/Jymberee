# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# react-native-geolocation-service
-keep class com.agontuk.RNFusedLocation.** { *; }
-dontwarn com.agontuk.RNFusedLocation.**

# react-native-get-location
-keep class com.reactlibrary.** { *; }
-dontwarn com.reactlibrary.**

# Google Play Services - Location (root cause of the VerifyError crash)
-keep class com.google.android.gms.location.** { *; }
-keep interface com.google.android.gms.location.** { *; }
-dontwarn com.google.android.gms.location.**

# General GMS safety net
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Google Play Services Ads (already in your dependencies)
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# AndroidX Fragment (appears in your crash trace)
-keep class androidx.fragment.app.** { *; }
-dontwarn androidx.fragment.app.**