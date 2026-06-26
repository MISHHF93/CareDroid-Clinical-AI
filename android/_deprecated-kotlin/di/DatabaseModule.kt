package com.caredroid.clinical.di

import android.content.Context
import androidx.room.Room
import com.caredroid.clinical.data.local.CareDroidDatabase
import com.caredroid.clinical.data.local.PreferencesManager
import com.caredroid.clinical.data.local.dao.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Database Module
 * Provides Room database and DAOs
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    
    @Provides
    @Singleton
    fun provideCareDroidDatabase(
        @ApplicationContext context: Context
    ): CareDroidDatabase {
        return Room.databaseBuilder(
            context,
            CareDroidDatabase::class.java,
            CareDroidDatabase.DATABASE_NAME
        )
            .fallbackToDestructiveMigration() // For development
            .build()
    }
    
    @Provides
    @Singleton
    fun provideMessageDao(database: CareDroidDatabase): MessageDao {
        return database.messageDao()
    }
    
    @Provides
    @Singleton
    fun provideConversationDao(database: CareDroidDatabase): ConversationDao {
        return database.conversationDao()
    }
    
    @Provides
    @Singleton
    fun provideUserDao(database: CareDroidDatabase): UserDao {
        return database.userDao()
    }
    
    @Provides
    @Singleton
    fun providePendingMessageDao(database: CareDroidDatabase): PendingMessageDao {
        return database.pendingMessageDao()
    }
    
    @Provides
    @Singleton
    fun providePreferencesManager(
        @ApplicationContext context: Context
    ): PreferencesManager {
        return PreferencesManager(context)
    }
}
