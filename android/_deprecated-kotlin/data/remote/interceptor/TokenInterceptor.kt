package com.caredroid.clinical.data.remote.interceptor

import android.content.Context
import androidx.datastore.preferences.core.stringPreferencesKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import com.caredroid.clinical.di.dataStore
import javax.inject.Inject

/**
 * Interceptor to add authentication token to API requests
 */
class TokenInterceptor @Inject constructor(
    @ApplicationContext private val context: Context
) : Interceptor {
    
    companion object {
        private val AUTH_TOKEN_KEY = stringPreferencesKey("auth_token")
        private const val AUTH_HEADER = "Authorization"
        private const val BEARER_PREFIX = "Bearer "
    }
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // Get token from DataStore
        val token = runBlocking {
            context.dataStore.data.firstOrNull()?.get(AUTH_TOKEN_KEY)
        }
        
        // Add token to request if available
        val request = if (token != null) {
            originalRequest.newBuilder()
                .header(AUTH_HEADER, "$BEARER_PREFIX$token")
                .build()
        } else {
            originalRequest
        }
        
        return chain.proceed(request)
    }
}
