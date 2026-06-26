package com.caredroid.clinical.data.remote.api

import com.caredroid.clinical.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

/**
 * CareDroid API Service
 * Retrofit interface defining all backend API endpoints
 */
interface CareDroidApiService {
    
    // ============================================
    // Authentication Endpoints
    // ============================================
    
    /**
     * Login with email and password
     */
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    /**
     * Register new user account
     */
    @POST("api/auth/register")
    suspend fun register(@Body request: SignupRequest): Response<SignupResponse>
    
    /**
     * Get current authenticated user
     */
    @GET("api/auth/me")
    suspend fun getCurrentUser(): Response<UserDto>
    
    /**
     * Request password reset
     */
    @POST("api/auth/magic-link")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<MagicLinkResponse>
    
    /**
     * Verify two-factor authentication code
     */
    @POST("api/auth/verify-2fa")
    suspend fun verifyTwoFactor(@Body request: TwoFactorRequest): Response<TwoFactorResponse>
    
    // ============================================
    // Chat Endpoints
    // ============================================
    
    /**
     * Send message to AI assistant
     */
    @POST("api/chat")
    suspend fun sendMessage(@Body request: MessageRequest): Response<MessageResponse>
    
    /**
     * Get all conversations for current user
     */
    @GET("api/chat/conversations")
    suspend fun getConversations(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("includeArchived") includeArchived: Boolean = false
    ): Response<ConversationsListResponse>
    
    /**
     * Get specific conversation with messages
     */
    @GET("api/chat/conversations/{id}")
    suspend fun getConversation(@Path("id") conversationId: String): Response<ConversationDetailDto>
    
    /**
     * Create new conversation
     */
    @POST("api/chat/conversations")
    suspend fun createConversation(@Body request: CreateConversationRequest): Response<CreateConversationResponse>
    
    /**
     * Update conversation (title, archived status)
     */
    @PATCH("api/chat/conversations/{id}")
    suspend fun updateConversation(
        @Path("id") conversationId: String,
        @Body request: UpdateConversationRequest
    ): Response<ConversationDto>
    
    /**
     * Delete conversation
     */
    @DELETE("api/chat/conversations/{id}")
    suspend fun deleteConversation(@Path("id") conversationId: String): Response<Unit>
    
    /**
     * Archive/unarchive conversation
     */
    @POST("api/chat/conversations/{id}/archive")
    suspend fun archiveConversation(
        @Path("id") conversationId: String,
        @Body request: ArchiveConversationRequest
    ): Response<ConversationDto>
    
    /**
     * Search conversations
     */
    @POST("api/chat/conversations/search")
    suspend fun searchConversations(@Body request: SearchConversationsRequest): Response<ConversationsListResponse>
    
    /**
     * Get messages for a conversation
     */
    @GET("api/chat/conversations/{id}/messages")
    suspend fun getMessages(
        @Path("id") conversationId: String,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<List<MessageResponse>>
    
    /**
     * Provide feedback on a message
     */
    @POST("api/chat/messages/{id}/feedback")
    suspend fun provideFeedback(
        @Path("id") messageId: String,
        @Body request: MessageFeedbackRequest
    ): Response<MessageFeedbackResponse>
    
    /**
     * Regenerate AI response
     */
    @POST("api/chat/messages/{id}/regenerate")
    suspend fun regenerateMessage(
        @Path("id") messageId: String,
        @Body request: RegenerateMessageRequest
    ): Response<MessageResponse>
    
    /**
     * Delete specific message
     */
    @DELETE("api/chat/messages/{id}")
    suspend fun deleteMessage(@Path("id") messageId: String): Response<Unit>
    
    // ============================================
    // Clinical Tools Endpoints
    // ============================================
    
    /**
     * Check drug interactions
     */
    @POST("api/tools/drug-interactions")
    suspend fun checkDrugInteractions(@Body request: DrugCheckRequest): Response<DrugInteractionResponse>
    
    /**
     * Interpret lab values
     */
    @POST("api/tools/lab-interpreter")
    suspend fun interpretLab(@Body request: LabInterpreterRequest): Response<LabInterpreterResponse>
    
    /**
     * Batch interpret multiple lab values
     */
    @POST("api/tools/lab-interpreter/batch")
    suspend fun interpretLabBatch(@Body request: BatchLabRequest): Response<BatchLabResponse>
    
    /**
     * Calculate SOFA score
     */
    @POST("api/tools/sofa-calculator")
    suspend fun calculateSofa(@Body request: SofaCalculatorRequest): Response<SofaCalculatorResponse>
    
    /**
     * Get available clinical tools
     */
    @GET("api/tools")
    suspend fun getAvailableTools(): Response<List<ToolExecutionResponse>>
    
    // ============================================
    // Health & System Endpoints
    // ============================================
    
    /**
     * Basic health check
     */
    @GET("api/health")
    suspend fun healthCheck(): Response<HealthResponse>
    
    /**
     * Detailed health check with components
     */
    @GET("api/health/detailed")
    suspend fun detailedHealthCheck(): Response<DetailedHealthResponse>
    
    /**
     * Get system configuration
     */
    @GET("api/config")
    suspend fun getSystemConfig(): Response<SystemConfigResponse>
    
    /**
     * Get feature flags
     */
    @GET("api/config/features")
    suspend fun getFeatureFlags(): Response<FeatureFlagsResponse>
    
    /**
     * Get API version
     */
    @GET("api/version")
    suspend fun getVersion(): Response<VersionResponse>
    
    /**
     * Get server metrics
     */
    @GET("api/metrics")
    suspend fun getMetrics(): Response<MetricsResponse>
    
    /**
     * Get system announcements
     */
    @GET("api/announcements")
    suspend fun getAnnouncements(): Response<List<SystemAnnouncementResponse>>
    
    /**
     * Get current system capacity
     */
    @GET("api/capacity")
    suspend fun getCapacity(): Response<CapacityResponse>
}
