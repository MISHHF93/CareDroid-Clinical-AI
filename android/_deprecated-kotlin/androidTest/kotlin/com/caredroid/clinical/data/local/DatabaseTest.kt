package com.caredroid.clinical.data.local

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.caredroid.clinical.data.local.dao.*
import com.caredroid.clinical.data.local.entity.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Instrumented tests for Room Database
 */
@RunWith(AndroidJUnit4::class)
class DatabaseTest {

    private lateinit var database: CareDroidDatabase
    private lateinit var messageDao: MessageDao
    private lateinit var conversationDao: ConversationDao

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(
            context,
            CareDroidDatabase::class.java
        ).build()
        
        messageDao = database.messageDao()
        conversationDao = database.conversationDao()
    }

    @After
    fun teardown() {
        database.close()
    }

    @Test
    fun insertAndGetMessage() = runTest {
        // Given
        val message = MessageEntity(
            id = "1",
            conversationId = "conv1",
            content = "Test message",
            role = "user",
            timestamp = System.currentTimeMillis(),
            isSynced = true,
            isPending = false
        )

        // When
        messageDao.insertMessage(message)
        val messages = messageDao.getMessagesByConversation("conv1").first()

        // Then
        assertEquals(1, messages.size)
        assertEquals("Test message", messages[0].content)
    }

    @Test
    fun deleteMessage() = runTest {
        // Given
        val message = MessageEntity(
            id = "1",
            conversationId = "conv1",
            content = "Test",
            role = "user",
            timestamp = System.currentTimeMillis(),
            isSynced = true,
            isPending = false
        )
        messageDao.insertMessage(message)

        // When
        messageDao.deleteMessage("1")
        val messages = messageDao.getMessagesByConversation("conv1").first()

        // Then
        assertEquals(0, messages.size)
    }

    @Test
    fun insertAndGetConversation() = runTest {
        // Given
        val conversation = ConversationEntity(
            id = "1",
            title = "Test Conversation",
            lastMessageAt = System.currentTimeMillis(),
            messageCount = 5,
            isSynced = true
        )

        // When
        conversationDao.insertConversation(conversation)
        val conversations = conversationDao.getAllConversations().first()

        // Then
        assertEquals(1, conversations.size)
        assertEquals("Test Conversation", conversations[0].title)
    }

    @Test
    fun incrementMessageCount() = runTest {
        // Given
        val conversation = ConversationEntity(
            id = "1",
            title = "Test",
            lastMessageAt = System.currentTimeMillis(),
            messageCount = 5,
            isSynced = true
        )
        conversationDao.insertConversation(conversation)

        // When
        conversationDao.incrementMessageCount("1", System.currentTimeMillis())
        val result = conversationDao.getConversation("1")

        // Then
        assertEquals(6, result?.messageCount)
    }
}
