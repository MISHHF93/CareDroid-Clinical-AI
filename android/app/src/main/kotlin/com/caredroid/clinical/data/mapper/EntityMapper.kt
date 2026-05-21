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
fun MessageDto.toEntity(conversationId: String): MessageEntity {
    return MessageEntity(
        id = id ?: System.currentTimeMillis().toString(),
        conversationId = conversationId,
        content = content,
        role = role,
        timestamp = System.currentTimeMillis(),
        citationsJson = citations?.let { gson.toJson(it) },
        isSynced = true,
        isPending = false
    )
}

fun MessageEntity.toDto(): MessageDto {
    return MessageDto(
        id = id,
        content = content,
        role = role,
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
        lastMessageAt = System.currentTimeMillis(),
        messageCount = messages.size,
        isSynced = true
    )
}

fun ConversationEntity.toDto(messages: List<MessageDto> = emptyList()): ConversationDto {
    return ConversationDto(
        id = id,
        title = title,
        messages = messages
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
