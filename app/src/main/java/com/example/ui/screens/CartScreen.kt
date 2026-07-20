package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.example.data.CartItem
import com.example.ui.ROUTE_COUNTER
import com.example.ui.viewmodels.SalonViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(viewModel: SalonViewModel, navController: NavController) {
    val cartItems by viewModel.cartItems.collectAsState()
    val checkoutSuccessMessage by viewModel.checkoutSuccessMessage.collectAsState()
    val language by viewModel.language.collectAsState()

    var isDelivery by remember { mutableStateOf(true) }
    var selectedRider by remember { mutableStateOf("James K.") }

    val riders = listOf(
        RiderOption("James K.", 150.0, "20-25 mins", "Friendly veteran rider covering Kilimani & Westlands."),
        RiderOption("Brian M.", 200.0, "15-20 mins", "Express delivery partner covering South B & Karen."),
        RiderOption("Felix O.", 180.0, "25-30 mins", "Dedicated carrier covering CBD and nearby areas.")
    )

    val selectedRiderObj = riders.first { it.name == selectedRider }

    val subtotal = cartItems.sumOf { it.price * it.quantity }
    val deliveryFee = if (isDelivery) selectedRiderObj.fee else 0.0
    val grandTotal = subtotal + deliveryFee

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (language == "en") "Shopping Cart" else "Kikapu chako") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        if (checkoutSuccessMessage != null) {
            // SUCCESS CHECKOUT PANEL
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
                        Icons.Filled.VerifiedUser,
                        contentDescription = "Success",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(80.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (language == "en") "Payment Held in Escrow!" else "Malipo Yamelindwa!",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Funds will be held safely in the Mobile Salon Escrow and only released to the vendor/rider once you successfully verify receipt of your beauty products.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(text = "Rider: ${selectedRiderObj.name}", fontWeight = FontWeight.Bold)
                            Text(text = "ETA: ${selectedRiderObj.eta}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                            Text(text = "Delivery Fee: Ksh ${selectedRiderObj.fee.toInt()}", style = MaterialTheme.typography.bodySmall)
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))
                    Button(
                        onClick = {
                            viewModel.clearCheckoutMessage()
                            navController.navigate(ROUTE_COUNTER) {
                                popUpTo(ROUTE_COUNTER) { inclusive = true }
                            }
                        },
                        modifier = Modifier.fillMaxWidth().testTag("continue_shopping_button")
                    ) {
                        Text(if (language == "en") "Continue Shopping" else "Endelea Kununua")
                    }
                }
            }
        } else if (cartItems.isEmpty()) {
            // EMPTY STATE
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(MaterialTheme.colorScheme.background),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Filled.RemoveShoppingCart,
                        contentDescription = "Empty",
                        modifier = Modifier.size(80.dp),
                        tint = MaterialTheme.colorScheme.outline
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (language == "en") "Your Cart is Empty" else "Kikapu Chako Hakina Kitu",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (language == "en") "Head over to the Counter to shop amazing beauty goods." else "Nenda dukani uweke bidhaa za urembo.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.outline
                    )

                    Spacer(modifier = Modifier.height(24.dp))
                    Button(onClick = { navController.popBackStack() }) {
                        Text(if (language == "en") "Go Shop" else "Nenda Kakununue")
                    }
                }
            }
        } else {
            // SCROLLABLE CART AND BILLING DETAIL
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(MaterialTheme.colorScheme.background),
                contentPadding = PaddingValues(16.dp)
            ) {
                // Cart Items
                items(cartItems) { item ->
                    CartItemRow(
                        item = item,
                        onIncrease = { viewModel.updateCartQuantity(item.productId, item.quantity + 1) },
                        onDecrease = { viewModel.updateCartQuantity(item.productId, item.quantity - 1) },
                        onRemove = { viewModel.removeFromCart(item.productId) }
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Divider(color = MaterialTheme.colorScheme.surfaceVariant)
                    Spacer(modifier = Modifier.height(16.dp))

                    // DELIVERY MODE TOGGLE
                    Text(
                        text = if (language == "en") "Fulfillment Mode" else "Njia ya Kupokea",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Delivery Button
                        OutlinedButton(
                            onClick = { isDelivery = true },
                            modifier = Modifier.weight(1.0f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = if (isDelivery) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                                contentColor = if (isDelivery) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                            )
                        ) {
                            Icon(Icons.Filled.DirectionsMotorcycle, contentDescription = "Delivery")
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(if (language == "en") "Rider Moto" else "Bodaboda")
                        }

                        // Pickup Button
                        OutlinedButton(
                            onClick = { isDelivery = false },
                            modifier = Modifier.weight(1.0f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = if (!isDelivery) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                                contentColor = if (!isDelivery) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                            )
                        ) {
                            Icon(Icons.Filled.Store, contentDescription = "Store")
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(if (language == "en") "Store Pickup" else "Chukua Dukani")
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))
                }

                // CHOOSE RIDER SECTION
                if (isDelivery) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.PersonPin, contentDescription = "Rider", tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (language == "en") "Select On-Demand Rider" else "Chagua Dereva",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))

                        riders.forEach { rider ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .clickable { selectedRider = rider.name }
                                    .background(
                                        color = if (selectedRider == rider.name) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent,
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                    .padding(12.dp)
                            ) {
                                RadioButton(
                                    selected = selectedRider == rider.name,
                                    onClick = { selectedRider = rider.name },
                                    modifier = Modifier.testTag("rider_radio_${rider.name.replace(" ", "_")}")
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Column(modifier = Modifier.weight(1.0f)) {
                                    Text(text = rider.name, fontWeight = FontWeight.Bold)
                                    Text(text = rider.description, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                    Text(
                                        text = "ETA: ${rider.eta}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Text(
                                    text = "Ksh ${rider.fee.toInt()}",
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(20.dp))
                    }
                }

                // PAYMENT SUMMARY RECEIPT
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = if (language == "en") "Billing Receipt" else "Maelezo ya Gharama",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(if (language == "en") "Subtotal" else "Jumla ya Bidhaa", color = Color.Gray)
                                Text("Ksh ${subtotal.toInt()}", fontWeight = FontWeight.Bold)
                            }
                            if (isDelivery) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(if (language == "en") "Delivery Fee (${selectedRiderObj.name})" else "Uwasilishaji (${selectedRiderObj.name})", color = Color.Gray)
                                    Text("Ksh ${deliveryFee.toInt()}", fontWeight = FontWeight.Bold)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))
                            Divider(color = MaterialTheme.colorScheme.surfaceVariant)
                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (language == "en") "Grand Total" else "Jumla Kuu",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                                Text(
                                    text = "Ksh ${grandTotal.toInt()}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 18.sp,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Security, contentDescription = "Sec", tint = Color(0xFF27AE60), modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Payment protected by escrow hold.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF27AE60)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // PAY BUTTON
                    Button(
                        onClick = { viewModel.checkoutCart() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("checkout_submit_button"),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = if (language == "en") "Secure checkout with M-Pesa" else "Lipia Salama na M-Pesa",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(60.dp))
                }
            }
        }
    }
}

