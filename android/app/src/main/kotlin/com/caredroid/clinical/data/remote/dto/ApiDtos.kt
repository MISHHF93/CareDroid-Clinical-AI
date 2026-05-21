package com.caredroid.clinical.data.remote.dto

/**
 * Authentication DTOs
 */
data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val user: UserDto
)

data class SignupRequest(
    val email: String,
    val password: String,
    val name: String
)

data class RefreshTokenRequest(
    val token: String
)

data class RefreshTokenResponse(
    val token: String
)

/**
 * User DTOs
 */
data class UserDto(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val permissions: List<String>
)

/**
 * Chat Message DTOs
 */
data class ChatMessageRequest(
    val message: String,
    val conversationId: String? = null
)

data class ChatMessageResponse(
    val id: String,
    val role: String, // "user", "assistant"
    val content: String,
    val timestamp: Long,
    val citations: List<Citation>? = null,
    val confidence: Float? = null
)

data class Citation(
    val text: String,
    val source: String,
    val url: String? = null
)

/**
 * Conversation DTOs
 */
data class ConversationDto(
    val id: String,
    val title: String,
    val createdAt: Long,
    val updatedAt: Long,
    val messageCount: Int
)

data class ConversationDetailDto(
    val id: String,
    val title: String,
    val messages: List<ChatMessageResponse>,
    val createdAt: Long,
    val updatedAt: Long
)

/**
 * Health & Status DTOs
 */
data class HealthResponse(
    val status: String,
    val timestamp: String,
    val service: String,
    val version: String
)

data class SystemConfigDto(
    val apiVersion: String,
    val features: List<String>,
    val maintenanceMode: Boolean
)

/**
 * Clinical Tool DTOs
 */
data class DrugCheckRequest(
    val drugs: List<String>
)

data class DrugInteractionResponse(
    val interactions: List<String>,
    val severity: String,
    val recommendations: String? = null
)

data class LabInterpreterRequest(
    val labValue: String,
    val units: String,
    val normalRange: String? = null
)

data class LabInterpreterResponse(
    val interpretation: String,
    val severity: String,
    val recommendations: List<String>
)

data class SofaCalculatorRequest(
    val respiratoryFio2: Float,
    val respiratoryPao2: Float,
    val coagulationPlatelet: Float,
    val liverBilirubin: Float,
    val cardiovascularMap: Float,
    val renalCreatinine: Float
)

data class SofaCalculatorResponse(
    val score: Int,
    val severity: String,
    val breakdown: Map<String, Int>
)

/**
 * Error Response
 */
data class ErrorResponse(
    val code: Int,
    val message: String,
    val timestamp: String,
    val details: String? = null
)

/**
 * List Response wrapper
 */
data class ListResponse<T>(
    val data: List<T>,
    val total: Int,
    val page: Int,
    val pageSize: Int
)
