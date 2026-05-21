package com.caredroid.clinical.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.caredroid.clinical.MainActivity
import com.caredroid.clinical.R
import com.caredroid.clinical.util.AppConstants
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * CareDroid Messaging Service
 * Handles Firebase Cloud Messaging push notifications
 */
@AndroidEntryPoint
class CareDroidMessagingService : FirebaseMessagingService() {

    @Inject
    lateinit var notificationManager: NotificationManager

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    /**
     * Called when a new FCM token is generated
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        
        // Send token to backend
        sendTokenToBackend(token)
    }

    /**
     * Called when a message is received
     */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        // Handle notification payload
        message.notification?.let { notification ->
            showNotification(
                title = notification.title ?: "CareDroid-Clinical-AI",
                body = notification.body ?: "",
                data = message.data
            )
        }

        // Handle data payload
        if (message.data.isNotEmpty()) {
            handleDataPayload(message.data)
        }
    }

    /**
     * Show notification to user
     */
    private fun showNotification(
        title: String,
        body: String,
        data: Map<String, String>
    ) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            
            // Add deep link data if present
            data["conversationId"]?.let { conversationId ->
                putExtra("conversationId", conversationId)
            }
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    /**
     * Handle data-only messages
     */
    private fun handleDataPayload(data: Map<String, String>) {
        val type = data["type"] ?: return

        when (type) {
            "new_message" -> {
                val conversationId = data["conversationId"]
                val message = data["message"]
                // Handle new message notification
            }
            "health_alert" -> {
                val alertMessage = data["message"]
                // Handle health alert
            }
            else -> {
                // Unknown type
            }
        }
    }

    /**
     * Send FCM token to backend
     */
    private fun sendTokenToBackend(token: String) {
        // TODO: Call API to register FCM token
        // This will be implemented when backend endpoint is ready
    }

    /**
     * Create notification channels (Android 8.0+)
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Main channel
            val mainChannel = NotificationChannel(
                CHANNEL_ID,
                AppConstants.Notifications.CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = AppConstants.Notifications.CHANNEL_DESCRIPTION
                enableVibration(true)
                enableLights(true)
            }

            // Alert channel for critical notifications
            val alertChannel = NotificationChannel(
                ALERT_CHANNEL_ID,
                "Critical Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Critical clinical alerts"
                enableVibration(true)
                enableLights(true)
            }

            notificationManager.createNotificationChannel(mainChannel)
            notificationManager.createNotificationChannel(alertChannel)
        }
    }

    companion object {
        private const val CHANNEL_ID = "caredroid_channel"
        private const val ALERT_CHANNEL_ID = "caredroid_alerts"
    }
}
