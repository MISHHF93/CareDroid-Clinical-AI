package com.caredroid.clinical.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Message Entity - Represents a chat message in the database
 */
@Entity(
    tableName = "messages",
    foreignKeys = [
        ForeignKey(
            entity = ConversationEntity::class,
            parentColumns = ["id"],
            childColumns = ["conversationId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["conversationId"]),
        Index(value = ["timestamp"])
    ]
)
data class MessageEntity(
    @PrimaryKey
    val id: String,
    val conversationId: String,
    val role: String, // "user", "assistant"
    val content: String,
    val timestamp: Long,
    val citations: String? = null, // JSON string
    val confidence: Float? = null,
    val metadata: String? = null // JSON string for extra data
)

/**
 * Conversation Entity - Represents a chat conversation
 */
@Entity(
    tableName = "conversations",
    indices = [
        Index(value = ["createdAt"]),
        Index(value = ["updatedAt"])
    ]
)
data class ConversationEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    val createdAt: Long,
    val updatedAt: Long,
    val messageCount: Int = 0,
    val summary: String? = null
)

/**
 * User Entity - Represents user information
 */
@Entity(
    tableName = "users",
    indices = [
        Index(value = ["email"], unique = true)
    ]
)
data class UserEntity(
    @PrimaryKey
    val id: String,
    val email: String,
    val name: String,
    val role: String,
    val permissions: String = "[]", // JSON array
    val lastSyncTime: Long = 0
)
