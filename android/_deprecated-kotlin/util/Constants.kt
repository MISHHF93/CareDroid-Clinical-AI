package com.caredroid.clinical.util

/**
 * Application Constants
 */
object AppConstants {
    
    // App Info
    const val APP_NAME = "CareDroid Clinical"
    const val APP_VERSION = "1.0.0"
    
    // API
    const val TIMEOUT_SECONDS = 30
    const val RETRY_ATTEMPTS = 3
    
    // Database
    const val DATABASE_NAME = "caredroid_clinical.db"
    
    // DataStore
    const val DATASTORE_NAME = "caredroid_preferences"
    const val AUTH_TOKEN_KEY = "auth_token"
    const val USER_ID_KEY = "user_id"
    const val USER_EMAIL_KEY = "user_email"
    
    // Chat
    const val CHAT_PAGE_SIZE = 50
    const val MESSAGE_FETCH_LIMIT = 50
    
    // Navigation Routes
    object Routes {
        const val LOGIN = "login"
        const val CHAT = "chat"
        const val SETTINGS = "settings"
        const val PROFILE = "profile"
        const val TEAM = "team"
        const val AUDIT = "audit"
        const val ONBOARDING = "onboarding"
    }
    
    // Clinical Tools
    object Tools {
        const val DRUG_CHECKER = "drug_checker"
        const val LAB_INTERPRETER = "lab_interpreter"
        const val SOFA_CALCULATOR = "sofa_calculator"
        const val PROTOCOL_BROWSER = "protocol_browser"
    }
    
    // Roles
    object Roles {
        const val ADMIN = "admin"
        const val PHYSICIAN = "physician"
        const val NURSE = "nurse"
        const val RESIDENT = "resident"
        const val STUDENT = "student"
    }
    
    // Permissions
    object Permissions {
        const val READ_CHAT = "read:chat"
        const val WRITE_CHAT = "write:chat"
        const val READ_TOOLS = "read:tools"
        const val MANAGE_USERS = "manage:users"
        const val VIEW_AUDIT_LOG = "view:audit"
    }
}
