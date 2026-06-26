package com.caredroid.clinical.domain.repository

import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.dto.*
import kotlinx.coroutines.flow.Flow

/**
 * Chat Repository Interface
 * Defines contract for chat and messaging operations
 */
interface ChatRepository {
    
    /**
     * Send message to AI assistant
     */
    suspend fun sendMessage(
        message: String,
        conversationId: String? = null
    ): NetworkResult<MessageResponse>
    
    /**
     * Get all conversations
     */
    suspend fun getConversations(
        page: Int = 1,
        pageSize: Int = 20,
        includeArchived: Boolean = false
    ): NetworkResult<ConversationsListResponse>
    
    /**
     * Get specific conversation with messages
     */
    suspend fun getConversation(conversationId: String): NetworkResult<ConversationDetailDto>
    
    /**
     * Create new conversation
     */
    suspend fun createConversation(
        title: String? = null,
        initialMessage: String? = null
    ): NetworkResult<CreateConversationResponse>
    
    /**
     * Update conversation
     */
    suspend fun updateConversation(
        conversationId: String,
        title: String? = null,
        isArchived: Boolean? = null
    ): NetworkResult<ConversationDto>
    
    /**
     * Delete conversation
     */
    suspend fun deleteConversation(conversationId: String): NetworkResult<Unit>
    
    /**
     * Archive/unarchive conversation
     */
    suspend fun archiveConversation(
        conversationId: String,
        archived: Boolean = true
    ): NetworkResult<ConversationDto>
    
    /**
     * Search conversations
     */
    suspend fun searchConversations(
        query: String,
        limit: Int = 20
    ): NetworkResult<ConversationsListResponse>
    
    /**
     * Get messages for a conversation
     */
    suspend fun getMessages(
        conversationId: String,
        limit: Int = 50,
        offset: Int = 0
    ): NetworkResult<List<MessageResponse>>
    
    /**
     * Provide feedback on message
     */
    suspend fun provideFeedback(
        messageId: String,
        rating: Int,
        feedback: String? = null
    ): NetworkResult<MessageFeedbackResponse>
    
    /**
     * Regenerate AI response
     */
    suspend fun regenerateMessage(
        messageId: String,
        temperature: Float? = null
    ): NetworkResult<MessageResponse>
    
    /**
     * Delete message
     */
    suspend fun deleteMessage(messageId: String): NetworkResult<Unit>
    
    /**
     * Observe conversations as Flow (from local cache)
     */
    fun observeConversations(): Flow<List<ConversationDto>>
    
    /**
     * Observe messages for a conversation (from local cache)
     */
    fun observeMessages(conversationId: String): Flow<List<MessageResponse>>
    
    /**
     * Check network connectivity
     */
    suspend fun isNetworkAvailable(): Boolean
}