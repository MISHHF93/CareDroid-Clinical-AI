package com.caredroid.clinical.data.repository

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.api.CareDroidApiService
import com.caredroid.clinical.data.remote.dto.*
import com.caredroid.clinical.domain.repository.ToolsRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of ToolsRepository
 * Handles clinical tool operations with the backend API
 */
@Singleton
class ToolsRepositoryImpl @Inject constructor(
    private val apiService: CareDroidApiService,
    @ApplicationContext private val context: Context
) : ToolsRepository {
    
    override suspend fun checkDrugInteractions(
        drugs: List<String>,
        patientAge: Int?,
        patientWeight: Float?
    ): NetworkResult<DrugInteractionResponse> {
        return executeApiCall {
            apiService.checkDrugInteractions(DrugCheckRequest(drugs, patientAge, patientWeight))
        }
    }
    
    override suspend fun interpretLab(
        testName: String,
        value: Float,
        units: String,
        normalRange: NormalRange?,
        patientAge: Int?,
        patientGender: String?
    ): NetworkResult<LabInterpreterResponse> {
        return executeApiCall {
            apiService.interpretLab(
                LabInterpreterRequest(
                    testName = testName,
                    value = value,
                    units = units,
                    normalRange = normalRange,
                    patientAge = patientAge,
                    patientGender = patientGender
                )
            )
        }
    }
    
    override suspend fun interpretLabBatch(
        tests: List<LabInterpreterRequest>
    ): NetworkResult<BatchLabResponse> {
        return executeApiCall {
            apiService.interpretLabBatch(BatchLabRequest(tests))
        }
    }
    
    override suspend fun calculateSofa(
        respiration: RespirationData,
        coagulation: CoagulationData,
        liver: LiverData,
        cardiovascular: CardiovascularData,
        cns: CnsData,
        renal: RenalData
    ): NetworkResult<SofaCalculatorResponse> {
        return calculateSofa(
            SofaCalculatorRequest(
                respiration = respiration,
                coagulation = coagulation,
                liver = liver,
                cardiovascular = cardiovascular,
                cns = cns,
                renal = renal
            )
        )
    }
    
    override suspend fun calculateSofa(
        request: SofaCalculatorRequest
    ): NetworkResult<SofaCalculatorResponse> {
        return executeApiCall {
            apiService.calculateSofa(request)
        }
    }
    
    override suspend fun getAvailableTools(): NetworkResult<List<ToolExecutionResponse>> {
        return executeApiCall {
            apiService.getAvailableTools()
        }
    }
    
    override suspend fun cacheToolResult(toolName: String, request: Any, result: Any) {
        // TODO: Phase 5 - Implement caching to Room database
    }
    
    override suspend fun getCachedResults(toolName: String): List<Any> {
        // TODO: Phase 5 - Retrieve from Room database
        return emptyList()
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
