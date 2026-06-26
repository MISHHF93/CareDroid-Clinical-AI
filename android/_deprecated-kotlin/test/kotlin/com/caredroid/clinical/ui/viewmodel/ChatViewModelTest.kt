package com.caredroid.clinical.ui.viewmodel

import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.dto.*
import com.caredroid.clinical.domain.repository.ChatRepository
import com.caredroid.clinical.domain.repository.HealthRepository
import com.caredroid.clinical.util.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.junit.MockitoJUnit
import org.mockito.junit.MockitoRule

/**
 * Unit tests for ChatViewModel
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ChatViewModelTest {

    @get:Rule
    val mockitoRule: MockitoRule = MockitoJUnit.rule()

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Mock
    private lateinit var chatRepository: ChatRepository

    @Mock
    private lateinit var healthRepository: HealthRepository

    private lateinit var viewModel: ChatViewModel

    @Before
    fun setup() {
        viewModel = ChatViewModel(chatRepository, healthRepository)
    }

    @Test
    fun `sendMessage updates state with success`() = runTest {
        // Given
        val message = "Test message"
        val response = MessageDto(
            id = "msg1",
            content = "Response",
            role = "assistant",
            citations = null
        )
        `when`(chatRepository.sendMessage(any())).thenReturn(
            NetworkResult.Success(response)
        )

        // When
        viewModel.sendMessage(message)

        // Then
        val state = viewModel.uiState.first()
        assertFalse(state.isSending)
        assertFalse(state.isTyping)
        assertNull(state.error)
    }

    @Test
    fun `sendMessage handles error`() = runTest {
        // Given
        val message = "Test message"
        val errorMessage = "Network error"
        `when`(chatRepository.sendMessage(any())).thenReturn(
            NetworkResult.Error(errorMessage)
        )

        // When
        viewModel.sendMessage(message)

        // Then
        val state = viewModel.uiState.first()
        assertFalse(state.isSending)
        assertEquals(errorMessage, state.error)
    }

    @Test
    fun `loadConversations updates state`() = runTest {
        // Given
        val conversations = listOf(
            ConversationDto("1", "Conv 1", emptyList()),
            ConversationDto("2", "Conv 2", emptyList())
        )
        `when`(chatRepository.getConversations()).thenReturn(
            NetworkResult.Success(conversations)
        )

        // When
        viewModel.loadConversations()

        // Then
        val state = viewModel.uiState.first()
        assertEquals(2, state.conversations.size)
        assertFalse(state.isLoading)
    }

    @Test
    fun `updateInputText updates state correctly`() = runTest {
        // Given
        val text = "Test input"

        // When
        viewModel.updateInputText(text)

        // Then
        val state = viewModel.uiState.first()
        assertEquals(text, state.inputText)
    }

    @Test
    fun `startNewConversation clears state`() = runTest {
        // When
        viewModel.startNewConversation()

        // Then
        val state = viewModel.uiState.first()
        assertTrue(state.messages.isEmpty())
        assertNull(state.currentConversationId)
        assertEquals("", state.inputText)
    }

    @Test
    fun `clearError removes error message`() = runTest {
        // When
        viewModel.clearError()

        // Then
        val state = viewModel.uiState.first()
        assertNull(state.error)
    }
}
