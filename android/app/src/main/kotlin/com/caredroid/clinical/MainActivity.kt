package com.caredroid.clinical

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.caredroid.clinical.ui.navigation.AppNavigation
import com.caredroid.clinical.ui.theme.CareDroidTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * MainActivity - Main activity for CareDroid app
 * Uses Jetpack Compose for UI instead of WebView
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            CareDroidTheme {
                // Surface container
                Surface(modifier = Modifier.fillMaxSize()) {
                    // Navigation
                    val navController = rememberNavController()
                    AppNavigation(navController = navController)
                }
            }
        }
    }
}

