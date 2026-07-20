package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.data.Booking
import com.example.ui.ROUTE_DISCOVER
import com.example.ui.viewmodels.SalonViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingsListScreen(viewModel: SalonViewModel, navController: NavController) {
    val bookings by viewModel.bookings.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val language by viewModel.language.collectAsState()

    // Filtered lists
    val clientBookings = remember(bookings, currentUser) {
        if (currentUser == null) emptyList()
        else bookings.filter { it.clientId == currentUser?.id }
    }

    val providerBookings = remember(bookings, currentUser) {
        if (currentUser == null) emptyList()
        else bookings.filter { it.providerId == currentUser?.id }
    }

    // Is current role a provider?
    val isProvider = currentUser?.role == "salon" || currentUser?.role == "professional"

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (language == "en") "Activity & Appointments" else "Miadi na Huduma") }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // ROLE BADGE BANNER (helps developer see what context they are viewing)
            if (currentUser != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.primaryContainer)
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (isProvider) Icons.Filled.Work else Icons.Filled.ShoppingBag,
                            contentDescription = "Role",
                            tint = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isProvider) {
                                if (language == "en") "Viewing incoming requests as ${currentUser?.name}" else "Unajibu miadi kama ${currentUser?.name}"
                            } else {
                                if (language == "en") "Viewing your bookings as Client" else "Miadi yako kama Mteja"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }

            val listToDisplay = if (isProvider) providerBookings else clientBookings

            if (listToDisplay.isEmpty()) {
                // EMPTY STATE
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1.0f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Icon(
                            Icons.Filled.EventBusy,
                            contentDescription = "Empty",
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.outline
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = if (language == "en") "No Appointments Scheduled Yet" else "Bado Hujapanga Miadi Yoyote",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = if (isProvider) {
                                if (language == "en") "New booking requests from clients will show up here." else "Maombi mapya kutoka kwa wateja yataonyeshwa hapa."
                            } else {
                                if (language == "en") "Explore the Discover tab to find an expert and schedule a service!" else "Nenda kwenye kichupo cha 'Gundua' uweke miadi sasa!"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline,
                            lineHeight = 18.sp,
                            modifier = Modifier.padding(horizontal = 24.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )

                        if (!isProvider) {
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = { navController.navigate(ROUTE_DISCOVER) },
                                modifier = Modifier.testTag("discover_services_empty_button")
                            ) {
                                Text(if (language == "en") "Discover Services" else "Gundua Huduma")
                            }
                        }
                    }
                }
            } else {
                // BOOKINGS LIST
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1.0f),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(listToDisplay) { booking ->
                        BookingCardItem(
                            booking = booking,
                            isProvider = isProvider,
                            language = language,
                            onAccept = { viewModel.updateBookingStatus(booking.id, "ACCEPTED") },
                            onStart = { viewModel.updateBookingStatus(booking.id, "IN_SERVICE") },
                            onComplete = { viewModel.updateBookingStatus(booking.id, "COMPLETED") },
                            onCancel = { viewModel.updateBookingStatus(booking.id, "CANCELLED") }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun BookingCardItem(
    booking: Booking,
    isProvider: Boolean,
    language: String,
    onAccept: () -> Unit,
    onStart: () -> Unit,
    onComplete: () -> Unit,
    onCancel: () -> Unit
) {
    val statusColor = when (booking.status) {
        "PENDING" -> Color(0xFFE67E22)
        "ACCEPTED" -> Color(0xFF27AE60)
        "IN_SERVICE" -> Color(0xFF2980B9)
        "COMPLETED" -> Color(0xFF7F8C8D)
        else -> Color(0xFFC0392B)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .testTag("booking_card_${booking.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Top details
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (isProvider) "Client: ${booking.clientName}" else "Stylist: ${booking.providerName}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )

                // Status Badge
                Box(
                    modifier = Modifier
                        .background(color = statusColor.copy(alpha = 0.2f), shape = RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = booking.status,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Divider(color = MaterialTheme.colorScheme.surfaceVariant, thickness = 0.5.dp)
            Spacer(modifier = Modifier.height(8.dp))

            // Booking specs
            Text(
                text = booking.serviceName,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Filled.DateRange, contentDescription = "Date", tint = Color.Gray, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = booking.date, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.width(16.dp))
                Icon(Icons.Filled.Schedule, contentDescription = "Time", tint = Color.Gray, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = booking.time, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (language == "en") "Amount Payable:" else "Gharama:",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Ksh ${booking.price.toInt()}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            if (booking.notes.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Notes: ${booking.notes}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray
                )
            }

            // PROVIDER ACTIONS (only shown if viewing as provider)
            if (isProvider) {
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    when (booking.status) {
                        "PENDING" -> {
                            Button(
                                onClick = onAccept,
                                modifier = Modifier.weight(1.0f).testTag("accept_booking_${booking.id}"),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF27AE60))
                            ) {
                                Text(if (language == "en") "Accept" else "Kubali")
                            }
                            OutlinedButton(
                                onClick = onCancel,
                                modifier = Modifier.weight(1.0f).testTag("reject_booking_${booking.id}"),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFC0392B))
                            ) {
                                Text(if (language == "en") "Reject" else "Kataa")
                            }
                        }
                        "ACCEPTED" -> {
                            Button(
                                onClick = onStart,
                                modifier = Modifier.fillMaxWidth().testTag("start_service_${booking.id}"),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2980B9))
                            ) {
                                Text(if (language == "en") "Start Service" else "Anza Huduma")
                            }
                        }
                        "IN_SERVICE" -> {
                            Button(
                                onClick = onComplete,
                                modifier = Modifier.fillMaxWidth().testTag("complete_service_${booking.id}"),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Text(if (language == "en") "Mark Completed" else "Kamilisha Miadi")
                            }
                        }
                    }
                }
            }
        }
    }
}
