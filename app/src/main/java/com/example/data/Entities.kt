package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class User(
    @PrimaryKey val id: String,
    val name: String,
    val phone: String,
    val role: String, // "client", "professional", "salon", "shop", "delivery", "admin"
    val isVerified: Boolean = false,
    val bio: String = "",
    val avatarUrl: String = "",
    val location: String = "Nairobi",
    val specialties: String = "" // comma-separated values
)

@Entity(tableName = "products")
data class Product(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val price: Double,
    val imageUrl: String = "",
    val sellerName: String,
    val category: String,
    val isAvailable: Boolean = true
)

@Entity(tableName = "cart_items")
data class CartItem(
    @PrimaryKey val productId: String,
    val name: String,
    val price: Double,
    val quantity: Int,
    val imageUrl: String = "",
    val sellerName: String
)

@Entity(tableName = "bookings")
data class Booking(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val clientId: String,
    val clientName: String,
    val providerId: String,
    val providerName: String,
    val providerType: String, // "Salon" or "Professional"
    val serviceName: String,
    val price: Double,
    val date: String,
    val time: String,
    val status: String, // "PENDING", "ACCEPTED", "IN_SERVICE", "COMPLETED"
    val notes: String = "",
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "social_posts")
data class SocialPost(
    @PrimaryKey val id: String,
    val authorName: String,
    val authorRole: String,
    val authorAvatar: String = "",
    val textContent: String,
    val imageUrl: String = "",
    val likesCount: Int = 0,
    val commentsCount: Int = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val isLiked: Boolean = false
)

@Entity(tableName = "stories")
data class Story(
    @PrimaryKey val id: String,
    val authorName: String,
    val avatarUrl: String = "",
    val isViewed: Boolean = false
)
