package com.caredroid.clinical

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * CareDroid Application entry point with Hilt dependency injection
 */
@HiltAndroidApp
class CareDroidApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        // Initialize app
    }
}
