package com.caredroid.clinical.data.remote.dto

/**
 * Conversation Data Transfer Objects
 * Used for managing chat conversations
 */

/**
 * Basic conversation information
 */
data class ConversationDto(
    val id: String,
    val title: String,
    val createdAt: Long,
    val updatedAt: Long,
    val messageCount: Int,
    val userId: String? = null,
    val isArchived: Boolean = false,
    val lastMessage: String? = null
)

/**
 * Detailed conversation with messages
 */
data class ConversationDetailDto(
    val id: String,
    val title: String,
    val messages: List<MessageResponse>,
    val createdAt: Long,
    val updatedAt: Long,
    val userId: String,
    val isArchived: Boolean = false
)

/**
 * Create conversation request
 */
data class CreateConversationRequest(
    val title: String? = null,
    val initialMessage: String? = null
)

/**
 * Create conversation response
 */
data class CreateConversationResponse(
    val conversation: ConversationDto,
    val message: MessageResponse? = null
)

/**
 * Update conversation request
 */
data class UpdateConversationRequest(
    val title: String? = null,
    val isArchived: Boolean? = null
)

/**
 * Delete conversation request
 */
data class DeleteConversationRequest(
    val conversationId: String
)

/**
 * List conversations response
 */
data class ConversationsListResponse(
    val conversations: List<ConversationDto>,
    val total: Int,
    val page: Int = 1,
    val pageSize: Int = 20,
    val hasMore: Boolean = false
)

/**
 * Archive conversation request
 */
data class ArchiveConversationRequest(
    val conversationId: String,
    val archived: Boolean = true
)

/**
 * Search conversations request
 */
data class SearchConversationsRequest(
    val query: String,
    val limit: Int = 20,
    val offset: Int = 0
)

/**
 * Export conversation request
 */
data class ExportConversationRequest(
    val conversationId: String,
    val format: String = "json" // json, pdf, txt
)
