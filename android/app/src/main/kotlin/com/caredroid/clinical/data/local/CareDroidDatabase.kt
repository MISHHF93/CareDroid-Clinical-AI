package com.caredroid.clinical.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.caredroid.clinical.data.local.dao.ConversationDao
import com.caredroid.clinical.data.local.dao.MessageDao
import com.caredroid.clinical.data.local.dao.UserDao
import com.caredroid.clinical.data.local.dao.PendingMessageDao
import com.caredroid.clinical.data.local.entity.ConversationEntity
import com.caredroid.clinical.data.local.entity.MessageEntity
import com.caredroid.clinical.data.local.entity.UserEntity
import com.caredroid.clinical.data.local.entity.PendingMessageEntity

/**
 * CareDroid Room Database
 * Central database for local data persistence
 */
@Database(
    entities = [
        MessageEntity::class,
        ConversationEntity::class,
        UserEntity::class,
        PendingMessageEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class CareDroidDatabase : RoomDatabase() {
    
    /**
     * Provides access to MessageDao
     */
    abstract fun messageDao(): MessageDao
    
    /**
     * Provides access to ConversationDao
     */
    abstract fun conversationDao(): ConversationDao
    
    /**
     * Provides access to UserDao
     */
    abstract fun userDao(): UserDao
    
    /**
     * Provides access to PendingMessageDao
     */
    abstract fun pendingMessageDao(): PendingMessageDao
    
    companion object {
        const val DATABASE_NAME = "caredroid_db"
    }
}
