package com.caredroid.clinical.util

/**
 * Application Constants
 * Centralized constants for the application
 */
object AppConstants {
    
    /**
     * Navigation Route Constants
     */
    object Routes {
        const val LOGIN = "login"
        const val SIGNUP = "signup"
        const val CHAT = "chat"
        const val SETTINGS = "settings"
        const val PROFILE = "profile"
        const val TEAM = "team"
        const val AUDIT = "audit"
    }
    
    /**
     * Deep Link Constants
     */
    object DeepLinks {
        const val SCHEME = "caredroid"
        const val HOST = "app"
        const val BASE_URL = "$SCHEME://$HOST"
    }
    
    /**
     * API Constants
     */
    object Api {
        const val BASE_URL = "https://api.caredroid.com/"
        const val TIMEOUT_SECONDS = 30L
        const val MAX_RETRIES = 3
    }
    
    /**
     * Database Constants
     */
    object Database {
        const val NAME = "caredroid_db"
        const val VERSION = 1
    }
    
    /**
     * DataStore Keys
     */
    object DataStore {
        const val PREFERENCES_NAME = "caredroid_preferences"
        const val KEY_AUTH_TOKEN = "auth_token"
        const val KEY_REFRESH_TOKEN = "refresh_token"
        const val KEY_USER_ID = "user_id"
        const val KEY_USER_EMAIL = "user_email"
        const val KEY_USER_ROLE = "user_role"
        const val KEY_THEME_MODE = "theme_mode"
        const val KEY_NOTIFICATIONS_ENABLED = "notifications_enabled"
        const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
    }
    
    /**
     * Notification Constants
     */
    object Notifications {
        const val CHANNEL_ID = "caredroid_channel"
        const val CHANNEL_NAME = "CareDroid-Clinical-AI notifications"
        const val CHANNEL_DESCRIPTION = "Notifications from CareDroid-Clinical-AI"
    }
    
    /**
     * UI Constants
     */
    object UI {
        const val MAX_MESSAGE_LENGTH = 1000
        const val ANIMATION_DURATION_MS = 300
        const val TYPING_INDICATOR_DELAY_MS = 500L
    }
    
    /**
     * Clinical Tools
     */
    object Tools {
        const val DRUG_CHECKER = "drug-checker"
        const val SOFA_CALCULATOR = "sofa-calculator"
        const val LAB_INTERPRETER = "lab-interpreter"
        const val CLINICAL_GUIDELINES = "clinical-guidelines"
    }
}
