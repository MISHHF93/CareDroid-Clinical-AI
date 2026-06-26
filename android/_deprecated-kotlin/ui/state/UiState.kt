package com.caredroid.clinical.ui.state

import com.caredroid.clinical.data.remote.dto.*

/**
 * UI State classes for all screens
 * Represent the current state of the UI
 */

/**
 * Chat Screen State
 */
data class ChatUiState(
    val messages: List<MessageResponse> = emptyList(),
    val conversations: List<ConversationDto> = emptyList(),
    val currentConversationId: String? = null,
    val inputText: String = "",
    val isLoading: Boolean = false,
    val isTyping: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null,
    val healthStatus: HealthStatus? = null
)

data class HealthStatus(
    val status: String,
    val version: String,
    val timestamp: String
)

/**
 * Auth Screen State
 */
data class AuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val user: UserDto? = null,
    val requiresTwoFactor: Boolean = false,
    val twoFactorUserId: String? = null,
    val twoFactorChallenge: String? = null,
    val error: String? = null,
    val validationErrors: Map<String, String> = emptyMap()
)

/**
 * Settings Screen State
 */
data class SettingsUiState(
    val pushNotificationsEnabled: Boolean = true,
    val emailNotificationsEnabled: Boolean = true,
    val biometricEnabled: Boolean = false,
    val twoFactorEnabled: Boolean = false,
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val appVersion: String = "1.0.0",
    val isLoading: Boolean = false,
    val error: String? = null
)

enum class ThemeMode {
    LIGHT, DARK, SYSTEM
}

/**
 * Profile Screen State
 */
data class ProfileUiState(
    val user: UserDto? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val updateSuccess: Boolean = false
)

/**
 * Tools Screen State
 */
data class ToolsUiState(
    val drugInteractions: DrugInteractionResponse? = null,
    val labResult: LabInterpreterResponse? = null,
    val sofaScore: SofaCalculatorResponse? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

/**
 * Team Screen State
 */
data class TeamUiState(
    val members: List<TeamMemberDto> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

data class TeamMemberDto(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val isActive: Boolean
)

/**
 * Audit Logs Screen State
 */
data class AuditLogsUiState(
    val logs: List<AuditLogDto> = emptyList(),
    val filter: LogFilter = LogFilter.ALL,
    val isLoading: Boolean = false,
    val error: String? = null
)

data class AuditLogDto(
    val id: String,
    val action: String,
    val description: String,
    val timestamp: String,
    val type: String
)

enum class LogFilter {
    ALL, INFO, WARNING, ERROR
}
