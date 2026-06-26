package com.caredroid.clinical.ui

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.caredroid.clinical.ui.screens.LoginScreen
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * UI tests for Login flow
 */
@RunWith(AndroidJUnit4::class)
class LoginFlowTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun loginScreen_displaysCorrectly() {
        composeTestRule.setContent {
            LoginScreen(
                onLoginSuccess = {},
                onNavigateToSignup = {}
            )
        }

        composeTestRule.onNodeWithText("Welcome Back").assertIsDisplayed()
        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
        composeTestRule.onNodeWithText("Password").assertIsDisplayed()
        composeTestRule.onNodeWithText("Login").assertIsDisplayed()
    }

    @Test
    fun loginScreen_validateEmptyFields() {
        composeTestRule.setContent {
            LoginScreen(
                onLoginSuccess = {},
                onNavigateToSignup = {}
            )
        }

        // Click login without entering data
        composeTestRule.onNodeWithText("Login").performClick()

        // Should show validation errors
        composeTestRule.onNodeWithText("Email is required").assertIsDisplayed()
    }

    @Test
    fun loginScreen_enterCredentials() {
        composeTestRule.setContent {
            LoginScreen(
                onLoginSuccess = {},
                onNavigateToSignup = {}
            )
        }

        // Enter email
        composeTestRule.onNodeWithText("Email")
            .performTextInput("test@example.com")

        // Enter password
        composeTestRule.onNodeWithText("Password")
            .performTextInput("password123")

        // Click login
        composeTestRule.onNodeWithText("Login").performClick()
    }

    @Test
    fun loginScreen_navigateToSignup() {
        var signupClicked = false
        
        composeTestRule.setContent {
            LoginScreen(
                onLoginSuccess = {},
                onNavigateToSignup = { signupClicked = true }
            )
        }

        composeTestRule.onNodeWithText("Sign up").performClick()
        assert(signupClicked)
    }
}
