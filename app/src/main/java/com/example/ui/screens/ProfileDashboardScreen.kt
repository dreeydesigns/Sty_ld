package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.example.ui.viewmodels.SalonViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileDashboardScreen(viewModel: SalonViewModel, navController: NavController) {
    val currentUser by viewModel.currentUser.collectAsState()
    val users by viewModel.users.collectAsState()
    val language by viewModel.language.collectAsState()

    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (language == "en") "User Workspace" else "Eneo la Kazi") }
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
            if (currentUser == null) {
                // SIGN IN FORM
                SignInView(onSignIn = { name, phone, role ->
                    viewModel.signInUser(name, phone, role)
                }, language = language)
            } else {
                val user = currentUser!!
                
                // PROFILE BANNER INFO
                ProfileHeaderSection(user = user, onSignOut = { viewModel.signOut() }, language = language)

                Spacer(modifier = Modifier.height(16.dp))

                // ROLE SWITCHER CHIPS (extremely helpful to let the tester inspect all workflows!)
                Text(
                    text = if (language == "en") "Developer Role Switcher" else "Badili Eneo la Kazi (Majaribio)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp),
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("client", "professional", "salon", "shop", "admin").forEach { r ->
                        val isSelected = user.role == r
                        ElevatedFilterChip(
                            selected = isSelected,
                            onClick = { viewModel.switchUserRole(r) },
                            label = { Text(r.uppercase()) },
                            modifier = Modifier.testTag("role_switch_chip_$r")
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
                Divider(color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.padding(horizontal = 16.dp))
                Spacer(modifier = Modifier.height(16.dp))

                // CONDITIONAL DASHBOARD ACCORDING TO CURRENT LOGGED-IN ROLE
                when (user.role) {
                    "client" -> ClientDashboardSection(user = user, viewModel = viewModel, language = language)
                    "professional", "salon" -> ProviderDashboardSection(user = user, viewModel = viewModel, language = language)
                    "shop" -> SellerDashboardSection(viewModel = viewModel, language = language)
                    "admin" -> AdminDashboardSection(users = users, viewModel = viewModel, language = language)
                }
                
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}

@Composable
fun SignInView(onSignIn: (String, String, String) -> Unit, language: String) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("client") }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Filled.AccountCircle,
            contentDescription = "User",
            modifier = Modifier.size(72.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = if (language == "en") "Welcome to Mobile Salon" else "Karibu Mobile Salon",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = if (language == "en") "Enter your phone to sign in" else "Weka namba ya simu kuingia",
            style = MaterialTheme.typography.bodySmall,
            color = Color.Gray
        )

        Spacer(modifier = Modifier.height(24.dp))

        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text(if (language == "en") "Full Name" else "Majina Kamili") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("signin_name_input"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text(if (language == "en") "Phone Number" else "Nambari ya Simu") },
            placeholder = { Text("e.g. 0712345678") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("signin_phone_input"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Role select
        Text(
            text = if (language == "en") "Select Your Workspace Role" else "Chagua Eneo Lako la Kazi",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.Start)
        )
        Spacer(modifier = Modifier.height(8.dp))

        val roles = listOf("client" to "Client", "professional" to "Stylist", "salon" to "Salon", "shop" to "Seller")
        roles.forEach { (roleId, label) ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { role = roleId }
                    .padding(vertical = 4.dp)
            ) {
                RadioButton(
                    selected = role == roleId,
                    onClick = { role = roleId },
                    modifier = Modifier.testTag("signin_role_$roleId")
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = label)
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = {
                if (name.isNotBlank() && phone.isNotBlank()) {
                    onSignIn(name, phone, role)
                }
            },
            enabled = name.isNotBlank() && phone.isNotBlank(),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
                .testTag("signin_submit_button"),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(if (language == "en") "Verify & Sign In" else "Thibitisha na Kuingia")
        }
    }
}

@Composable
fun ProfileHeaderSection(user: User, onSignOut: () -> Unit, language: String) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                painter = rememberAsyncImagePainter(user.avatarUrl),
                contentDescription = user.name,
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(Color.Gray),
                contentScale = ContentScale.Crop
            )

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1.0f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = user.name, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    if (user.isVerified) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Filled.Verified, contentDescription = "Verified", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    }
                }
                Text(text = user.phone, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                Text(
                    text = "Role: ${user.role.uppercase()}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
            }

            IconButton(onClick = onSignOut, modifier = Modifier.testTag("signout_button")) {
                Icon(Icons.Filled.ExitToApp, contentDescription = "Sign Out", tint = Color.Gray)
            }
        }
    }
}

