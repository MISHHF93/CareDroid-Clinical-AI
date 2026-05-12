package com.caredroid.clinical.util

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Share Manager
 * Handles sharing functionality
 */
@Singleton
class ShareManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    /**
     * Share text content
     */
    fun shareText(text: String, title: String = "Share") {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
            putExtra(Intent.EXTRA_TITLE, title)
        }
        
        val chooserIntent = Intent.createChooser(intent, title)
        chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(chooserIntent)
    }
    
    /**
     * Share conversation
     */
    fun shareConversation(conversationTitle: String, messages: String) {
        val text = buildString {
            appendLine("CareDroid-Clinical-AI conversation: $conversationTitle")
            appendLine()
            appendLine(messages)
        }
        shareText(text, "Share Conversation")
    }
    
    /**
     * Share file
     */
    fun shareFile(file: File, mimeType: String = "*/*") {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        
        val chooserIntent = Intent.createChooser(intent, "Share File")
        chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(chooserIntent)
    }
}
