package com.example.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.example.ui.ROUTE_BOOKING_FLOW
import com.example.ui.viewmodels.SalonViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProviderDetailScreen(viewModel: SalonViewModel, navController: NavController) {
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

    // Dynamic services based on specialties
    val services = remember(prov) {
        val specialtiesList = prov.specialties.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        if (specialtiesList.isNotEmpty()) {
            specialtiesList.mapIndexed { idx, spec ->
                ServiceItem(
                    name = spec,
                    price = 800.0 + (idx * 300),
                    duration = if (idx % 2 == 0) "45 mins" else "1 hr 15 mins",
                    description = "Premium $spec customized to suit your unique hair texture, skin tone, or preference."
                )
            }
        } else {
            listOf(
                ServiceItem("Signature Wash & Blow Dry", 1200.0, "1 hr", "Complete hair cleansing and style shaping."),
                ServiceItem("Classic Gel Manicure", 1500.0, "45 mins", "Long-lasting premium gel color coating.")
            )
        }
    }

    // Mock Reviews
    val reviews = listOf(
        ReviewItem("Wanjiru K.", 5, "Absolutely loved the service! Best manicure I have gotten in Kilimani. Def coming back."),
        ReviewItem("Brian O.", 4, "Great attention to detail and clean environment. Prompt timing too."),
        ReviewItem("Zainab A.", 5, "Moses was very professional. He gave me exactly the braid style I was looking for!")
    )

    // Dynamic banner images
    val heroImage = if (prov.role == "salon") {
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500"
    } else {
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500"
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(prov.name) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(scrollState)
        ) {
            // HERO IMAGE BANNER
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
            ) {
                Image(
                    painter = rememberAsyncImagePainter(heroImage),
                    contentDescription = "Banner",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.3f))
                )
            }

            // PROFILE INFO HEADER
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .offset(y = (-30).dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(
                            painter = rememberAsyncImagePainter(prov.avatarUrl),
                            contentDescription = prov.name,
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(Color.Gray),
                            contentScale = ContentScale.Crop
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = prov.name,
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold
                                )
                                if (prov.isVerified) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Icon(
                                        Icons.Filled.Verified,
                                        contentDescription = "Verified Partner",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                            Text(
                                text = if (prov.role == "salon") "Saluni washirika" else "Mtaalamu binafsi",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(top = 4.dp)
                            ) {
                                Icon(Icons.Filled.LocationOn, contentDescription = "Loc", tint = Color.Gray, modifier = Modifier.size(16.dp))
                                Text(
                                    text = prov.location,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (language == "en") "About" else "Kuhusu sisi",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (prov.bio.isNotBlank()) prov.bio else "Verified expert provider delivering high-quality beauty care in Nairobi. Committed to clean hygiene standards and customized styles.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 20.sp
                    )
                }
            }

            // GALLERY ROW
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(y = (-20).dp)
                    .padding(horizontal = 16.dp)
            ) {
                Text(
                    text = if (language == "en") "Work Gallery" else "Kazi Zetu",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val galleryImages = listOf(
                        "https://images.unsplash.com/photo-1595475241988-013612d1a61a?w=150",
                        "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=150",
                        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150"
                    )
                    items(galleryImages) { url ->
                        Image(
                            painter = rememberAsyncImagePainter(url),
                            contentDescription = "Gallery",
                            modifier = Modifier
                                .size(100.dp)
                                .clip(RoundedCornerShape(8.dp)),
                            contentScale = ContentScale.Crop
                        )
                    }
                }
            }

            // MENU / SERVICES SECTION
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(y = (-10).dp)
                    .padding(16.dp)
            ) {
                Text(
                    text = if (language == "en") "Service Menu" else "Orodha ya Huduma",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(12.dp))

                services.forEach { service ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = service.name,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                                Text(
                                    text = "Ksh ${service.price.toInt()}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(vertical = 4.dp)
                            ) {
                                Icon(Icons.Filled.Schedule, contentDescription = "Time", tint = Color.Gray, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = service.duration,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                            }
                            Text(
                                text = service.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = { navController.navigate(ROUTE_BOOKING_FLOW) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("book_service_${service.name.replace(" ", "_")}"),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(if (language == "en") "Book This Service" else "Weka Miadi Hapa")
                            }
                        }
                    }
                }
            }

            // REVIEWS
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = if (language == "en") "Client Reviews" else "Maoni ya Wateja",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                reviews.forEach { review ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp)
                            .background(
                                color = MaterialTheme.colorScheme.surfaceVariant,
                                shape = RoundedCornerShape(12.dp)
                            )
                            .padding(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = review.clientName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Row {
                                repeat(review.stars) {
                                    Icon(Icons.Filled.Star, contentDescription = "*", tint = Color(0xFFF1C40F), modifier = Modifier.size(14.dp))
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = review.comment,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Spacer(modifier = Modifier.height(60.dp))
            }
        }
    }
}

data class ServiceItem(
    val name: String,
    val price: Double,
    val duration: String,
    val description: String
)

data class ReviewItem(
    val clientName: String,
    val stars: Int,
    val comment: String
)
