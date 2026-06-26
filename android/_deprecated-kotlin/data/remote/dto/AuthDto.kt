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
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val user: UserDto? = null,
    val expiresIn: Long? = null,
    val requiresTwoFactor: Boolean = false,
    val userId: String? = null,
    val twoFactorChallenge: String? = null
)

/**
 * Registration request payload
 */
data class SignupRequest(
    val email: String,
    val password: String,
    val fullName: String
)

/**
 * Registration response
 */
data class SignupResponse(
    val userId: String,
    val email: String,
    val verificationRequired: Boolean = true
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
    val accessToken: String,
    val refreshToken: String? = null,
    val expiresIn: Long? = null
)

/**
 * User data transfer object
 */
data class UserDto(
    val id: String,
    val name: String? = null,
    val profile: UserProfileDto? = null,
    val email: String,
    val role: String,
    val permissions: List<String> = emptyList(),
    val createdAt: String? = null,
    val lastLogin: String? = null,
    val lastLoginAt: String? = null
)

data class UserProfileDto(
    val fullName: String? = null
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

data class MagicLinkResponse(
    val status: String
)

/**
 * Two-factor authentication request
 */
data class TwoFactorRequest(
    val userId: String,
    val token: String,
    val challengeToken: String
)

/**
 * Two-factor authentication response
 */
data class TwoFactorResponse(
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val user: UserDto? = null,
    val expiresIn: Long? = null
)
