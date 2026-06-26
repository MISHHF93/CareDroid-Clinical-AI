package com.caredroid.clinical.data.remote.dto

/**
 * Clinical Tools Data Transfer Objects
 * Used for drug interactions, lab interpretation, and SOFA calculations
 */

// ============================================
// Drug Interaction Checker DTOs
// ============================================

/**
 * Drug interaction check request
 */
data class DrugCheckRequest(
    val drugs: List<String>,
    val patientAge: Int? = null,
    val patientWeight: Float? = null
)

/**
 * Drug interaction response
 */
data class DrugInteractionResponse(
    val interactions: List<DrugInteraction>,
    val overallSeverity: String, // "low", "moderate", "high", "severe"
    val recommendations: List<String>,
    val timestamp: String
)

/**
 * Individual drug interaction
 */
data class DrugInteraction(
    val drug1: String,
    val drug2: String,
    val severity: String,
    val description: String,
    val mechanism: String? = null,
    val clinicalEffects: List<String>? = null,
    val management: String? = null
)

// ============================================
// Lab Interpreter DTOs
// ============================================

/**
 * Lab value interpretation request
 */
data class LabInterpreterRequest(
    val testName: String,
    val value: Float,
    val units: String,
    val normalRange: NormalRange? = null,
    val patientAge: Int? = null,
    val patientGender: String? = null
)

/**
 * Normal range for lab values
 */
data class NormalRange(
    val min: Float,
    val max: Float,
    val units: String
)

/**
 * Lab interpretation response
 */
data class LabInterpreterResponse(
    val testName: String,
    val value: Float,
    val units: String,
    val interpretation: String, // "normal", "high", "low", "critical"
    val severity: String,
    val explanation: String,
    val recommendations: List<String>,
    val possibleCauses: List<String>? = null,
    val urgency: String? = null,
    val timestamp: String
)

/**
 * Batch lab interpretation request
 */
data class BatchLabRequest(
    val tests: List<LabInterpreterRequest>
)

/**
 * Batch lab interpretation response
 */
data class BatchLabResponse(
    val results: List<LabInterpreterResponse>,
    val summary: String? = null,
    val overallConcern: String? = null
)

// ============================================
// SOFA Score Calculator DTOs
// ============================================

/**
 * SOFA score calculation request
 */
data class SofaCalculatorRequest(
    val respiration: RespirationData,
    val coagulation: CoagulationData,
    val liver: LiverData,
    val cardiovascular: CardiovascularData,
    val cns: CnsData,
    val renal: RenalData
)

/**
 * Respiration system data
 */
data class RespirationData(
    val pao2: Float, // mmHg
    val fio2: Float, // 0.21 - 1.0
    val mechanicalVentilation: Boolean = false
)

/**
 * Coagulation system data
 */
data class CoagulationData(
    val platelets: Float // × 10³/µL
)

/**
 * Liver system data
 */
data class LiverData(
    val bilirubin: Float // mg/dL
)

/**
 * Cardiovascular system data
 */
data class CardiovascularData(
    val map: Float, // Mean arterial pressure (mmHg)
    val dopamine: Float? = null, // µg/kg/min
    val dobutamine: Float? = null, // µg/kg/min
    val epinephrine: Float? = null, // µg/kg/min
    val norepinephrine: Float? = null // µg/kg/min
)

/**
 * Central nervous system data
 */
data class CnsData(
    val glasgowComaScore: Int // 3-15
)

/**
 * Renal system data
 */
data class RenalData(
    val creatinine: Float, // mg/dL
    val urineOutput: Float? = null // mL/day
)

/**
 * SOFA score response
 */
data class SofaCalculatorResponse(
    val totalScore: Int,
    val severity: String, // "normal", "mild", "moderate", "severe", "very_severe"
    val mortalityRisk: String,
    val breakdown: SofaBreakdown,
    val interpretation: String,
    val recommendations: List<String>,
    val timestamp: String
)

/**
 * SOFA score breakdown by system
 */
data class SofaBreakdown(
    val respiration: Int,
    val coagulation: Int,
    val liver: Int,
    val cardiovascular: Int,
    val cns: Int,
    val renal: Int,
    val details: Map<String, String>? = null
)

// ============================================
// General Tool Response
// ============================================

/**
 * Generic tool execution response
 */
data class ToolExecutionResponse(
    val toolName: String,
    val success: Boolean,
    val result: Any,
    val executionTime: Long,
    val timestamp: String
)
