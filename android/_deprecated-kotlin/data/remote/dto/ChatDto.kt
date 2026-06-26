package com.caredroid.clinical.data.remote.dto

/**
 * Chat and Messaging Data Transfer Objects
 * Used for API communication with backend chat endpoints
 */

/**
 * Send message request
 */
data class MessageRequest(
    val message: String,
    val conversationId: String? = null,
    val systemPrompt: String? = null,
    val temperature: Float? = null
)

/**
 * Message response from AI
 */
data class MessageResponse(
    val id: String,
    val role: String, // "user", "assistant", "system"
    val content: String,
    val timestamp: Long,
    val conversationId: String,
    val citations: List<CitationDto>? = null,
    val confidence: Float? = null,
    val processingTime: Long? = null,
    val model: String? = null
)

/**
 * Citation data transfer object
 */
data class CitationDto(
    val id: String? = null,
    val text: String,
    val source: String,
    val url: String? = null,
    val pageNumber: Int? = null,
    val relevanceScore: Float? = null
)

/**
 * Streaming message chunk (for SSE/WebSocket)
 */
data class MessageChunk(
    val id: String,
    val content: String,
    val isDone: Boolean = false,
    val conversationId: String? = null
)

/**
 * Message feedback request
 */
data class MessageFeedbackRequest(
    val messageId: String,
    val rating: Int, // 1-5
    val feedback: String? = null
)

/**
 * Message feedback response
 */
data class MessageFeedbackResponse(
    val success: Boolean,
    val message: String
)

/**
 * Regenerate message request
 */
data class RegenerateMessageRequest(
    val messageId: String,
    val temperature: Float? = null
)

/**
 * Delete message request
 */
data class DeleteMessageRequest(
    val messageId: String,
    val conversationId: String
)
