package com.caredroid.clinical.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.caredroid.clinical.ui.components.*

/**
 * Chat Screen
 * Main chat interface with message list and input area
 */
@Composable
fun ChatScreen(
    modifier: Modifier = Modifier,
    onSendMessage: (String) -> Unit = {},
    messages: List<ChatMessage> = emptyList(),
    isLoading: Boolean = false,
    isTyping: Boolean = false
) {
    val listState = rememberLazyListState()
    
    // Auto-scroll to bottom when new message arrives
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }
    
    Column(
        modifier = modifier.fillMaxSize()
    ) {
        // Messages List
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
        ) {
            if (messages.isEmpty() && !isLoading) {
                // Empty State
                EmptyState()
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(messages) { message ->
                        ChatMessageBubble(
                            message = message.content,
                            isUser = message.isUser,
                            timestamp = message.timestamp
                        )
                    }
                    
                    // Typing Indicator
                    if (isTyping) {
                        item {
                            TypingIndicator()
                        }
                    }
                }
            }
            
            // Loading Overlay
            if (isLoading) {
                LoadingIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    message = "Loading messages..."
                )
            }
        }
        
        // Input Area
        ChatInputArea(
            onSendMessage = onSendMessage,
            enabled = !isLoading && !isTyping
        )
    }
}

@Composable
private fun EmptyState() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Start a conversation",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Ask me anything about clinical care, medications, lab values, or protocols.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
        )
    }
}

/**
 * Chat Message Data Class
 */
data class ChatMessage(
    val id: String,
    val content: String,
    val isUser: Boolean,
    val timestamp: String? = null
)
