package com.caredroid.clinical.data.repository

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.api.CareDroidApiService
import com.caredroid.clinical.data.remote.dto.*
import com.caredroid.clinical.domain.repository.HealthRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of HealthRepository
 * Handles system health and configuration operations
 */
@Singleton
class HealthRepositoryImpl @Inject constructor(
    private val apiService: CareDroidApiService,
    @ApplicationContext private val context: Context
) : HealthRepository {
    
    private val _healthStatusFlow = MutableStateFlow<HealthResponse?>(null)
    private var healthMonitoringJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    override suspend fun healthCheck(): NetworkResult<HealthResponse> {
        return executeApiCall {
            apiService.healthCheck()
        }.also { result ->
            if (result is NetworkResult.Success) {
                _healthStatusFlow.value = result.data
            }
        }
    }
    
    override suspend fun detailedHealthCheck(): NetworkResult<DetailedHealthResponse> {
        return executeApiCall {
            apiService.detailedHealthCheck()
        }
    }
    
    override suspend fun getSystemConfig(): NetworkResult<SystemConfigResponse> {
        return executeApiCall {
            apiService.getSystemConfig()
        }
    }
    
    override suspend fun getFeatureFlags(): NetworkResult<FeatureFlagsResponse> {
        return executeApiCall {
            apiService.getFeatureFlags()
        }
    }
    
    override suspend fun getVersion(): NetworkResult<VersionResponse> {
        return executeApiCall {
            apiService.getVersion()
        }
    }
    
    override suspend fun getMetrics(): NetworkResult<MetricsResponse> {
        return executeApiCall {
            apiService.getMetrics()
        }
    }
    
    override suspend fun getAnnouncements(): NetworkResult<List<SystemAnnouncementResponse>> {
        return executeApiCall {
            apiService.getAnnouncements()
        }
    }
    
    override suspend fun getCapacity(): NetworkResult<CapacityResponse> {
        return executeApiCall {
            apiService.getCapacity()
        }
    }
    
    override fun observeHealthStatus(): Flow<HealthResponse> {
        return _healthStatusFlow.asStateFlow() as Flow<HealthResponse>
    }
    
    override suspend fun startHealthMonitoring(intervalMillis: Long) {
        stopHealthMonitoring()
        
        healthMonitoringJob = scope.launch {
            while (isActive) {
                healthCheck()
                delay(intervalMillis)
            }
        }
    }
    
    override suspend fun stopHealthMonitoring() {
        healthMonitoringJob?.cancel()
        healthMonitoringJob = null
    }
    
    /**
     * Execute API call with error handling
     */
    private suspend fun <T> executeApiCall(
        apiCall: suspend () -> Response<T>
    ): NetworkResult<T> {
        return try {
            if (!isNetworkAvailable()) {
                return NetworkResult.Error("No internet connection", code = -1)
            }
            
            val response = apiCall()
            
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                val errorMessage = response.errorBody()?.string() ?: "Unknown error"
                NetworkResult.Error(errorMessage, code = response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(
                message = e.message ?: "Network error occurred",
                throwable = e
            )
        }
    }
    
    /**
     * Check network connectivity
     */
    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
}
