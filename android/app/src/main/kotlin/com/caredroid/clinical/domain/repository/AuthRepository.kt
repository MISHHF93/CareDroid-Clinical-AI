package com.caredroid.clinical.domain.repository

import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.dto.*
import kotlinx.coroutines.flow.Flow

/**
 * Authentication Repository Interface
 * Defines contract for authentication operations
 */
interface AuthRepository {
    
    /**
     * Login with email and password
     */
    suspend fun login(email: String, password: String): NetworkResult<LoginResponse>
    
    /**
     * Register new user account
     */
    suspend fun register(email: String, password: String, name: String): NetworkResult<SignupResponse>
    
    /**
     * Refresh authentication token
     */
    suspend fun refreshToken(refreshToken: String): NetworkResult<RefreshTokenResponse>
    
    /**
     * Get current authenticated user
     */
    suspend fun getCurrentUser(): NetworkResult<UserDto>
    
    /**
     * Logout current user
     */
    suspend fun logout(): NetworkResult<Unit>
    
    /**
     * Change password
     */
    suspend fun changePassword(currentPassword: String, newPassword: String): NetworkResult<Unit>
    
    /**
     * Request password reset
     */
    suspend fun resetPassword(email: String): NetworkResult<Unit>
    
    /**
     * Verify two-factor authentication
     */
    suspend fun verifyTwoFactor(code: String, token: String): NetworkResult<TwoFactorResponse>
    
    /**
     * Check if user is authenticated (has valid token)
     */
    suspend fun isAuthenticated(): Boolean
    
    /**
     * Get stored auth token
     */
    suspend fun getAuthToken(): String?
    
    /**
     * Save auth token
     */
    suspend fun saveAuthToken(token: String)
    
    /**
     * Clear auth token
     */
    suspend fun clearAuthToken()
    
    /**
     * Observe authentication state
     */
    fun observeAuthState(): Flow<Boolean>
}