package com.caredroid.clinical.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.dto.LoginRequest
import com.caredroid.clinical.data.remote.dto.RegisterRequest
import com.caredroid.clinical.domain.repository.AuthRepository
import com.caredroid.clinical.ui.state.AuthUiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * AuthViewModel
 * Manages authentication state and operations
 */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        checkAuthStatus()
    }

    /**
     * Login with email and password
     */
    fun login(email: String, password: String) {
        // Validate inputs
        val errors = mutableMapOf<String, String>()
        if (email.isBlank()) {
            errors["email"] = "Email is required"
        } else if (!isValidEmail(email)) {
            errors["email"] = "Invalid email format"
        }
        if (password.isBlank()) {
            errors["password"] = "Password is required"
        } else if (password.length < 6) {
            errors["password"] = "Password must be at least 6 characters"
        }

        if (errors.isNotEmpty()) {
            _uiState.update { it.copy(validationErrors = errors) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, validationErrors = emptyMap()) }

            val result = authRepository.login(LoginRequest(email, password))

            when (result) {
                is NetworkResult.Success -> {
                    val response = result.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            user = response.user,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isAuthenticated = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Register new user
     */
    fun signup(name: String, email: String, password: String, confirmPassword: String) {
        // Validate inputs
        val errors = mutableMapOf<String, String>()
        if (name.isBlank()) {
            errors["name"] = "Name is required"
        }
        if (email.isBlank()) {
            errors["email"] = "Email is required"
        } else if (!isValidEmail(email)) {
            errors["email"] = "Invalid email format"
        }
        if (password.isBlank()) {
            errors["password"] = "Password is required"
        } else if (password.length < 6) {
            errors["password"] = "Password must be at least 6 characters"
        }
        if (password != confirmPassword) {
            errors["confirmPassword"] = "Passwords do not match"
        }

        if (errors.isNotEmpty()) {
            _uiState.update { it.copy(validationErrors = errors) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, validationErrors = emptyMap()) }

            val result = authRepository.register(RegisterRequest(name, email, password))

            when (result) {
                is NetworkResult.Success -> {
                    val response = result.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            user = response.user,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isAuthenticated = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Logout current user
     */
    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.update {
                AuthUiState() // Reset to initial state
            }
        }
    }

    /**
     * Check if user is already authenticated
     */
    private fun checkAuthStatus() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val result = authRepository.getCurrentUser()

            when (result) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            user = result.data
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isAuthenticated = false
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Enable two-factor authentication
     */
    fun enableTwoFactor() {
        viewModelScope.launch {
            val result = authRepository.enableTwoFactor()

            when (result) {
                is NetworkResult.Success -> {
                    // Handle success (show QR code, etc.)
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(error = result.message) }
                }
                is NetworkResult.Loading -> {
                    // No action needed
                }
            }
        }
    }

    /**
     * Request password reset
     */
    fun requestPasswordReset(email: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val result = authRepository.requestPasswordReset(email)

            when (result) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Clear error message
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Clear validation errors
     */
    fun clearValidationErrors() {
        _uiState.update { it.copy(validationErrors = emptyMap()) }
    }

    /**
     * Validate email format
     */
    private fun isValidEmail(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }
}