@Composable
fun CartItemRow(
    item: CartItem,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .testTag("cart_item_${item.productId}"),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                painter = rememberAsyncImagePainter(item.imageUrl),
                contentDescription = item.name,
                modifier = Modifier
                    .size(60.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.Gray),
                contentScale = ContentScale.Crop
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1.0f)) {
                Text(text = item.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(text = "Ksh ${item.price.toInt()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)

                Spacer(modifier = Modifier.height(6.dp))

                // Quantity adjusting tools
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onDecrease, modifier = Modifier.size(28.dp).testTag("decrease_qty_${item.productId}")) {
                        Icon(Icons.Filled.Remove, contentDescription = "Dec", modifier = Modifier.size(16.dp))
                    }
                    Text(
                        text = item.quantity.toString(),
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 12.dp)
                    )
                    IconButton(onClick = onIncrease, modifier = Modifier.size(28.dp).testTag("increase_qty_${item.productId}")) {
                        Icon(Icons.Filled.Add, contentDescription = "Inc", modifier = Modifier.size(16.dp))
                    }
                }
            }

            IconButton(onClick = onRemove, modifier = Modifier.testTag("remove_item_${item.productId}")) {
                Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = Color(0xFFC0392B))
            }
        }
    }
}

data class RiderOption(
    val name: String,
    val fee: Double,
    val eta: String,
    val description: String
)
