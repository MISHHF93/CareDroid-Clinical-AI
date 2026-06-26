package com.caredroid.clinical.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Settings Screen
 * App configuration and preferences
 */
@Composable
fun SettingsScreen(
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Text(
                text = "Settings",
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }
        
        // Notifications Section
        item {
            SettingsSection(title = "Notifications")
        }
        item {
            SwitchSettingItem(
                title = "Push Notifications",
                description = "Receive alerts and updates",
                checked = true,
                onCheckedChange = { /* TODO */ }
            )
        }
        item {
            SwitchSettingItem(
                title = "Email Notifications",
                description = "Receive email updates",
                checked = false,
                onCheckedChange = { /* TODO */ }
            )
        }
        
        // Privacy Section
        item {
            SettingsSection(title = "Privacy & Security")
        }
        item {
            SwitchSettingItem(
                title = "Biometric Authentication",
                description = "Use fingerprint or face unlock",
                checked = false,
                onCheckedChange = { /* TODO */ }
            )
        }
        item {
            ClickableSettingItem(
                icon = Icons.Default.Lock,
                title = "Change Password",
                onClick = { /* TODO */ }
            )
        }
        
        // Appearance Section
        item {
            SettingsSection(title = "Appearance")
        }
        item {
            ClickableSettingItem(
                icon = Icons.Default.Palette,
                title = "Theme",
                subtitle = "Dark",
                onClick = { /* TODO */ }
            )
        }
        
        // About Section
        item {
            SettingsSection(title = "About")
        }
        item {
            ClickableSettingItem(
                icon = Icons.Default.Info,
                title = "Version",
                subtitle = "1.0.0",
                onClick = { }
            )
        }
        item {
            ClickableSettingItem(
                icon = Icons.Default.Description,
                title = "Privacy Policy",
                onClick = { /* TODO */ }
            )
        }
        item {
            ClickableSettingItem(
                icon = Icons.Default.Article,
                title = "Terms of Service",
                onClick = { /* TODO */ }
            )
        }
    }
}

@Composable
private fun SettingsSection(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(vertical = 8.dp)
    )
}

@Composable
private fun SwitchSettingItem(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyLarge
                )
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }
            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange
            )
        }
    }
}

@Composable
private fun ClickableSettingItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyLarge
                    )
                    if (subtitle != null) {
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                }
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "Navigate",
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            )
        }
    }
}
