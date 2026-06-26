package com.caredroid.clinical.data.repository

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.api.CareDroidApiService
import com.caredroid.clinical.data.remote.dto.*
import com.caredroid.clinical.domain.repository.ChatRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of ChatRepository
 * Handles chat and messaging operations with the backend API
 */
@Singleton
class ChatRepositoryImpl @Inject constructor(
    private val apiService: CareDroidApiService,
    @ApplicationContext private val context: Context
) : ChatRepository {
    
    private val _conversationsFlow = MutableStateFlow<List<ConversationDto>>(emptyList())
    private val _messagesFlow = MutableStateFlow<Map<String, List<MessageResponse>>>(emptyMap())
    
    override suspend fun sendMessage(message: String, conversationId: String?): NetworkResult<MessageResponse> {
        return executeApiCall {
            apiService.sendMessage(MessageRequest(message, conversationId))
        }.also { result ->
            if (result is NetworkResult.Success) {
                // Cache message locally
                cacheMessage(result.data)
            }
        }
    }
    
    override suspend fun getConversations(
        page: Int,
        pageSize: Int,
        includeArchived: Boolean
    ): NetworkResult<ConversationsListResponse> {
        return executeApiCall {
            apiService.getConversations(page, pageSize, includeArchived)
        }.also { result ->
            if (result is NetworkResult.Success) {
                _conversationsFlow.value = result.data.conversations
            }
        }
    }
    
    override suspend fun getConversation(conversationId: String): NetworkResult<ConversationDetailDto> {
        return executeApiCall {
            apiService.getConversation(conversationId)
        }.also { result ->
            if (result is NetworkResult.Success) {
                cacheMessages(conversationId, result.data.messages)
            }
        }
    }
    
    override suspend fun createConversation(
        title: String?,
        initialMessage: String?
    ): NetworkResult<CreateConversationResponse> {
        return executeApiCall {
            apiService.createConversation(CreateConversationRequest(title, initialMessage))
        }
    }
    
    override suspend fun updateConversation(
        conversationId: String,
        title: String?,
        isArchived: Boolean?
    ): NetworkResult<ConversationDto> {
        return executeApiCall {
            apiService.updateConversation(
                conversationId,
                UpdateConversationRequest(title, isArchived)
            )
        }
    }
    
    override suspend fun deleteConversation(conversationId: String): NetworkResult<Unit> {
        return executeApiCall {
            apiService.deleteConversation(conversationId)
        }.also { result ->
            if (result is NetworkResult.Success) {
                // Remove from cache
                _conversationsFlow.value = _conversationsFlow.value.filter { it.id != conversationId }
                val updatedMessages = _messagesFlow.value.toMutableMap()
                updatedMessages.remove(conversationId)
                _messagesFlow.value = updatedMessages
            }
        }
    }
    
    override suspend fun archiveConversation(
        conversationId: String,
        archived: Boolean
    ): NetworkResult<ConversationDto> {
        return executeApiCall {
            apiService.archiveConversation(
                conversationId,
                ArchiveConversationRequest(conversationId, archived)
            )
        }
    }
    
    override suspend fun searchConversations(
        query: String,
        limit: Int
    ): NetworkResult<ConversationsListResponse> {
        return executeApiCall {
            apiService.searchConversations(SearchConversationsRequest(query, limit))
        }
    }
    
    override suspend fun getMessages(
        conversationId: String,
        limit: Int,
        offset: Int
    ): NetworkResult<List<MessageResponse>> {
        return executeApiCall {
            apiService.getMessages(conversationId, limit, offset)
        }.also { result ->
            if (result is NetworkResult.Success) {
                cacheMessages(conversationId, result.data)
            }
        }
    }
    
    override suspend fun provideFeedback(
        messageId: String,
        rating: Int,
        feedback: String?
    ): NetworkResult<MessageFeedbackResponse> {
        return executeApiCall {
            apiService.provideFeedback(messageId, MessageFeedbackRequest(messageId, rating, feedback))
        }
    }
    
    override suspend fun regenerateMessage(
        messageId: String,
        temperature: Float?
    ): NetworkResult<MessageResponse> {
        return executeApiCall {
            apiService.regenerateMessage(messageId, RegenerateMessageRequest(messageId, temperature))
        }
    }
    
    override suspend fun deleteMessage(messageId: String): NetworkResult<Unit> {
        return executeApiCall {
            apiService.deleteMessage(messageId)
        }
    }
    
    override fun observeConversations(): Flow<List<ConversationDto>> {
        return _conversationsFlow.asStateFlow()
    }
    
    override fun observeMessages(conversationId: String): Flow<List<MessageResponse>> {
        return MutableStateFlow(_messagesFlow.value[conversationId] ?: emptyList()).asStateFlow()
    }
    
    override suspend fun isNetworkAvailable(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
    
    /**
     * Cache message locally
     */
    private fun cacheMessage(message: MessageResponse) {
        val conversationId = message.conversationId
        val currentMessages = _messagesFlow.value[conversationId]?.toMutableList() ?: mutableListOf()
        currentMessages.add(message)
        
        val updatedMessages = _messagesFlow.value.toMutableMap()
        updatedMessages[conversationId] = currentMessages
        _messagesFlow.value = updatedMessages
        
        // TODO: Phase 5 - Save to Room database
    }
    
    /**
     * Cache messages for a conversation
     */
    private fun cacheMessages(conversationId: String, messages: List<MessageResponse>) {
        val updatedMessages = _messagesFlow.value.toMutableMap()
        updatedMessages[conversationId] = messages
        _messagesFlow.value = updatedMessages
        
        // TODO: Phase 5 - Save to Room database
    }
    
    /**
     * Execute API call with error handling
     */
    private suspend fun <T> executeApiCall(
        apiCall: suspend () -> Response<T>
    ): NetworkResult<T> {
        return try {
            if (!isNetworkAvailable()) {
                return NetworkResult.Error("No internet connection", code = -1)
            }
            
            val response = apiCall()
            
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                val errorMessage = response.errorBody()?.string() ?: "Unknown error"
                NetworkResult.Error(errorMessage, code = response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(
                message = e.message ?: "Network error occurred",
                throwable = e
            )
        }
    }
}
