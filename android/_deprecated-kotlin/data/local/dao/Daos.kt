package com.caredroid.clinical.data.local.dao

import androidx.room.*
import com.caredroid.clinical.data.local.entity.*
import kotlinx.coroutines.flow.Flow

/**
 * Message DAO
 * Data Access Object for messages
 */
@Dao
interface MessageDao {
    
    @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY timestamp ASC")
    fun getMessagesByConversation(conversationId: String): Flow<List<MessageEntity>>
    
    @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY timestamp ASC")
    suspend fun getMessagesByConversationSync(conversationId: String): List<MessageEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<MessageEntity>)
    
    @Query("DELETE FROM messages WHERE conversationId = :conversationId")
    suspend fun deleteMessagesByConversation(conversationId: String)
    
    @Query("DELETE FROM messages WHERE id = :messageId")
    suspend fun deleteMessage(messageId: String)
    
    @Query("SELECT * FROM messages WHERE isSynced = 0")
    suspend fun getUnsyncedMessages(): List<MessageEntity>
    
    @Query("UPDATE messages SET isSynced = 1 WHERE id = :messageId")
    suspend fun markAsSynced(messageId: String)
    
    @Query("DELETE FROM messages")
    suspend fun deleteAll()
}

/**
 * Conversation DAO
 * Data Access Object for conversations
 */
@Dao
interface ConversationDao {
    
    @Query("SELECT * FROM conversations ORDER BY lastMessageAt DESC")
    fun getAllConversations(): Flow<List<ConversationEntity>>
    
    @Query("SELECT * FROM conversations ORDER BY lastMessageAt DESC")
    suspend fun getAllConversationsSync(): List<ConversationEntity>
    
    @Query("SELECT * FROM conversations WHERE id = :conversationId")
    suspend fun getConversation(conversationId: String): ConversationEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConversation(conversation: ConversationEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConversations(conversations: List<ConversationEntity>)
    
    @Query("DELETE FROM conversations WHERE id = :conversationId")
    suspend fun deleteConversation(conversationId: String)
    
    @Query("UPDATE conversations SET messageCount = messageCount + 1, lastMessageAt = :timestamp WHERE id = :conversationId")
    suspend fun incrementMessageCount(conversationId: String, timestamp: Long)
    
    @Query("SELECT * FROM conversations WHERE isSynced = 0")
    suspend fun getUnsyncedConversations(): List<ConversationEntity>
    
    @Query("UPDATE conversations SET isSynced = 1 WHERE id = :conversationId")
    suspend fun markAsSynced(conversationId: String)
    
    @Query("DELETE FROM conversations")
    suspend fun deleteAll()
}

/**
 * User DAO
 * Data Access Object for user profile
 */
@Dao
interface UserDao {
    
    @Query("SELECT * FROM users WHERE id = :userId")
    suspend fun getUser(userId: String): UserEntity?
    
    @Query("SELECT * FROM users LIMIT 1")
    suspend fun getCurrentUser(): UserEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)
    
    @Query("DELETE FROM users WHERE id = :userId")
    suspend fun deleteUser(userId: String)
    
    @Query("DELETE FROM users")
    suspend fun deleteAll()
}

/**
 * Pending Message DAO
 * Data Access Object for offline message queue
 */
@Dao
interface PendingMessageDao {
    
    @Query("SELECT * FROM pending_messages ORDER BY timestamp ASC")
    suspend fun getAllPending(): List<PendingMessageEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPending(message: PendingMessageEntity)
    
    @Query("DELETE FROM pending_messages WHERE id = :id")
    suspend fun deletePending(id: Long)
    
    @Query("UPDATE pending_messages SET retryCount = retryCount + 1 WHERE id = :id")
    suspend fun incrementRetryCount(id: Long)
    
    @Query("DELETE FROM pending_messages WHERE retryCount >= 3")
    suspend fun deleteFailedMessages()
    
    @Query("DELETE FROM pending_messages")
    suspend fun deleteAll()
}
