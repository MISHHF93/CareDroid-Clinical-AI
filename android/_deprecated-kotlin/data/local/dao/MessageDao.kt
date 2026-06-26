package com.caredroid.clinical.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.caredroid.clinical.data.local.entity.MessageEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for Message Entity
 */
@Dao
interface MessageDao {
    
    /**
     * Insert a new message or replace if exists
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity)
    
    /**
     * Insert multiple messages
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<MessageEntity>)
    
    /**
     * Get messages for a specific conversation, ordered by timestamp
     */
    @Query("""
        SELECT * FROM messages 
        WHERE conversationId = :conversationId 
        ORDER BY timestamp ASC
    """)
    fun getMessagesForConversation(conversationId: String): Flow<List<MessageEntity>>
    
    /**
     * Get recent messages for a conversation (limited)
     */
    @Query("""
        SELECT * FROM messages 
        WHERE conversationId = :conversationId 
        ORDER BY timestamp DESC 
        LIMIT :limit
    """)
    fun getRecentMessages(conversationId: String, limit: Int = 50): Flow<List<MessageEntity>>
    
    /**
     * Get a specific message by ID
     */
    @Query("SELECT * FROM messages WHERE id = :id")
    suspend fun getMessageById(id: String): MessageEntity?
    
    /**
     * Get all messages (paginated for large datasets)
     */
    @Query("""
        SELECT * FROM messages 
        ORDER BY timestamp DESC 
        LIMIT :limit OFFSET :offset
    """)
    fun getAllMessages(limit: Int = 50, offset: Int = 0): Flow<List<MessageEntity>>
    
    /**
     * Delete a specific message
     */
    @Delete
    suspend fun deleteMessage(message: MessageEntity)
    
    /**
     * Delete all messages for a conversation
     */
    @Query("DELETE FROM messages WHERE conversationId = :conversationId")
    suspend fun deleteMessagesForConversation(conversationId: String)
    
    /**
     * Get message count for a conversation
     */
    @Query("SELECT COUNT(*) FROM messages WHERE conversationId = :conversationId")
    fun getMessageCount(conversationId: String): Flow<Int>
}
