package com.caredroid.clinical.ui

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.caredroid.clinical.ui.screens.ChatScreen
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * UI tests for Chat functionality
 */
@RunWith(AndroidJUnit4::class)
class ChatFlowTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun chatScreen_displaysCorrectly() {
        composeTestRule.setContent {
            ChatScreen(
                onNavigateToSettings = {}
            )
        }

        composeTestRule.onNodeWithText("Chat").assertIsDisplayed()
    }

    @Test
    fun chatScreen_showsEmptyState() {
        composeTestRule.setContent {
            ChatScreen(
                onNavigateToSettings = {}
            )
        }

        composeTestRule.onNodeWithText("Start a conversation").assertIsDisplayed()
    }

    @Test
    fun chatScreen_sendMessage() {
        composeTestRule.setContent {
            ChatScreen(
                onNavigateToSettings = {}
            )
        }

        // Find input field
        composeTestRule.onNodeWithTag("messageInput")
            .performTextInput("Test message")

        // Click send button
        composeTestRule.onNodeWithContentDescription("Send message")
            .performClick()
    }

    @Test
    fun chatScreen_displaysMessages() {
        composeTestRule.setContent {
            ChatScreen(
                onNavigateToSettings = {}
            )
        }

        // Message list should be present
        composeTestRule.onNodeWithTag("messageList").assertExists()
    }
}
