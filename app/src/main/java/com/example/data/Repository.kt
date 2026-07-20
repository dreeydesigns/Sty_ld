package com.example.data

import kotlinx.coroutines.flow.Flow

class SalonRepository(private val db: AppDatabase) {
    val allUsers: Flow<List<User>> = db.userDao().getAllUsers()
    val allProducts: Flow<List<Product>> = db.productDao().getAllProducts()
    val cartItems: Flow<List<CartItem>> = db.cartDao().getCartItems()
    val allBookings: Flow<List<Booking>> = db.bookingDao().getAllBookings()
    val allPosts: Flow<List<SocialPost>> = db.socialDao().getAllPosts()
    val allStories: Flow<List<Story>> = db.socialDao().getAllStories()

    suspend fun getUserById(id: String): User? = db.userDao().getUserById(id)
    suspend fun insertUser(user: User) = db.userDao().insertUser(user)
    suspend fun deleteUser(user: User) = db.userDao().deleteUser(user)

    suspend fun insertProduct(product: Product) = db.productDao().insertProduct(product)
    suspend fun deleteProduct(id: String) = db.productDao().deleteProduct(id)

    suspend fun insertCartItem(item: CartItem) = db.cartDao().insertCartItem(item)
    suspend fun removeCartItem(productId: String) = db.cartDao().removeCartItem(productId)
    suspend fun clearCart() = db.cartDao().clearCart()

    fun getBookingsByClient(clientId: String): Flow<List<Booking>> = db.bookingDao().getBookingsByClient(clientId)
    fun getBookingsByProvider(providerId: String): Flow<List<Booking>> = db.bookingDao().getBookingsByProvider(providerId)
    suspend fun insertBooking(booking: Booking) = db.bookingDao().insertBooking(booking)
    suspend fun updateBookingStatus(id: Int, status: String) = db.bookingDao().updateBookingStatus(id, status)

    suspend fun insertPost(post: SocialPost) = db.socialDao().insertPost(post)
    suspend fun updatePostLike(id: String, isLiked: Boolean, likesCount: Int) = db.socialDao().updatePostLike(id, isLiked, likesCount)
    suspend fun insertStory(story: Story) = db.socialDao().insertStory(story)
}
