package com.caredroid.clinical.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.text.SimpleDateFormat
import java.util.*

/**
 * Audit Logs Screen
 * View system activity and audit trail
 */
@Composable
fun AuditLogsScreen(
    modifier: Modifier = Modifier
) {
    val auditLogs = remember {
        listOf(
            AuditLog("1", "User Login", "Dr. Sarah Johnson logged in", "2026-02-02T10:30:00", "info"),
            AuditLog("2", "Message Sent", "Sent message to AI assistant", "2026-02-02T10:25:00", "info"),
            AuditLog("3", "Drug Check", "Checked interaction for Warfarin + Aspirin", "2026-02-02T10:20:00", "warning"),
            AuditLog("4", "Settings Changed", "Updated notification preferences", "2026-02-02T10:15:00", "info"),
            AuditLog("5", "Failed Login", "Failed login attempt detected", "2026-02-02T10:10:00", "error")
        )
    }
    
    var selectedFilter by remember { mutableStateOf("All") }
    val filterOptions = listOf("All", "Info", "Warning", "Error")
    
    Column(modifier = modifier.fillMaxSize()) {
        // Header
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "Audit Logs",
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "System activity and security logs",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Filter Chips
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                filterOptions.forEach { filter ->
                    FilterChip(
                        selected = selectedFilter == filter,
                        onClick = { selectedFilter = filter },
                        label = { Text(filter) }
                    )
                }
            }
        }
        
        // Audit Logs List
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val filteredLogs = if (selectedFilter == "All") {
                auditLogs
            } else {
                auditLogs.filter { it.type.equals(selectedFilter, ignoreCase = true) }
            }
            
            items(filteredLogs) { log ->
                AuditLogCard(log = log)
            }
        }
    }
}

@Composable
private fun AuditLogCard(
    log: AuditLog,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Icon based on log type
            Icon(
                imageVector = when (log.type) {
                    "error" -> Icons.Default.Error
                    "warning" -> Icons.Default.Warning
                    else -> Icons.Default.Info
                },
                contentDescription = log.type,
                tint = when (log.type) {
                    "error" -> MaterialTheme.colorScheme.error
                    "warning" -> MaterialTheme.colorScheme.tertiary
                    else -> MaterialTheme.colorScheme.primary
                },
                modifier = Modifier.size(24.dp)
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            // Log Content
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = log.action,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = log.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatTimestamp(log.timestamp),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                )
            }
        }
    }
}

private data class AuditLog(
    val id: String,
    val action: String,
    val description: String,
    val timestamp: String,
    val type: String
)

private fun formatTimestamp(timestamp: String): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val formatter = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
        val date = parser.parse(timestamp)
        date?.let { formatter.format(it) } ?: timestamp
    } catch (e: Exception) {
        timestamp
    }
}
