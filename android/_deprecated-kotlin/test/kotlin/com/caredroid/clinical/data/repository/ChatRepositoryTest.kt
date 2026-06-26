package com.caredroid.clinical.data.repository

import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.api.CareDroidApiService
import com.caredroid.clinical.data.remote.dto.*
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.MockitoAnnotations

/**
 * Unit tests for ChatRepositoryImpl
 */
class ChatRepositoryTest {

    @Mock
    private lateinit var apiService: CareDroidApiService

    private lateinit var repository: ChatRepositoryImpl

    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        repository = ChatRepositoryImpl(apiService)
    }

    @Test
    fun `sendMessage returns success on valid response`() = runTest {
        // Given
        val request = MessageRequest("Test message", null)
        val response = MessageDto("1", "Response", "assistant", null)
        `when`(apiService.sendMessage(request)).thenReturn(response)

        // When
        val result = repository.sendMessage(request)

        // Then
        assertTrue(result is NetworkResult.Success)
        assertEquals(response, (result as NetworkResult.Success).data)
    }

    @Test
    fun `sendMessage returns error on exception`() = runTest {
        // Given
        val request = MessageRequest("Test message", null)
        `when`(apiService.sendMessage(request)).thenThrow(RuntimeException("Network error"))

        // When
        val result = repository.sendMessage(request)

        // Then
        assertTrue(result is NetworkResult.Error)
    }

    @Test
    fun `getConversations returns success with data`() = runTest {
        // Given
        val conversations = listOf(
            ConversationDto("1", "Conv 1", emptyList()),
            ConversationDto("2", "Conv 2", emptyList())
        )
        `when`(apiService.getConversations()).thenReturn(conversations)

        // When
        val result = repository.getConversations()

        // Then
        assertTrue(result is NetworkResult.Success)
        assertEquals(2, (result as NetworkResult.Success).data.size)
    }

    @Test
    fun `deleteConversation calls API correctly`() = runTest {
        // Given
        val conversationId = "conv123"

        // When
        repository.deleteConversation(conversationId)

        // Then
        verify(apiService).deleteConversation(conversationId)
    }
}
