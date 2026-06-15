package com.caredroid.clinical.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.domain.repository.ChatRepository
import com.caredroid.clinical.domain.repository.HealthRepository
import com.caredroid.clinical.ui.state.ChatUiState
import com.caredroid.clinical.ui.state.HealthStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ChatViewModel
 * Manages chat state, messages, and conversations
 */
@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val healthRepository: HealthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var healthCheckJob: Job? = null

    init {
        loadConversations()
        startHealthCheck()
    }

    /**
     * Send a message to the AI assistant
     */
    fun sendMessage(message: String, conversationId: String? = null) {
        if (message.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, error = null) }

            // Show typing indicator
            _uiState.update { it.copy(isTyping = true) }

            val result = chatRepository.sendMessage(message, conversationId)

            when (result) {
                is NetworkResult.Success -> {
                    val response = result.data
                    _uiState.update { state ->
                        state.copy(
                            messages = state.messages + response,
                            currentConversationId = response.conversationId,
                            inputText = "",
                            isSending = false,
                            isTyping = false,
                            error = null
                        )
                    }
                    // Reload conversations to update list
                    loadConversations()
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isSending = false,
                            isTyping = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Load all conversations
     */
    fun loadConversations() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val result = chatRepository.getConversations()

            when (result) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            conversations = result.data.conversations,
                            isLoading = false,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Load messages for a specific conversation
     */
    fun loadConversation(conversationId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, currentConversationId = conversationId) }

            val result = chatRepository.getConversation(conversationId)

            when (result) {
                is NetworkResult.Success -> {
                    val conversation = result.data
                    _uiState.update {
                        it.copy(
                            messages = conversation.messages,
                            currentConversationId = conversationId,
                            isLoading = false,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Delete a conversation
     */
    fun deleteConversation(conversationId: String) {
        viewModelScope.launch {
            val result = chatRepository.deleteConversation(conversationId)

            when (result) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            conversations = it.conversations.filter { conv -> conv.id != conversationId },
                            messages = if (it.currentConversationId == conversationId) emptyList() else it.messages,
                            currentConversationId = if (it.currentConversationId == conversationId) null else it.currentConversationId
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(error = result.message) }
                }
                is NetworkResult.Loading -> {
                    // No action needed
                }
            }
        }
    }

    /**
     * Update input text
     */
    fun updateInputText(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    /**
     * Clear error message
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Start new conversation
     */
    fun startNewConversation() {
        _uiState.update {
            it.copy(
                messages = emptyList(),
                currentConversationId = null,
                inputText = ""
            )
        }
    }

    /**
     * Start periodic health check
     */
    private fun startHealthCheck() {
        healthCheckJob = viewModelScope.launch {
            while (true) {
                checkHealth()
                delay(60000) // Check every 60 seconds
            }
        }
    }

    /**
     * Check backend health
     */
    private suspend fun checkHealth() {
        val result = healthRepository.checkHealth()
        when (result) {
            is NetworkResult.Success -> {
                val health = result.data
                _uiState.update {
                    it.copy(
                        healthStatus = HealthStatus(
                            status = health.status,
                            version = health.version,
                            timestamp = health.timestamp
                        )
                    )
                }
            }
            is NetworkResult.Error -> {
                _uiState.update {
                    it.copy(healthStatus = null)
                }
            }
            is NetworkResult.Loading -> {
                // No action needed
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        healthCheckJob?.cancel()
    }
}
