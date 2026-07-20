package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Schedule
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
import com.example.ui.ROUTE_BOOKINGS
import com.example.ui.viewmodels.SalonViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingFlowScreen(viewModel: SalonViewModel, navController: NavController) {
    val provider by viewModel.selectedProvider.collectAsState()
    val language by viewModel.language.collectAsState()

    val scrollState = rememberScrollState()

    if (provider == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No provider selected.")
        }
        return
    }

    val prov = provider!!

    // Dynamic services options based on specialties
    val specialties = remember(prov) {
        prov.specialties.split(",").map { it.trim() }.filter { it.isNotEmpty() }
    }
    val defaultService = if (specialties.isNotEmpty()) specialties[0] else "Premium Custom Treatment"
    val defaultPrice = 1500.0

    var selectedService by remember { mutableStateOf(defaultService) }
    var selectedPrice by remember { mutableStateOf(defaultPrice) }

    var selectedDate by remember { mutableStateOf("") }
    var selectedTime by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    var isBooked by remember { mutableStateOf(false) }

    // Mock Date/Time listings
    val dates = listOf("Mon, Jul 20", "Tue, Jul 21", "Wed, Jul 22", "Thu, Jul 23", "Fri, Jul 24")
    val times = listOf("09:00 AM", "11:30 AM", "01:30 PM", "03:00 PM", "05:30 PM")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (language == "en") "Schedule Booking" else "Weka Miadi") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        if (isBooked) {
            // SUCCESS CONFIRMATION STATE
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(MaterialTheme.colorScheme.background),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(24.dp)
                ) {
                    Icon(
                        Icons.Filled.CheckCircle,
                        contentDescription = "Success",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(80.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (language == "en") "Appointment Scheduled!" else "Miadi yako Imewekwa!",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (language == "en") {
                            "Your booking request has been sent to ${prov.name}."
                        } else {
                            "Ombi lako limetumwa kwa ${prov.name}."
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )

                    Spacer(modifier = Modifier.height(32.dp))
                    Button(
                        onClick = {
                            navController.navigate(ROUTE_BOOKINGS) {
                                popUpTo(ROUTE_BOOKINGS) { inclusive = true }
                            }
                        },
                        modifier = Modifier.fillMaxWidth().testTag("go_to_bookings_button")
                    ) {
                        Text(if (language == "en") "View Active Bookings" else "Angalia Miadi Yako")
                    }
                }
            }
        } else {
            // COMPOSITION SCHEDULING FORM
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(MaterialTheme.colorScheme.background)
                    .verticalScroll(scrollState)
                    .padding(16.dp)
            ) {
                // Header Details
                Text(
                    text = if (language == "en") "Booking with:" else "Utafanyiwa na:",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray
                )
                Text(
                    text = prov.name,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                Spacer(modifier = Modifier.height(16.dp))

                // SERVICE SELECTOR
                Text(
                    text = if (language == "en") "Select Service" else "Chagua Huduma",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))

                if (specialties.isNotEmpty()) {
                    specialties.forEachIndexed { index, spec ->
                        val price = 1000.0 + (index * 300)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clickable {
                                    selectedService = spec
                                    selectedPrice = price
                                }
                                .background(
                                    color = if (selectedService == spec) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .padding(16.dp)
                        ) {
                            RadioButton(
                                selected = selectedService == spec,
                                onClick = {
                                    selectedService = spec
                                    selectedPrice = price
                                },
                                modifier = Modifier.testTag("radio_service_${spec.replace(" ", "_")}")
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1.0f)) {
                                Text(
                                    text = spec,
                                    fontWeight = FontWeight.Bold,
                                    color = if (selectedService == spec) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                                )
                            }
                            Text(
                                text = "Ksh ${price.toInt()}",
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                } else {
                    // Default fallback
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
                            .padding(16.dp)
                    ) {
                        Text("Signature Treatment - Ksh 1,500")
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // DATE SELECTOR CHIPS
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.DateRange, contentDescription = "Date", tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (language == "en") "Select Date" else "Chagua Siku",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    dates.forEach { date ->
                        val isSelected = selectedDate == date
                        Box(
                            modifier = Modifier
                                .background(
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                    shape = RoundedCornerShape(20.dp)
                                )
                                .clickable { selectedDate = date }
                                .padding(horizontal = 16.dp, vertical = 10.dp)
                                .testTag("date_chip_$date")
                        ) {
                            Text(
                                text = date,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // TIME SELECTOR CHIPS
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Schedule, contentDescription = "Time", tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (language == "en") "Select Time" else "Chagua Saa",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    times.forEach { time ->
                        val isSelected = selectedTime == time
                        Box(
                            modifier = Modifier
                                .background(
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                    shape = RoundedCornerShape(20.dp)
                                )
                                .clickable { selectedTime = time }
                                .padding(horizontal = 16.dp, vertical = 10.dp)
                                .testTag("time_chip_$time")
                        ) {
                            Text(
                                text = time,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // FREE NOTES INPUT
                Text(
                    text = if (language == "en") "Special Notes (Optional)" else "Maelezo ya Ziada (Hiari)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    placeholder = { Text(if (language == "en") "e.g., Home visit near Prestige, or sensitive skin" else "Mf. Nataka huduma nyumbani") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .testTag("booking_notes_input"),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(32.dp))

                // SUBMIT BUTTON
                val isValid = selectedDate.isNotEmpty() && selectedTime.isNotEmpty()
                Button(
                    onClick = {
                        if (isValid) {
                            viewModel.bookAppointment(
                                serviceName = selectedService,
                                price = selectedPrice,
                                date = selectedDate,
                                time = selectedTime,
                                notes = notes
                            )
                            isBooked = true
                        }
                    },
                    enabled = isValid,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("submit_booking_button")
                ) {
                    Text(
                        text = if (language == "en") "Confirm Booking" else "Thibitisha Miadi",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(60.dp))
            }
        }
    }
}
