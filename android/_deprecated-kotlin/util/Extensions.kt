package com.caredroid.clinical.util

import java.text.SimpleDateFormat
import java.util.*

/**
 * Extension functions for the CareDroid app
 */

/**
 * Format timestamp to readable string
 */
fun Long.formatDate(pattern: String = "HH:mm"): String {
    return try {
        val sdf = SimpleDateFormat(pattern, Locale.getDefault())
        sdf.format(this)
    } catch (e: Exception) {
        "Invalid date"
    }
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
fun Long.getRelativeTime(): String {
    val now = System.currentTimeMillis()
    val diff = now - this
    
    return when {
        diff < 60_000 -> "Just now"
        diff < 3_600_000 -> "${diff / 60_000} min ago"
        diff < 86_400_000 -> "${diff / 3_600_000} hours ago"
        diff < 604_800_000 -> "${diff / 86_400_000} days ago"
        else -> "Long ago"
    }
}

/**
 * Check if string is a valid email
 */
fun String.isValidEmail(): Boolean {
    return this.contains("@") && this.contains(".")
}

/**
 * Truncate string to max length
 */
fun String.truncate(maxLength: Int): String {
    return if (this.length > maxLength) {
        this.take(maxLength) + "..."
    } else {
        this
    }
}

/**
 * Format large numbers with units (1K, 1M, etc)
 */
fun Int.formatCompact(): String {
    return when {
        this >= 1_000_000 -> "${this / 1_000_000}M"
        this >= 1_000 -> "${this / 1_000}K"
        else -> this.toString()
    }
}
