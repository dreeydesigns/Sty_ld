package com.example.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.*
import com.example.ui.screens.*
import com.example.ui.viewmodels.SalonViewModel

// Routes
const val ROUTE_HOME = "home"
const val ROUTE_DISCOVER = "discover"
const val ROUTE_BOOKINGS = "bookings"
const val ROUTE_COUNTER = "counter"
const val ROUTE_PROFILE = "profile"
const val ROUTE_PROVIDER_DETAIL = "provider_detail"
const val ROUTE_PRODUCT_DETAIL = "product_detail"
const val ROUTE_CART = "cart"
const val ROUTE_BOOKING_FLOW = "booking_flow"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen() {
    val navController = rememberNavController()
    val viewModel: SalonViewModel = viewModel()
    val language by viewModel.language.collectAsState()

    // Translation Map
    val t = mapOf(
        "en" to mapOf(
            "home" to "Home",
            "discover" to "Discover",
            "bookings" to "Bookings",
            "counter" to "Counter",
            "profile" to "Profile"
        ),
        "sw" to mapOf(
            "home" to "Nyumbani",
            "discover" to "Gundua",
            "bookings" to "Miadi",
            "counter" to "Duka",
            "profile" to "Wasifu"
        )
    )

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            // Hide bottom bar on detail pages to maintain focus
            if (currentRoute in listOf(ROUTE_HOME, ROUTE_DISCOVER, ROUTE_BOOKINGS, ROUTE_COUNTER, ROUTE_PROFILE)) {
                NavigationBar {
                    NavigationBarItem(
                        selected = currentRoute == ROUTE_HOME,
                        onClick = { navController.navigate(ROUTE_HOME) { popUpTo(ROUTE_HOME) { inclusive = false } } },
                        icon = { Icon(if (currentRoute == ROUTE_HOME) Icons.Filled.Home else Icons.Outlined.Home, contentDescription = "Home") },
                        label = { Text(t[language]?.get("home") ?: "Home") }
                    )
                    NavigationBarItem(
                        selected = currentRoute == ROUTE_DISCOVER,
                        onClick = { navController.navigate(ROUTE_DISCOVER) { popUpTo(ROUTE_HOME) } },
                        icon = { Icon(if (currentRoute == ROUTE_DISCOVER) Icons.Filled.Search else Icons.Outlined.Search, contentDescription = "Discover") },
                        label = { Text(t[language]?.get("discover") ?: "Discover") }
                    )
                    NavigationBarItem(
                        selected = currentRoute == ROUTE_BOOKINGS,
                        onClick = { navController.navigate(ROUTE_BOOKINGS) { popUpTo(ROUTE_HOME) } },
                        icon = { Icon(if (currentRoute == ROUTE_BOOKINGS) Icons.Filled.DateRange else Icons.Outlined.DateRange, contentDescription = "Bookings") },
                        label = { Text(t[language]?.get("bookings") ?: "Bookings") }
                    )
                    NavigationBarItem(
                        selected = currentRoute == ROUTE_COUNTER,
                        onClick = { navController.navigate(ROUTE_COUNTER) { popUpTo(ROUTE_HOME) } },
                        icon = { Icon(if (currentRoute == ROUTE_COUNTER) Icons.Filled.Storefront else Icons.Outlined.Storefront, contentDescription = "Counter") },
                        label = { Text(t[language]?.get("counter") ?: "Counter") }
                    )
                    NavigationBarItem(
                        selected = currentRoute == ROUTE_PROFILE,
                        onClick = { navController.navigate(ROUTE_PROFILE) { popUpTo(ROUTE_HOME) } },
                        icon = { Icon(if (currentRoute == ROUTE_PROFILE) Icons.Filled.Person else Icons.Outlined.Person, contentDescription = "Profile") },
                        label = { Text(t[language]?.get("profile") ?: "Profile") }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = ROUTE_HOME,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(ROUTE_HOME) {
                HomeScreen(viewModel, navController)
            }
            composable(ROUTE_DISCOVER) {
                DiscoverScreen(viewModel, navController)
            }
            composable(ROUTE_BOOKINGS) {
                BookingsListScreen(viewModel, navController)
            }
            composable(ROUTE_COUNTER) {
                CounterScreen(viewModel, navController)
            }
            composable(ROUTE_PROFILE) {
                ProfileDashboardScreen(viewModel, navController)
            }
            composable(ROUTE_PROVIDER_DETAIL) {
                ProviderDetailScreen(viewModel, navController)
            }
            composable(ROUTE_PRODUCT_DETAIL) {
                ProductDetailScreen(viewModel, navController)
            }
            composable(ROUTE_CART) {
                CartScreen(viewModel, navController)
            }
            composable(ROUTE_BOOKING_FLOW) {
                BookingFlowScreen(viewModel, navController)
            }
        }
    }
}
