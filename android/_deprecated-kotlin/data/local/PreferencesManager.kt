package com.caredroid.clinical.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

// Extension property for DataStore
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "caredroid_preferences")

/**
 * PreferencesManager
 * Manages app preferences using DataStore
 */
@Singleton
class PreferencesManager @Inject constructor(
    private val context: Context
) {
    
    private val dataStore = context.dataStore
    
    // Preference Keys
    object Keys {
        val AUTH_TOKEN = stringPreferencesKey("auth_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        val USER_ID = stringPreferencesKey("user_id")
        val USER_EMAIL = stringPreferencesKey("user_email")
        val USER_ROLE = stringPreferencesKey("user_role")
        val PUSH_NOTIFICATIONS = booleanPreferencesKey("push_notifications")
        val EMAIL_NOTIFICATIONS = booleanPreferencesKey("email_notifications")
        val BIOMETRIC_ENABLED = booleanPreferencesKey("biometric_enabled")
        val TWO_FACTOR_ENABLED = booleanPreferencesKey("two_factor_enabled")
        val THEME_MODE = stringPreferencesKey("theme_mode")
    }
    
    // Auth Token
    val authToken: Flow<String?> = dataStore.data
        .catch { exception ->
            if (exception is IOException) {
                emit(emptyPreferences())
            } else {
                throw exception
            }
        }
        .map { preferences ->
            preferences[Keys.AUTH_TOKEN]
        }
    
    suspend fun saveAuthToken(token: String) {
        dataStore.edit { preferences ->
            preferences[Keys.AUTH_TOKEN] = token
        }
    }
    
    suspend fun clearAuthToken() {
        dataStore.edit { preferences ->
            preferences.remove(Keys.AUTH_TOKEN)
        }
    }
    
    // Refresh Token
    val refreshToken: Flow<String?> = dataStore.data
        .catch { exception ->
            if (exception is IOException) {
                emit(emptyPreferences())
            } else {
                throw exception
            }
        }
        .map { preferences ->
            preferences[Keys.REFRESH_TOKEN]
        }
    
    suspend fun saveRefreshToken(token: String) {
        dataStore.edit { preferences ->
            preferences[Keys.REFRESH_TOKEN] = token
        }
    }
    
    // User ID
    val userId: Flow<String?> = dataStore.data
        .map { it[Keys.USER_ID] }
    
    suspend fun saveUserId(id: String) {
        dataStore.edit { preferences ->
            preferences[Keys.USER_ID] = id
        }
    }
    
    // User Email
    val userEmail: Flow<String?> = dataStore.data
        .map { it[Keys.USER_EMAIL] }
    
    suspend fun saveUserEmail(email: String) {
        dataStore.edit { preferences ->
            preferences[Keys.USER_EMAIL] = email
        }
    }
    
    // User Role
    val userRole: Flow<String?> = dataStore.data
        .map { it[Keys.USER_ROLE] }
    
    suspend fun saveUserRole(role: String) {
        dataStore.edit { preferences ->
            preferences[Keys.USER_ROLE] = role
        }
    }
    
    // Push Notifications
    val pushNotificationsEnabled: Flow<Boolean> = dataStore.data
        .map { it[Keys.PUSH_NOTIFICATIONS] ?: true }
    
    suspend fun setPushNotifications(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[Keys.PUSH_NOTIFICATIONS] = enabled
        }
    }
    
    // Email Notifications
    val emailNotificationsEnabled: Flow<Boolean> = dataStore.data
        .map { it[Keys.EMAIL_NOTIFICATIONS] ?: true }
    
    suspend fun setEmailNotifications(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[Keys.EMAIL_NOTIFICATIONS] = enabled
        }
    }
    
    // Biometric Auth
    val biometricEnabled: Flow<Boolean> = dataStore.data
        .map { it[Keys.BIOMETRIC_ENABLED] ?: false }
    
    suspend fun setBiometric(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[Keys.BIOMETRIC_ENABLED] = enabled
        }
    }
    
    // Two-Factor Auth
    val twoFactorEnabled: Flow<Boolean> = dataStore.data
        .map { it[Keys.TWO_FACTOR_ENABLED] ?: false }
    
    suspend fun setTwoFactor(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[Keys.TWO_FACTOR_ENABLED] = enabled
        }
    }
    
    // Theme Mode
    val themeMode: Flow<String> = dataStore.data
        .map { it[Keys.THEME_MODE] ?: "SYSTEM" }
    
    suspend fun setThemeMode(mode: String) {
        dataStore.edit { preferences ->
            preferences[Keys.THEME_MODE] = mode
        }
    }
    
    // Clear all preferences
    suspend fun clearAll() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
