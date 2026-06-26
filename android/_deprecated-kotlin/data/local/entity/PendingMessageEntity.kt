package com.caredroid.clinical.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Pending Message Entity
 * Queue for messages to send when back online
 */
@Entity(tableName = "pending_messages")
data class PendingMessageEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val conversationId: String?,
    val content: String,
    val timestamp: Long,
    val retryCount: Int = 0
)
