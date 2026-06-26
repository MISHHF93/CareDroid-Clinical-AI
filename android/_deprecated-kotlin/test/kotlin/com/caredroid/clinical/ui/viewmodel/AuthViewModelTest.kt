package com.caredroid.clinical.ui.viewmodel

import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.dto.*
import com.caredroid.clinical.domain.repository.AuthRepository
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
 * Unit tests for AuthViewModel
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {

    @get:Rule
    val mockitoRule: MockitoRule = MockitoJUnit.rule()

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Mock
    private lateinit var authRepository: AuthRepository

    private lateinit var viewModel: AuthViewModel

    @Before
    fun setup() {
        viewModel = AuthViewModel(authRepository)
    }

    @Test
    fun `login with valid credentials succeeds`() = runTest {
        // Given
        val email = "test@example.com"
        val password = "password123"
        val user = UserDto("1", "Test User", email, "clinician")
        val response = LoginResponse("token123", "refresh123", user)
        
        `when`(authRepository.login(any())).thenReturn(
            NetworkResult.Success(response)
        )

        // When
        viewModel.login(email, password)

        // Then
        val state = viewModel.uiState.first()
        assertTrue(state.isAuthenticated)
        assertEquals(user, state.user)
        assertNull(state.error)
    }

    @Test
    fun `login with invalid email shows validation error`() = runTest {
        // When
        viewModel.login("invalid-email", "password123")

        // Then
        val state = viewModel.uiState.first()
        assertTrue(state.validationErrors.containsKey("email"))
        assertFalse(state.isAuthenticated)
    }

    @Test
    fun `login with short password shows validation error`() = runTest {
        // When
        viewModel.login("test@example.com", "12345")

        // Then
        val state = viewModel.uiState.first()
        assertTrue(state.validationErrors.containsKey("password"))
    }

    @Test
    fun `signup with valid data succeeds`() = runTest {
        // Given
        val name = "Test User"
        val email = "test@example.com"
        val password = "password123"
        val user = UserDto("1", name, email, "clinician")
        val response = LoginResponse("token123", "refresh123", user)
        
        `when`(authRepository.register(any())).thenReturn(
            NetworkResult.Success(response)
        )

        // When
        viewModel.signup(name, email, password, password)

        // Then
        val state = viewModel.uiState.first()
        assertTrue(state.isAuthenticated)
        assertEquals(user, state.user)
    }

    @Test
    fun `signup with mismatched passwords shows error`() = runTest {
        // When
        viewModel.signup("Test", "test@example.com", "password123", "password456")

        // Then
        val state = viewModel.uiState.first()
        assertTrue(state.validationErrors.containsKey("confirmPassword"))
    }

    @Test
    fun `logout clears authentication state`() = runTest {
        // When
        viewModel.logout()

        // Then
        val state = viewModel.uiState.first()
        assertFalse(state.isAuthenticated)
        assertNull(state.user)
    }
}
