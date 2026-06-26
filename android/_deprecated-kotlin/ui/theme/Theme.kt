package com.caredroid.clinical.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import com.google.accompanist.systemuicontroller.rememberSystemUiController

/**
 * CareDroid Dark Color Scheme (Material3)
 */
private val DarkColorScheme = darkColorScheme(
    primary = Blue500,
    onPrimary = Navy900,
    primaryContainer = Blue900,
    onPrimaryContainer = Navy50,
    
    secondary = Cyan400,
    onSecondary = Navy900,
    secondaryContainer = Cyan500,
    onSecondaryContainer = Navy50,
    
    tertiary = Navy400,
    onTertiary = Navy900,
    tertiaryContainer = Navy600,
    onTertiaryContainer = Navy50,
    
    error = Error,
    onError = Navy900,
    errorContainer = Error,
    onErrorContainer = Navy50,
    
    background = Navy900,
    onBackground = Navy50,
    
    surface = Navy800,
    onSurface = Navy50,
    surfaceVariant = Navy700,
    onSurfaceVariant = Navy200,
    
    outline = Navy400,
    outlineVariant = Navy600,
    
    scrim = Navy900
)

/**
 * CareDroid Light Color Scheme (Material3)
 * Currently using dark theme as primary, but light is available
 */
private val LightColorScheme = lightColorScheme(
    primary = Blue600,
    onPrimary = Navy50,
    primaryContainer = Blue500,
    onPrimaryContainer = Navy900,
    
    secondary = Cyan500,
    onSecondary = Navy50,
    secondaryContainer = Cyan400,
    onSecondaryContainer = Navy900,
    
    tertiary = Navy500,
    onTertiary = Navy50,
    tertiaryContainer = Navy400,
    onTertiaryContainer = Navy900,
    
    error = Error,
    onError = Navy50,
    errorContainer = Error,
    onErrorContainer = Navy900,
    
    background = Navy50,
    onBackground = Navy900,
    
    surface = Navy100,
    onSurface = Navy900,
    surfaceVariant = Navy200,
    onSurfaceVariant = Navy600,
    
    outline = Navy400,
    outlineVariant = Navy300,
    
    scrim = Navy900
)

/**
 * CareDroid Theme
 * Provides consistent Material3 design system across the app
 * 
 * Features:
 * - Dark theme by default (medical app ergonomics)
 * - Responsive to system theme setting
 * - System UI controller for immersive experience
 * - Custom color palette based on CareDroid branding
 */
@Composable
fun CareDroidTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
            
            // Update system UI controller for proper icon colors
            val systemUiController = rememberSystemUiController()
            systemUiController.setSystemBarsColor(
                color = colorScheme.background,
                darkIcons = !darkTheme
            )
        }
    }
    
    MaterialTheme(
        colorScheme = colorScheme,
        typography = CareDroidTypography,
        content = content
    )
}
