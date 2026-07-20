package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFD2B48C),      // Warm Bronze/Tan
    onPrimary = Color(0xFF1C120C),    // Deep dark brown
    primaryContainer = Color(0xFF4E3629),
    onPrimaryContainer = Color(0xFFFBECE2),
    secondary = Color(0xFFDEB887),    // Soft Amber/Wood
    onSecondary = Color(0xFF28180E),
    background = Color(0xFF121212),   // Obsidian Black
    onBackground = Color(0xFFEAE5E0), // Warm Off-White
    surface = Color(0xFF1E1E1E),      // Dark Slate Cards
    onSurface = Color(0xFFE2DDD9),
    surfaceVariant = Color(0xFF2C2A29),
    onSurfaceVariant = Color(0xFFCCC5C0),
    outline = Color(0xFF8F857E)
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF8C5D3A),      // Deep terracotta bronze
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFFBECE2),
    onPrimaryContainer = Color(0xFF3E1F11),
    secondary = Color(0xFF7E6652),
    onSecondary = Color(0xFFFFFFFF),
    background = Color(0xFFFAF6F2),   // Cream/Ivory light background
    onBackground = Color(0xFF1E1B18),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF1E1B18),
    surfaceVariant = Color(0xFFF1EAE4),
    onSurfaceVariant = Color(0xFF50453E),
    outline = Color(0xFF81746C)
)

@Composable
fun MobileSalonTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
