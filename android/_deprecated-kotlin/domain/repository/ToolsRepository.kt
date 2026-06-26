package com.caredroid.clinical.domain.repository

import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.dto.*

/**
 * Clinical Tools Repository Interface
 * Defines contract for clinical tool operations
 */
interface ToolsRepository {
    
    // ============================================
    // Drug Interaction Checker
    // ============================================
    
    /**
     * Check drug interactions
     */
    suspend fun checkDrugInteractions(
        drugs: List<String>,
        patientAge: Int? = null,
        patientWeight: Float? = null
    ): NetworkResult<DrugInteractionResponse>
    
    // ============================================
    // Lab Interpreter
    // ============================================
    
    /**
     * Interpret single lab value
     */
    suspend fun interpretLab(
        testName: String,
        value: Float,
        units: String,
        normalRange: NormalRange? = null,
        patientAge: Int? = null,
        patientGender: String? = null
    ): NetworkResult<LabInterpreterResponse>
    
    /**
     * Interpret multiple lab values in batch
     */
    suspend fun interpretLabBatch(
        tests: List<LabInterpreterRequest>
    ): NetworkResult<BatchLabResponse>
    
    // ============================================
    // SOFA Score Calculator
    // ============================================
    
    /**
     * Calculate SOFA score
     */
    suspend fun calculateSofa(
        respiration: RespirationData,
        coagulation: CoagulationData,
        liver: LiverData,
        cardiovascular: CardiovascularData,
        cns: CnsData,
        renal: RenalData
    ): NetworkResult<SofaCalculatorResponse>
    
    /**
     * Calculate SOFA score with request object
     */
    suspend fun calculateSofa(request: SofaCalculatorRequest): NetworkResult<SofaCalculatorResponse>
    
    // ============================================
    // General Tools
    // ============================================
    
    /**
     * Get list of available clinical tools
     */
    suspend fun getAvailableTools(): NetworkResult<List<ToolExecutionResponse>>
    
    /**
     * Cache tool result locally for offline access
     */
    suspend fun cacheToolResult(toolName: String, request: Any, result: Any)
    
    /**
     * Get cached tool results
     */
    suspend fun getCachedResults(toolName: String): List<Any>
}