package com.caredroid.clinical.domain.repository

import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.dto.*
import kotlinx.coroutines.flow.Flow

/**
 * Health & System Repository Interface
 * Defines contract for system health and configuration operations
 */
interface HealthRepository {
    
    /**
     * Perform basic health check
     */
    suspend fun healthCheck(): NetworkResult<HealthResponse>
    
    /**
     * Perform detailed health check
     */
    suspend fun detailedHealthCheck(): NetworkResult<DetailedHealthResponse>
    
    /**
     * Get system configuration
     */
    suspend fun getSystemConfig(): NetworkResult<SystemConfigResponse>
    
    /**
     * Get feature flags
     */
    suspend fun getFeatureFlags(): NetworkResult<FeatureFlagsResponse>
    
    /**
     * Get API version
     */
    suspend fun getVersion(): NetworkResult<VersionResponse>
    
    /**
     * Get server metrics
     */
    suspend fun getMetrics(): NetworkResult<MetricsResponse>
    
    /**
     * Get system announcements
     */
    suspend fun getAnnouncements(): NetworkResult<List<SystemAnnouncementResponse>>
    
    /**
     * Get current system capacity
     */
    suspend fun getCapacity(): NetworkResult<CapacityResponse>
    
    /**
     * Observe health status
     */
    fun observeHealthStatus(): Flow<HealthResponse>
    
    /**
     * Start periodic health monitoring
     */
    suspend fun startHealthMonitoring(intervalMillis: Long = 60000L)
    
    /**
     * Stop health monitoring
     */
    suspend fun stopHealthMonitoring()
}