@Composable
fun ClientDashboardSection(user: User, viewModel: SalonViewModel, language: String) {
    var bio by remember(user) { mutableStateOf(user.bio) }
    var location by remember(user) { mutableStateOf(user.location) }

    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = if (language == "en") "Edit Personal Settings" else "Hariri Maelezo Yako",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = location,
            onValueChange = { location = it },
            label = { Text(if (language == "en") "Your Area (e.g. Kilimani)" else "Eneo Lako") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("client_location_input"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = bio,
            onValueChange = { bio = it },
            label = { Text(if (language == "en") "Bio Description" else "Maelezo ya Wasifu") },
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .testTag("client_bio_input"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = { viewModel.updateProfile(bio = bio, specialties = user.specialties, location = location) },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("client_save_profile_button"),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text(if (language == "en") "Save Settings" else "Hifadhi Mabadiliko")
        }
    }
}

@Composable
fun ProviderDashboardSection(user: User, viewModel: SalonViewModel, language: String) {
    var specialties by remember(user) { mutableStateOf(user.specialties) }
    var bio by remember(user) { mutableStateOf(user.bio) }
    var location by remember(user) { mutableStateOf(user.location) }

    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = if (language == "en") "Partner Styling Controls" else "Eneo la Mtaalamu",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = specialties,
            onValueChange = { specialties = it },
            label = { Text(if (language == "en") "Specialties (comma separated)" else "Utaalamu wako (Tenganisha na koma)") },
            placeholder = { Text("e.g. Manicure, Dreadlocks, Braiding") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("provider_specialties_input"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = location,
            onValueChange = { location = it },
            label = { Text(if (language == "en") "Service Location area" else "Eneo la Huduma") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("provider_location_input"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = bio,
            onValueChange = { bio = it },
            label = { Text(if (language == "en") "About / Bio" else "Maelezo Kuhusu Wewe") },
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .testTag("provider_bio_input"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = { viewModel.updateProfile(bio = bio, specialties = specialties, location = location) },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("provider_save_profile_button"),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text(if (language == "en") "Save Provider Details" else "Hifadhi Maelezo ya Huduma")
        }
    }
}

@Composable
fun SellerDashboardSection(viewModel: SalonViewModel, language: String) {
    var prodName by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var priceText by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Haircare") }

    val categories = listOf("Haircare", "Skincare", "Cosmetics", "Men's Grooming")

    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = if (language == "en") "List New Product to Counter" else "Ongeza Bidhaa Mpya",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = prodName,
            onValueChange = { prodName = it },
            label = { Text(if (language == "en") "Product Name" else "Jina la Bidhaa") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("seller_product_name_input"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = priceText,
            onValueChange = { priceText = it },
            label = { Text(if (language == "en") "Price (Ksh)" else "Bei (Ksh)") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("seller_product_price_input"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Category dropdown placeholder (simplifying using chips)
        Text(text = "Category", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp)
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            categories.forEach { cat ->
                val isSel = category == cat
                Box(
                    modifier = Modifier
                        .background(
                            color = if (isSel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(12.dp)
                        )
                        .clickable { category = cat }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        .testTag("seller_category_$cat")
                ) {
                    Text(
                        text = cat,
                        color = if (isSel) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text(if (language == "en") "Description" else "Maelezo ya Bidhaa") },
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .testTag("seller_product_desc_input"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(20.dp))

        val isValid = prodName.isNotBlank() && description.isNotBlank() && priceText.toDoubleOrNull() != null
        Button(
            onClick = {
                if (isValid) {
                    viewModel.addNewProduct(
                        name = prodName,
                        description = description,
                        price = priceText.toDouble(),
                        category = category
                    )
                    prodName = ""
                    description = ""
                    priceText = ""
                }
            },
            enabled = isValid,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("seller_submit_product_button"),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text(if (language == "en") "Publish Listing" else "Tangaza Bidhaa")
        }
    }
}

@Composable
fun AdminDashboardSection(users: List<User>, viewModel: SalonViewModel, language: String) {
    val providers = remember(users) {
        users.filter { it.role == "salon" || it.role == "professional" }
    }

    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = if (language == "en") "Super Admin Directory" else "Eneo la Msimamizi Mkuu",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = if (language == "en") "Toggle verification status for partner salons and providers instantly." else "Thibitisha na kudhibiti saluni na wataalamu.",
            style = MaterialTheme.typography.bodySmall,
            color = Color.Gray
        )
        Spacer(modifier = Modifier.height(16.dp))

        providers.forEach { provider ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = provider.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            if (provider.isVerified) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(Icons.Filled.Verified, contentDescription = "Verified", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                            }
                        }
                        Text(text = provider.role.uppercase(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }

                    Button(
                        onClick = { viewModel.toggleUserVerification(provider.id) },
                        modifier = Modifier.testTag("verify_toggle_button_${provider.id}"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (provider.isVerified) Color(0xFFC0392B) else Color(0xFF27AE60)
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = if (provider.isVerified) {
                                if (language == "en") "Unverify" else "Ondoa"
                            } else {
                                if (language == "en") "Verify" else "Thibitisha"
                            },
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}
