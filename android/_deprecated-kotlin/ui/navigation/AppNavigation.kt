package com.caredroid.clinical.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.caredroid.clinical.ui.screens.*
import com.caredroid.clinical.util.AppConstants

/**
 * Application Navigation Graph
 * Handles routing between all screens
 */
@Composable
fun AppNavigation(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = AppConstants.Routes.LOGIN
    ) {
        // Authentication Flow
        composable(
            route = AppConstants.Routes.LOGIN,
            deepLinks = listOf(
                navDeepLink { uriPattern = "caredroid://login" }
            )
        ) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(AppConstants.Routes.CHAT) {
                        popUpTo(AppConstants.Routes.LOGIN) { inclusive = true }
                    }
                },
                onNavigateToSignup = {
                    navController.navigate(AppConstants.Routes.SIGNUP)
                }
            )
        }
        
        composable(
            route = AppConstants.Routes.SIGNUP,
            deepLinks = listOf(
                navDeepLink { uriPattern = "caredroid://signup" }
            )
        ) {
            SignupScreen(
                onSignupSuccess = {
                    navController.navigate(AppConstants.Routes.CHAT) {
                        popUpTo(AppConstants.Routes.LOGIN) { inclusive = true }
                    }
                },
                onNavigateToLogin = {
                    navController.popBackStack()
                }
            )
        }
        
        // Main App Flow
        composable(
            route = AppConstants.Routes.CHAT,
            deepLinks = listOf(
                navDeepLink { uriPattern = "caredroid://chat" },
                navDeepLink { uriPattern = "caredroid://chat/{conversationId}" }
            ),
            arguments = listOf(
                navArgument("conversationId") {
                    type = NavType.StringType
                    nullable = true
                }
            )
        ) {
            ChatScreen(
                onNavigateToSettings = {
                    navController.navigate(AppConstants.Routes.SETTINGS)
                }
            )
        }
        
        composable(
            route = AppConstants.Routes.SETTINGS,
            deepLinks = listOf(
                navDeepLink { uriPattern = "caredroid://settings" }
            )
        ) {
            SettingsScreen()
        }
        
        composable(
            route = AppConstants.Routes.PROFILE,
            deepLinks = listOf(
                navDeepLink { uriPattern = "caredroid://profile" }
            )
        ) {
            ProfileScreen(
                onLogout = {
                    navController.navigate(AppConstants.Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        
        composable(
            route = AppConstants.Routes.TEAM,
            deepLinks = listOf(
                navDeepLink { uriPattern = "caredroid://team" }
            )
        ) {
            TeamScreen()
        }
        
        composable(
            route = AppConstants.Routes.AUDIT,
            deepLinks = listOf(
                navDeepLink { uriPattern = "caredroid://audit" }
            )
        ) {
            AuditLogsScreen()
        }
    }
}
