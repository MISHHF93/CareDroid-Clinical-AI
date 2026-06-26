package com.caredroid.clinical.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.caredroid.clinical.data.local.entity.ConversationEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for Conversation Entity
 */
@Dao
interface ConversationDao {
    
    /**
     * Insert a new conversation or replace if exists
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConversation(conversation: ConversationEntity)
    
    /**
     * Insert multiple conversations
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConversations(conversations: List<ConversationEntity>)
    
    /**
     * Get all conversations ordered by latest update
     */
    @Query("""
        SELECT * FROM conversations 
        ORDER BY updatedAt DESC
    """)
    fun getAllConversations(): Flow<List<ConversationEntity>>
    
    /**
     * Get a specific conversation by ID
     */
    @Query("SELECT * FROM conversations WHERE id = :id")
    suspend fun getConversationById(id: String): ConversationEntity?
    
    /**
     * Get conversations with pagination
     */
    @Query("""
        SELECT * FROM conversations 
        ORDER BY updatedAt DESC 
        LIMIT :limit OFFSET :offset
    """)
    fun getConversationsPaged(limit: Int = 20, offset: Int = 0): Flow<List<ConversationEntity>>
    
    /**
     * Get recent conversations (limited)
     */
    @Query("""
        SELECT * FROM conversations 
        ORDER BY updatedAt DESC 
        LIMIT :limit
    """)
    fun getRecentConversations(limit: Int = 10): Flow<List<ConversationEntity>>
    
    /**
     * Delete a specific conversation
     */
    @Delete
    suspend fun deleteConversation(conversation: ConversationEntity)
    
    /**
     * Delete conversation by ID
     */
    @Query("DELETE FROM conversations WHERE id = :id")
    suspend fun deleteConversationById(id: String)
    
    /**
     * Delete all conversations
     */
    @Query("DELETE FROM conversations")
    suspend fun deleteAllConversations()
    
    /**
     * Get conversation count
     */
    @Query("SELECT COUNT(*) FROM conversations")
    fun getConversationCount(): Flow<Int>
    
    /**
     * Update conversation (using SQL)
     */
    @Query("""
        UPDATE conversations 
        SET title = :title, updatedAt = :updatedAt, messageCount = :messageCount
        WHERE id = :id
    """)
    suspend fun updateConversation(
        id: String,
        title: String,
        updatedAt: Long,
        messageCount: Int
    )
}
