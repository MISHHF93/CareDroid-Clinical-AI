package com.caredroid.clinical.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.caredroid.clinical.util.VoiceResult

/**
 * Voice Input Button
 * Shows voice recording UI
 */
@Composable
fun VoiceInputButton(
    onVoiceResult: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var isListening by remember { mutableStateOf(false) }
    var voiceState by remember { mutableStateOf<VoiceResult>(VoiceResult.Ready) }
    
    IconButton(
        onClick = {
            isListening = !isListening
            // TODO: Start/stop voice input
        },
        modifier = modifier
    ) {
        Icon(
            imageVector = Icons.Default.Mic,
            contentDescription = "Voice input",
            tint = if (isListening) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurface
            }
        )
    }
}

/**
 * Voice Recording Dialog
 * Shows live voice recording status
 */
@Composable
fun VoiceRecordingDialog(
    voiceState: VoiceResult,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Voice Input")
        },
        text = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                when (voiceState) {
                    is VoiceResult.Ready -> {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Ready to listen...")
                    }
                    is VoiceResult.Speaking -> {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Listening...")
                    }
                    is VoiceResult.Processing -> {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Processing...")
                    }
                    is VoiceResult.Partial -> {
                        Text(voiceState.text)
                    }
                    is VoiceResult.Success -> {
                        Text(voiceState.text)
                    }
                    is VoiceResult.Error -> {
                        Text(
                            voiceState.message,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
