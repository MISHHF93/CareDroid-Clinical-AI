package com.caredroid.clinical

import android.app.Application

// Hilt (@HiltAndroidApp) removed — DI is no longer used in the Capacitor WebView shell.
class CareDroidApplication : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
