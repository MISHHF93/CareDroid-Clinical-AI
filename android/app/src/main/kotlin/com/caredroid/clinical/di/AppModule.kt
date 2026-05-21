package com.caredroid.clinical.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import androidx.room.Room
import com.caredroid.clinical.data.local.CareDroidDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

private const val DATA_STORE_NAME = "caredroid_preferences"
private const val DATABASE_NAME = "caredroid_clinical.db"

// DataStore extension
val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = DATA_STORE_NAME)

/**
 * Hilt Module for Application-level dependencies
 * Provides singleton instances for DataStore and Room Database
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    /**
     * Provides DataStore for Preferences
     * Used for storing user settings, tokens, etc.
     */
    @Singleton
    @Provides
    fun provideDataStore(
        @ApplicationContext context: Context
    ): DataStore<Preferences> {
        return context.dataStore
    }
    
    /**
     * Provides Room Database instance
     * Used for local data persistence
     */
    @Singleton
    @Provides
    fun provideCareDroidDatabase(
        @ApplicationContext context: Context
    ): CareDroidDatabase {
        return Room.databaseBuilder(
            context,
            CareDroidDatabase::class.java,
            DATABASE_NAME
        )
            .fallbackToDestructiveMigration() // For development only
            .build()
    }
    
    /**
     * Provides Message DAO
     */
    @Singleton
    @Provides
    fun provideMessageDao(database: CareDroidDatabase) = database.messageDao()
    
    /**
     * Provides Conversation DAO
     */
    @Singleton
    @Provides
    fun provideConversationDao(database: CareDroidDatabase) = database.conversationDao()
    
    /**
     * Provides User DAO
     */
    @Singleton
    @Provides
    fun provideUserDao(database: CareDroidDatabase) = database.userDao()
}
