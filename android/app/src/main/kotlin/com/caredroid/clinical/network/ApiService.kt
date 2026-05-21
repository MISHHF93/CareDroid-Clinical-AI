package com.caredroid.clinical.data.remote.api

import com.caredroid.clinical.data.remote.dto.*
import retrofit2.http.*

/**
 * CareDroid API Service
 * Defines all REST API endpoints for the clinical application
 */
interface CareDroidApiService {
    
    // ======================== AUTHENTICATION ENDPOINTS ========================
    
    @POST("/api/auth/register")
    suspend fun signup(@Body request: SignupRequest): LoginResponse
    
    @POST("/api/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse
    
    @POST("/api/auth/refresh-token")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): RefreshTokenResponse
    
    @GET("/api/auth/me")
    suspend fun getCurrentUser(): UserDto
    
    @POST("/api/auth/logout")
    suspend fun logout(): Void
    
    // ======================== CHAT ENDPOINTS ========================
    
    @POST("/api/chat/message-3d")
    suspend fun sendChatMessage(@Body request: ChatMessageRequest): ChatMessageResponse
    
    @GET("/api/chat/conversations")
    suspend fun getConversations(): List<ConversationDto>
    
    @GET("/api/chat/conversations/{id}")
    suspend fun getConversationDetail(@Path("id") conversationId: String): ConversationDetailDto
    
    @DELETE("/api/chat/conversations/{id}")
    suspend fun deleteConversation(@Path("id") conversationId: String): Void
    
    @POST("/api/chat/export")
    suspend fun exportConversation(
        @Query("conversationId") conversationId: String
    ): String // Returns exported content
    
    // ======================== CLINICAL TOOLS ENDPOINTS ========================
    
    @POST("/api/tools/drug-interactions")
    suspend fun checkDrugInteractions(@Body request: DrugCheckRequest): DrugInteractionResponse
    
    @POST("/api/tools/lab-interpreter")
    suspend fun interpretLabValue(@Body request: LabInterpreterRequest): LabInterpreterResponse
    
    @POST("/api/tools/sofa-calculator")
    suspend fun calculateSOFA(@Body request: SofaCalculatorRequest): SofaCalculatorResponse
    
    @GET("/api/tools/protocols")
    suspend fun getProtocols(): List<String>
    
    // ======================== HEALTH & CONFIG ENDPOINTS ========================
    
    @GET("/health")
    suspend fun getHealth(): HealthResponse
    
    @GET("/api/system/config")
    suspend fun getSystemConfig(): SystemConfigDto
    
    @GET("/api/user/permissions")
    suspend fun getUserPermissions(): List<String>
}

