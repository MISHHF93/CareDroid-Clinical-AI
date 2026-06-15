package com.caredroid.clinical.data.mapper

import com.caredroid.clinical.data.local.entity.*
import com.caredroid.clinical.data.remote.dto.*
import com.google.gson.Gson

/**
 * Entity Mappers
 * Convert between DTOs and Entities
 */

private val gson = Gson()

/**
 * Message Mappers
 */
fun MessageResponse.toEntity(conversationId: String): MessageEntity {
    return MessageEntity(
        id = id,
        conversationId = conversationId,
        content = content,
        role = role,
        timestamp = timestamp,
        citationsJson = citations?.let { gson.toJson(it) },
        isSynced = true,
        isPending = false
    )
}

fun MessageEntity.toDto(): MessageResponse {
    return MessageResponse(
        id = id,
        content = content,
        role = role,
        timestamp = timestamp,
        conversationId = conversationId,
        citations = citationsJson?.let {
            try {
                gson.fromJson(it, Array<CitationDto>::class.java).toList()
            } catch (e: Exception) {
                null
            }
        }
    )
}

/**
 * Conversation Mappers
 */
fun ConversationDto.toEntity(): ConversationEntity {
    return ConversationEntity(
        id = id,
        title = title,
        lastMessageAt = updatedAt,
        messageCount = messageCount,
        isSynced = true
    )
}

fun ConversationEntity.toDto(messages: List<MessageResponse> = emptyList()): ConversationDto {
    return ConversationDto(
        id = id,
        title = title,
        createdAt = lastMessageAt,
        updatedAt = lastMessageAt,
        messageCount = messages.size
    )
}

/**
 * User Mappers
 */
fun UserDto.toEntity(): UserEntity {
    return UserEntity(
        id = id,
        name = name,
        email = email,
        role = role,
        createdAt = System.currentTimeMillis(),
        updatedAt = System.currentTimeMillis()
    )
}

fun UserEntity.toDto(): UserDto {
    return UserDto(
        id = id,
        name = name,
        email = email,
        role = role
    )
}

/**
 * Pending Message Mappers
 */
fun MessageRequest.toPendingEntity(): PendingMessageEntity {
    return PendingMessageEntity(
        conversationId = conversationId,
        content = message,
        timestamp = System.currentTimeMillis(),
        retryCount = 0
    )
}

fun PendingMessageEntity.toRequest(): MessageRequest {
    return MessageRequest(
        message = content,
        conversationId = conversationId
    )
}
