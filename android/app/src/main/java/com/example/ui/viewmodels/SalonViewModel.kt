package com.example.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID

class SalonViewModel(application: Application) : AndroidViewModel(application) {

    private val database = AppDatabase.getDatabase(application)
    private val repository = SalonRepository(database)

    // Current logged-in user state
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    // UI auxiliary states
    private val _selectedProvider = MutableStateFlow<User?>(null)
    val selectedProvider: StateFlow<User?> = _selectedProvider.asStateFlow()

    private val _selectedProduct = MutableStateFlow<Product?>(null)
    val selectedProduct: StateFlow<Product?> = _selectedProduct.asStateFlow()

    private val _checkoutSuccessMessage = MutableStateFlow<String?>(null)
    val checkoutSuccessMessage: StateFlow<String?> = _checkoutSuccessMessage.asStateFlow()

    private val _language = MutableStateFlow("en") // "en" or "sw"
    val language: StateFlow<String> = _language.asStateFlow()

    // Flows from database
    val users: StateFlow<List<User>> = repository.allUsers
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val products: StateFlow<List<Product>> = repository.allProducts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val cartItems: StateFlow<List<CartItem>> = repository.cartItems
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val bookings: StateFlow<List<Booking>> = repository.allBookings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val posts: StateFlow<List<SocialPost>> = repository.allPosts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val stories: StateFlow<List<Story>> = repository.allStories
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        seedInitialData()
    }

    private fun seedInitialData() {
        viewModelScope.launch {
            // Check if seeding is required (using products as proxy)
            val currentProducts = repository.allProducts.first()
            if (currentProducts.isEmpty()) {
                // Seed Products (Counter marketplace)
                val seedProducts = listOf(
                    Product("p1", "Organic Shea Butter", "100% natural cold-pressed shea butter from western Kenya. Excellent for hair styling and deep skin moisture.", 1200.0, "https://images.unsplash.com/photo-1608248597481-496100c80836?w=200", "Shea Bliss Kenya", "Haircare"),
                    Product("p2", "Pure Tea Tree Oil", "Essential oil with potent antiseptic properties. Perfect for treating dry scalp, dandruff, and acne blemishes.", 850.0, "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=200", "Lamu Organics", "Skincare"),
                    Product("p3", "Anti-Frizz Silk Hair Serum", "Infused with argan oil. Coats hair strands to seal in moisture and eliminate frizz under hot Nairobi weather.", 1500.0, "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=200", "Amani Essentials", "Haircare"),
                    Product("p4", "Matte Velvet Lipstick (Ruby)", "Smudge-proof, long-wear matte formula that keeps lips hydrated with a stunning dark ruby hue.", 950.0, "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200", "Zara Beauty", "Cosmetics"),
                    Product("p5", "Sandalwood Beard Balm", "Soothing conditioning balm with natural beeswax and cedarwood/sandalwood scent. Helps shape and soft beard hair.", 1100.0, "https://images.unsplash.com/photo-1626480838183-b9b68c34f07a?w=200", "Lamu Organics", "Men's Grooming"),
                    Product("p6", "Mineral Clay Mask", "Deep cleansing clay mask formulated with volcanically sourced minerals from Great Rift Valley. Pulls impurities.", 1400.0, "https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=200", "Shea Bliss Kenya", "Skincare")
                )
                seedProducts.forEach { repository.insertProduct(it) }

                // Seed Providers (Salons and Professionals as Users)
                val seedUsers = listOf(
                    // Clients
                    User("u_client1", "Grace Wanjiku", "0712345678", "client", false, "Beauty enthusiast", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", "Nairobi"),
                    // Salons
                    User("u_salon1", "Amani Spa & Nail Lounge", "0722111222", "salon", true, "Premier spa and nail boutique in Kilimani offering luxury manicure, pedicure, and soothing massages.", "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100", "Kilimani, Nairobi", "Manicure, Pedicure, Massage, Facial"),
                    User("u_salon2", "Lamu Coast Barber Studio", "0733444555", "salon", true, "Authentic coastal barbing experience in Westlands. Specializing in crisp fades, dreadlocks, and premium head shaves.", "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=100", "Westlands, Nairobi", "Haircuts, Beard Trim, Dreadlocks, Hair Coloring"),
                    User("u_salon3", "Zara Hair Braiding Salon", "0711999888", "salon", false, "Specialized braided hairstyling, weaves, and natural hair treatment hub located in South B.", "https://images.unsplash.com/photo-1595475241988-013612d1a61a?w=100", "South B, Nairobi", "Braid Styles, Weaves, Sisterlocks, Hair Wash"),
                    // Professionals
                    User("u_pro1", "Moses Baraka", "0722333444", "professional", true, "Passionate freelance dreadlocks specialist and master barber with 8+ years experience.", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", "Kilimani, Nairobi", "Dreadlocks, Haircuts, Beard Trim"),
                    User("u_pro2", "Aisha Kabila", "0711222333", "professional", true, "Professional bridal makeup artist and cosmetologist. Available for home visits and studio sessions.", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100", "Karen, Nairobi", "Makeup, Bridal Styling, Lash Extensions"),
                    User("u_pro3", "Kelvin Omondi", "0799888777", "professional", false, "Creative hair color stylist and certified aesthetician. Making Nairobi colorful, one head at a time.", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", "Westlands, Nairobi", "Hair Coloring, Hair Wash, Scalp Treatment")
                )
                seedUsers.forEach { repository.insertUser(it) }

                // Seed Stories
                val seedStories = listOf(
                    Story("s1", "Amani Spa", "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100"),
                    Story("s2", "Moses B.", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"),
                    Story("s3", "Aisha Makeup", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100"),
                    Story("s4", "Lamu Barbers", "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=100")
                )
                seedStories.forEach { repository.insertStory(it) }

                // Seed Social Feed Posts
                val seedPosts = listOf(
                    SocialPost("post1", "Amani Spa & Nail Lounge", "salon", "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100", "Fresh French Manicure completed for our gorgeous client today! Book your slot for a soothing spa mani-pedi this weekend in Kilimani. 🌸💅", "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300", 24, 3, System.currentTimeMillis() - 3600000),
                    SocialPost("post2", "Moses Baraka", "professional", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", "Re-locked and styled these sisterlocks to perfection! Dreadlocks care requires consistent locking and natural oils. Open for bookings on Tuesday and Thursday.", "https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=300", 42, 8, System.currentTimeMillis() - 7200000),
                    SocialPost("post3", "Aisha Kabila", "professional", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100", "Bridal makeup glow! Soft glam style with earthy tones to highlight natural beauty. Big congratulations to our lovely bride Amina! Wedding package available. ✨💍", "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300", 56, 12, System.currentTimeMillis() - 14400000)
                )
                seedPosts.forEach { repository.insertPost(it) }

                // Seed default logged-in user (Grace Wanjiku as standard Client)
                _currentUser.value = seedUsers[0]
            } else {
                // If already seeded, set the default logged-in user
                viewModelScope.launch {
                    val usersList = repository.allUsers.first()
                    if (usersList.isNotEmpty()) {
                        _currentUser.value = usersList.firstOrNull { it.role == "client" } ?: usersList[0]
                    }
                }
            }
        }
    }

    // Role-switching helper (allows exploring all role views)
    fun switchUserRole(role: String) {
        viewModelScope.launch {
            val usersList = repository.allUsers.first()
            var matchedUser = usersList.firstOrNull { it.role == role }
            if (matchedUser == null) {
                // Create a temporary mock user for this role if it does not exist
                val mockName = when (role) {
                    "client" -> "Grace Wanjiku"
                    "professional" -> "Moses Baraka"
                    "salon" -> "Amani Spa & Nail Lounge"
                    "shop" -> "Beauty Counter Seller"
                    "delivery" -> "James Rider"
                    "admin" -> "Super Admin"
                    else -> "Guest User"
                }
                matchedUser = User("u_$role", mockName, "0700000000", role, role == "salon" || role == "professional" || role == "admin")
                repository.insertUser(matchedUser)
            }
            _currentUser.value = matchedUser
        }
    }

    fun selectProvider(provider: User?) {
        _selectedProvider.value = provider
    }

    fun selectProduct(product: Product?) {
        _selectedProduct.value = product
    }

    fun toggleLanguage() {
        _language.value = if (_language.value == "en") "sw" else "en"
    }

    // AUTH ACTIONS
    fun signInUser(name: String, phone: String, role: String) {
        viewModelScope.launch {
            val userId = "u_" + UUID.randomUUID().toString().take(6)
            val newUser = User(
                id = userId,
                name = name,
                phone = phone,
                role = role,
                isVerified = role == "admin" // admins are pre-verified
            )
            repository.insertUser(newUser)
            _currentUser.value = newUser
        }
    }

    fun signOut() {
        _currentUser.value = null
    }

    fun updateProfile(bio: String, specialties: String, location: String) {
        viewModelScope.launch {
            val user = _currentUser.value ?: return@launch
            val updatedUser = user.copy(bio = bio, specialties = specialties, location = location)
            repository.insertUser(updatedUser)
            _currentUser.value = updatedUser
        }
    }

    // BOOKING ACTIONS
    fun bookAppointment(serviceName: String, price: Double, date: String, time: String, notes: String) {
        viewModelScope.launch {
            val client = _currentUser.value ?: return@launch
            val provider = _selectedProvider.value ?: return@launch
            val newBooking = Booking(
                clientId = client.id,
                clientName = client.name,
                providerId = provider.id,
                providerName = provider.name,
                providerType = if (provider.role == "salon") "Salon" else "Professional",
                serviceName = serviceName,
                price = price,
                date = date,
                time = time,
                notes = notes,
                status = "PENDING"
            )
            repository.insertBooking(newBooking)
        }
    }

    fun updateBookingStatus(id: Int, status: String) {
        viewModelScope.launch {
            repository.updateBookingStatus(id, status)
        }
    }

    // CART & SHOP ACTIONS
    fun addToCart(product: Product) {
        viewModelScope.launch {
            val currentCart = repository.cartItems.first()
            val existing = currentCart.firstOrNull { it.productId == product.id }
            if (existing != null) {
                repository.insertCartItem(existing.copy(quantity = existing.quantity + 1))
            } else {
                repository.insertCartItem(
                    CartItem(
                        productId = product.id,
                        name = product.name,
                        price = product.price,
                        quantity = 1,
                        imageUrl = product.imageUrl,
                        sellerName = product.sellerName
                    )
                )
            }
        }
    }

    fun updateCartQuantity(productId: String, quantity: Int) {
        viewModelScope.launch {
            if (quantity <= 0) {
                repository.removeCartItem(productId)
            } else {
                val currentCart = repository.cartItems.first()
                val existing = currentCart.firstOrNull { it.productId == productId }
                if (existing != null) {
                    repository.insertCartItem(existing.copy(quantity = quantity))
                }
            }
        }
    }

    fun removeFromCart(productId: String) {
        viewModelScope.launch {
            repository.removeCartItem(productId)
        }
    }

    fun checkoutCart() {
        viewModelScope.launch {
            repository.clearCart()
            _checkoutSuccessMessage.value = "Order placed successfully! Assigned rider: James K. (ETA 25 mins)"
        }
    }

    fun clearCheckoutMessage() {
        _checkoutSuccessMessage.value = null
    }

    // PRODUCT CREATION (Sellers / Shops)
    fun addNewProduct(name: String, description: String, price: Double, category: String) {
        viewModelScope.launch {
            val seller = _currentUser.value ?: return@launch
            val newProduct = Product(
                id = "p_" + UUID.randomUUID().toString().take(6),
                name = name,
                description = description,
                price = price,
                imageUrl = "https://images.unsplash.com/photo-1608248597481-496100c80836?w=200", // default placeholder
                sellerName = seller.name,
                category = category
            )
            repository.insertProduct(newProduct)
        }
    }

    // ADMIN ACTIONS (Toggle Verification)
    fun toggleUserVerification(userId: String) {
        viewModelScope.launch {
            val user = repository.getUserById(userId) ?: return@launch
            val updated = user.copy(isVerified = !user.isVerified)
            repository.insertUser(updated)
        }
    }

    // SOCIAL ACTIONS
    fun createPost(text: String) {
        viewModelScope.launch {
            val user = _currentUser.value ?: return@launch
            val newPost = SocialPost(
                id = "post_" + UUID.randomUUID().toString().take(6),
                authorName = user.name,
                authorRole = user.role,
                authorAvatar = user.avatarUrl,
                textContent = text,
                imageUrl = "",
                likesCount = 0,
                commentsCount = 0
            )
            repository.insertPost(newPost)
        }
    }

    fun togglePostLike(postId: String) {
        viewModelScope.launch {
            val currentPosts = repository.allPosts.first()
            val post = currentPosts.firstOrNull { it.id == postId } ?: return@launch
            val isLikedNow = !post.isLiked
            val likesCountNow = if (isLikedNow) post.likesCount + 1 else post.likesCount - 1
            repository.updatePostLike(postId, isLikedNow, likesCountNow)
        }
    }
}
