package com.caredroid.clinical.data.remote.dto

/**
 * Health Check and System Status Data Transfer Objects
 * Used for monitoring backend health and configuration
 */

/**
 * Basic health check response
 */
data class HealthResponse(
    val status: String, // "healthy", "degraded", "unhealthy"
    val timestamp: String,
    val service: String = "CareDroid-Clinical-AI API",
    val version: String,
    val uptime: Long? = null
)

/**
 * Detailed health check with component status
 */
data class DetailedHealthResponse(
    val status: String,
    val timestamp: String,
    val version: String,
    val uptime: Long,
    val components: ComponentsHealth
)

/**
 * Individual component health status
 */
data class ComponentsHealth(
    val database: ComponentStatus,
    val ai: ComponentStatus,
    val rag: ComponentStatus,
    val cache: ComponentStatus? = null,
    val queue: ComponentStatus? = null
)

/**
 * Component status details
 */
data class ComponentStatus(
    val status: String, // "up", "down", "degraded"
    val responseTime: Long? = null,
    val message: String? = null,
    val lastCheck: String? = null
)

/**
 * System configuration response
 */
data class SystemConfigResponse(
    val apiVersion: String,
    val features: List<String>,
    val maintenanceMode: Boolean,
    val rateLimits: RateLimits? = null,
    val supportedModels: List<String>? = null
)

/**
 * Rate limiting configuration
 */
data class RateLimits(
    val requestsPerMinute: Int,
    val requestsPerHour: Int,
    val tokensPerRequest: Int? = null
)

/**
 * Server metrics response
 */
data class MetricsResponse(
    val requestsTotal: Long,
    val requestsPerSecond: Float,
    val averageResponseTime: Long,
    val errorRate: Float,
    val activeConnections: Int,
    val timestamp: String
)

/**
 * Feature flags response
 */
data class FeatureFlagsResponse(
    val flags: Map<String, Boolean>,
    val timestamp: String
)

/**
 * API version information
 */
data class VersionResponse(
    val version: String,
    val buildNumber: String,
    val buildDate: String,
    val gitCommit: String? = null,
    val environment: String // "development", "staging", "production"
)

/**
 * System announcement/status message
 */
data class SystemAnnouncementResponse(
    val type: String, // "info", "warning", "error", "maintenance"
    val title: String,
    val message: String,
    val startTime: String? = null,
    val endTime: String? = null,
    val dismissible: Boolean = true
)

/**
 * Backend capacity/load information
 */
data class CapacityResponse(
    val currentLoad: Float, // 0.0 - 1.0
    val availableCapacity: Float,
    val queuedRequests: Int,
    val estimatedWaitTime: Long? = null,
    val status: String // "normal", "high_load", "at_capacity"
)
