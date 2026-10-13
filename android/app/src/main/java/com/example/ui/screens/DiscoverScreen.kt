package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.rememberAsyncImagePainter
import com.example.data.User
import com.example.ui.ROUTE_PROVIDER_DETAIL
import com.example.ui.viewmodels.SalonViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(viewModel: SalonViewModel, navController: NavController) {
    val users by viewModel.users.collectAsState()
    val language by viewModel.language.collectAsState()

    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("ALL") } // "ALL", "SALON", "PRO"
    var verifiedOnly by remember { mutableStateOf(false) }

    // Translations
    val t = mapOf(
        "en" to mapOf(
            "discover_title" to "Discover Services",
            "search_placeholder" to "Search Salons or Professionals...",
            "all" to "All",
            "salons" to "Salons",
            "pros" to "Freelancers",
            "verified" to "Verified Only",
            "no_results" to "No listings found matching your search."
        ),
        "sw" to mapOf(
            "discover_title" to "Gundua Huduma",
            "search_placeholder" to "Tafuta Saluni au Wataalamu...",
            "all" to "Zote",
            "salons" to "Saluni",
            "pros" to "Freelancers",
            "verified" to "Waliothibitishwa Tu",
            "no_results" to "Hakuna huduma zilizopatikana."
        )
    )

    // Filtered lists
    val filteredUsers = users.filter { user ->
        val matchesSearch = user.name.contains(searchQuery, ignoreCase = true) || 
                            user.specialties.contains(searchQuery, ignoreCase = true) ||
                            user.location.contains(searchQuery, ignoreCase = true)
        val matchesType = when (selectedFilter) {
            "SALON" -> user.role == "salon"
            "PRO" -> user.role == "professional"
            else -> user.role == "salon" || user.role == "professional"
        }
        val matchesVerify = if (verifiedOnly) user.isVerified else true

        matchesSearch && matchesType && matchesVerify
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(t[language]?.get("discover_title") ?: "Discover Services") },
                actions = {
                    // Quick stats
                    Text(
                        text = "${filteredUsers.size} active",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(end = 16.dp)
                    )
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // SEARCH BAR
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text(t[language]?.get("search_placeholder") ?: "Search...") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = "Search") },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Filled.Clear, contentDescription = "Clear")
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .testTag("search_input"),
                shape = RoundedCornerShape(24.dp)
            )

            // TABS / FILTER CHIPS
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // All Chip
                FilterChip(
                    selected = selectedFilter == "ALL",
                    onClick = { selectedFilter = "ALL" },
                    label = { Text(t[language]?.get("all") ?: "All") }
                )

                // Salons Chip
                FilterChip(
                    selected = selectedFilter == "SALON",
                    onClick = { selectedFilter = "SALON" },
                    label = { Text(t[language]?.get("salons") ?: "Salons") }
                )

                // Pros Chip
                FilterChip(
                    selected = selectedFilter == "PRO",
                    onClick = { selectedFilter = "PRO" },
                    label = { Text(t[language]?.get("pros") ?: "Freelancers") }
                )

                Spacer(modifier = Modifier.weight(1.0f))

                // Verified Only Toggle
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { verifiedOnly = !verifiedOnly }
                ) {
                    Checkbox(
                        checked = verifiedOnly,
                        onCheckedChange = { verifiedOnly = it },
                        modifier = Modifier.testTag("verified_checkbox")
                    )
                    Text(
                        text = if (language == "en") "Verif" else "Thibit",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // LIST OF PROVIDERS
            if (filteredUsers.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1.0f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Filled.SearchOff,
                            contentDescription = "No listings",
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.outline
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = t[language]?.get("no_results") ?: "No results",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1.0f),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(filteredUsers) { provider ->
                        ProviderCardItem(provider = provider, onClick = {
                            viewModel.selectProvider(provider)
                            navController.navigate(ROUTE_PROVIDER_DETAIL)
                        })
                    }
                }
            }
        }
    }
}

@Composable
fun ProviderCardItem(provider: User, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clickable { onClick() }
            .testTag("provider_card_${provider.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // PROVIDER PHOTO
            Image(
                painter = rememberAsyncImagePainter(provider.avatarUrl),
                contentDescription = provider.name,
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.Gray),
                contentScale = ContentScale.Crop
            )

            Spacer(modifier = Modifier.width(16.dp))

            // INFO
            Column(modifier = Modifier.weight(1.0f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = provider.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (provider.isVerified) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            Icons.Filled.Verified,
                            contentDescription = "Verified Partner",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Text(
                    text = if (provider.role == "salon") "SALON" else "EXPERT STYLIST",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(vertical = 2.dp)
                )

                Text(
                    text = provider.location,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // Specialties tags row (shows up to 2)
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    val specList = provider.specialties.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    specList.take(2).forEach { spec ->
                        Box(
                            modifier = Modifier
                                .background(
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    shape = RoundedCornerShape(6.dp)
                                )
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = spec,
                                style = MaterialTheme.typography.bodySmall,
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    if (specList.size > 2) {
                        Text(
                            text = "+${specList.size - 2}",
                            style = MaterialTheme.typography.bodySmall,
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.outline,
                            modifier = Modifier.align(Alignment.CenterVertically)
                        )
                    }
                }
            }

            // Arrow
            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = "View Profile",
                tint = MaterialTheme.colorScheme.primary
            )
        }
    }
}
