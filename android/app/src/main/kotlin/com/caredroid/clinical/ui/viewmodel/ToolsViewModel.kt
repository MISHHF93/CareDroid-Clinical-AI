package com.caredroid.clinical.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.dto.DrugInteractionRequest
import com.caredroid.clinical.data.remote.dto.LabInterpretationRequest
import com.caredroid.clinical.data.remote.dto.SofaScoreRequest
import com.caredroid.clinical.domain.repository.ToolsRepository
import com.caredroid.clinical.ui.state.ToolsUiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ToolsViewModel
 * Manages clinical tools (Drug Checker, Lab Interpreter, SOFA Calculator)
 */
@HiltViewModel
class ToolsViewModel @Inject constructor(
    private val toolsRepository: ToolsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ToolsUiState())
    val uiState: StateFlow<ToolsUiState> = _uiState.asStateFlow()

    /**
     * Check drug interactions
     */
    fun checkDrugInteractions(drugs: List<String>) {
        if (drugs.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = toolsRepository.checkDrugInteractions(
                DrugInteractionRequest(drugs)
            )

            when (result) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            drugInteractions = result.data,
                            isLoading = false,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Interpret lab results
     */
    fun interpretLab(testName: String, value: Double, unit: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = toolsRepository.interpretLab(
                LabInterpretationRequest(testName, value, unit)
            )

            when (result) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            labResult = result.data,
                            isLoading = false,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Calculate SOFA score
     */
    fun calculateSofa(
        pao2: Double,
        fio2: Double,
        platelets: Double,
        bilirubin: Double,
        map: Double,
        gcs: Int,
        creatinine: Double,
        urine: Double
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = toolsRepository.calculateSofa(
                SofaScoreRequest(
                    pao2 = pao2,
                    fio2 = fio2,
                    platelets = platelets,
                    bilirubin = bilirubin,
                    meanArterialPressure = map,
                    glasgowComaScore = gcs,
                    creatinine = creatinine,
                    urineOutput = urine
                )
            )

            when (result) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            sofaScore = result.data,
                            isLoading = false,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Clear results
     */
    fun clearResults() {
        _uiState.update {
            it.copy(
                drugInteractions = null,
                labResult = null,
                sofaScore = null
            )
        }
    }

    /**
     * Clear error message
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
