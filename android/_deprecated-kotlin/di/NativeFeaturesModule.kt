package com.caredroid.clinical.di

import android.app.NotificationManager
import android.content.Context
import androidx.core.content.getSystemService
import com.caredroid.clinical.util.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Native Features Module
 * Provides native Android functionality
 */
@Module
@InstallIn(SingletonComponent::class)
object NativeFeaturesModule {
    
    @Provides
    @Singleton
    fun provideNotificationManager(
        @ApplicationContext context: Context
    ): NotificationManager {
        return context.getSystemService()!!
    }
    
    @Provides
    @Singleton
    fun provideBiometricAuthManager(
        @ApplicationContext context: Context
    ): BiometricAuthManager {
        return BiometricAuthManager(context)
    }
    
    @Provides
    @Singleton
    fun providePermissionManager(
        @ApplicationContext context: Context
    ): PermissionManager {
        return PermissionManager(context)
    }
    
    @Provides
    @Singleton
    fun provideVoiceInputManager(
        @ApplicationContext context: Context
    ): VoiceInputManager {
        return VoiceInputManager(context)
    }
    
    @Provides
    @Singleton
    fun provideShareManager(
        @ApplicationContext context: Context
    ): ShareManager {
        return ShareManager(context)
    }
}
