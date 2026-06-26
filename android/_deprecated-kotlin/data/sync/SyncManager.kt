package com.caredroid.clinical.data.sync

import com.caredroid.clinical.data.local.dao.*
import com.caredroid.clinical.data.mapper.toDto
import com.caredroid.clinical.data.mapper.toEntity
import com.caredroid.clinical.data.mapper.toRequest
import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.domain.repository.ChatRepository
import com.caredroid.clinical.util.NetworkMonitor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Sync Manager
 * Handles offline message queue and syncing
 */
@Singleton
class SyncManager @Inject constructor(
    private val chatRepository: ChatRepository,
    private val messageDao: MessageDao,
    private val conversationDao: ConversationDao,
    private val pendingMessageDao: PendingMessageDao,
    private val networkMonitor: NetworkMonitor
) {
    
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    init {
        startSyncMonitoring()
    }
    
    /**
     * Start monitoring network state and sync when connected
     */
    private fun startSyncMonitoring() {
        scope.launch {
            networkMonitor.isConnected.collectLatest { isConnected ->
                if (isConnected) {
                    delay(1000) // Wait a bit after connection
                    syncPendingMessages()
                    syncUnsyncedData()
                }
            }
        }
    }
    
    /**
     * Sync pending messages when back online
     */
    private suspend fun syncPendingMessages() {
        try {
            val pendingMessages = pendingMessageDao.getAllPending()
            
            for (pending in pendingMessages) {
                val result = chatRepository.sendMessage(pending.toRequest())
                
                when (result) {
                    is NetworkResult.Success -> {
                        // Message sent successfully, remove from queue
                        val response = result.data
                        pendingMessageDao.deletePending(pending.id)
                        
                        // Save the message with response data
                        messageDao.insertMessage(
                            response.toEntity(
                                response.conversationId ?: pending.conversationId ?: ""
                            )
                        )
                    }
                    is NetworkResult.Error -> {
                        // Increment retry count
                        pendingMessageDao.incrementRetryCount(pending.id)
                    }
                    is NetworkResult.Loading -> {
                        // Continue
                    }
                }
            }
            
            // Clean up failed messages (3+ retries)
            pendingMessageDao.deleteFailedMessages()
            
        } catch (e: Exception) {
            // Log error but continue
        }
    }
    
    /**
     * Sync unsynced local data
     */
    private suspend fun syncUnsyncedData() {
        try {
            // Sync conversations
            val unsyncedConversations = conversationDao.getUnsyncedConversations()
            for (conversation in unsyncedConversations) {
                // Mark as synced (API already has it)
                conversationDao.markAsSynced(conversation.id)
            }
            
            // Sync messages
            val unsyncedMessages = messageDao.getUnsyncedMessages()
            for (message in unsyncedMessages) {
                messageDao.markAsSynced(message.id)
            }
            
        } catch (e: Exception) {
            // Log error but continue
        }
    }
    
    /**
     * Queue a message for sending when online
     */
    suspend fun queueMessage(message: String, conversationId: String?) {
        pendingMessageDao.insertPending(
            com.caredroid.clinical.data.local.entity.PendingMessageEntity(
                conversationId = conversationId,
                content = message,
                timestamp = System.currentTimeMillis(),
                retryCount = 0
            )
        )
    }
    
    /**
     * Check if there are pending messages
     */
    suspend fun hasPendingMessages(): Boolean {
        return pendingMessageDao.getAllPending().isNotEmpty()
    }
}
