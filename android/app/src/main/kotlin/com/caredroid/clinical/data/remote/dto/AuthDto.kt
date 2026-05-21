package com.caredroid.clinical.data.remote.dto

/**
 * Authentication Data Transfer Objects
 * Used for API communication with backend auth endpoints
 */

/**
 * Login request payload
 */
data class LoginRequest(
    val email: String,
    val password: String
)

/**
 * Login response with token and user data
 */
data class LoginResponse(
    val token: String,
    val refreshToken: String? = null,
    val user: UserDto,
    val expiresIn: Long? = null
)

/**
 * Registration request payload
 */
data class SignupRequest(
    val email: String,
    val password: String,
    val name: String,
    val role: String = "clinician"
)

/**
 * Registration response
 */
data class SignupResponse(
    val token: String,
    val user: UserDto
)

/**
 * Token refresh request
 */
data class RefreshTokenRequest(
    val refreshToken: String
)

/**
 * Token refresh response
 */
data class RefreshTokenResponse(
    val token: String,
    val refreshToken: String? = null,
    val expiresIn: Long? = null
)

/**
 * User data transfer object
 */
data class UserDto(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val permissions: List<String> = emptyList(),
    val createdAt: String? = null,
    val lastLogin: String? = null
)

/**
 * Get current user response
 */
data class MeResponse(
    val user: UserDto
)

/**
 * Logout request (optional body)
 */
data class LogoutRequest(
    val token: String? = null
)

/**
 * Password change request
 */
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

/**
 * Password reset request
 */
data class ResetPasswordRequest(
    val email: String
)

/**
 * Two-factor authentication request
 */
data class TwoFactorRequest(
    val code: String,
    val token: String
)

/**
 * Two-factor authentication response
 */
data class TwoFactorResponse(
    val success: Boolean,
    val token: String? = null
)
