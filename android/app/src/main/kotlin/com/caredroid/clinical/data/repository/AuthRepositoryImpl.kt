package com.caredroid.clinical.data.repository

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.caredroid.clinical.data.remote.NetworkResult
import com.caredroid.clinical.data.remote.api.CareDroidApiService
import com.caredroid.clinical.data.remote.dto.*
import com.caredroid.clinical.domain.repository.AuthRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of AuthRepository
 * Handles authentication operations with the backend API
 */
@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val apiService: CareDroidApiService,
    @ApplicationContext private val context: Context
) : AuthRepository {

    private val _authStateFlow = MutableStateFlow(false)
    private var authToken: String? = null
    private var refreshToken: String? = null

    override suspend fun login(email: String, password: String): NetworkResult<LoginResponse> {
        return executeApiCall {
            apiService.login(LoginRequest(email, password))
        }.also { result ->
            if (result is NetworkResult.Success) {
                saveAuthToken(result.data.accessToken)
                refreshToken = result.data.refreshToken
                _authStateFlow.value = true
            }
        }
    }

    override suspend fun register(email: String, password: String, name: String): NetworkResult<SignupResponse> {
        return executeApiCall {
            apiService.register(SignupRequest(email, password, name))
        }
    }

    override suspend fun refreshToken(refreshToken: String): NetworkResult<RefreshTokenResponse> {
        return executeApiCall {
            apiService.refreshToken(RefreshTokenRequest(refreshToken))
        }.also { result ->
            if (result is NetworkResult.Success) {
                saveAuthToken(result.data.accessToken)
                this.refreshToken = result.data.refreshToken
            }
        }
    }

    override suspend fun getCurrentUser(): NetworkResult<UserDto> {
        return executeApiCall {
            apiService.getCurrentUser()
        }.map { it.user }
    }

    override suspend fun logout(): NetworkResult<Unit> {
        return executeApiCall {
            apiService.logout(authToken?.let { LogoutRequest(it) })
        }.also {
            clearAuthToken()
            _authStateFlow.value = false
        }
    }

    override suspend fun changePassword(currentPassword: String, newPassword: String): NetworkResult<Unit> {
        return executeApiCall {
            apiService.changePassword(ChangePasswordRequest(currentPassword, newPassword))
        }
    }

    override suspend fun resetPassword(email: String): NetworkResult<Unit> {
        return executeApiCall {
            apiService.resetPassword(ResetPasswordRequest(email))
        }
    }

    override suspend fun verifyTwoFactor(code: String, token: String): NetworkResult<TwoFactorResponse> {
        return executeApiCall {
            apiService.verifyTwoFactor(TwoFactorRequest(code, token))
        }.also { result ->
            if (result is NetworkResult.Success && result.data.accessToken != null) {
                saveAuthToken(result.data.accessToken)
                _authStateFlow.value = true
            }
        }
    }

    override suspend fun isAuthenticated(): Boolean {
        return authToken != null
    }

    override suspend fun getAuthToken(): String? {
        return authToken
    }

    override suspend fun saveAuthToken(token: String) {
        authToken = token
        // TODO: Phase 5 - Save to DataStore for persistence
    }

    override suspend fun clearAuthToken() {
        authToken = null
        refreshToken = null
        // TODO: Phase 5 - Clear from DataStore
    }

    override fun observeAuthState(): Flow<Boolean> {
        return _authStateFlow.asStateFlow()
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
