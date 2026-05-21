package com.caredroid.clinical.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.caredroid.clinical.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for User Entity
 */
@Dao
interface UserDao {
    
    /**
     * Insert a new user or replace if exists
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)
    
    /**
     * Get current user
     */
    @Query("SELECT * FROM users LIMIT 1")
    fun getCurrentUser(): Flow<UserEntity?>
    
    /**
     * Get user by ID
     */
    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun getUserById(id: String): UserEntity?
    
    /**
     * Get user by email
     */
    @Query("SELECT * FROM users WHERE email = :email")
    suspend fun getUserByEmail(email: String): UserEntity?
    
    /**
     * Delete user
     */
    @Delete
    suspend fun deleteUser(user: UserEntity)
    
    /**
     * Delete all users
     */
    @Query("DELETE FROM users")
    suspend fun deleteAllUsers()
    
    /**
     * Update user
     */
    @Query("""
        UPDATE users 
        SET name = :name, role = :role, permissions = :permissions, lastSyncTime = :lastSyncTime
        WHERE id = :id
    """)
    suspend fun updateUser(
        id: String,
        name: String,
        role: String,
        permissions: String,
        lastSyncTime: Long
    )
    
    /**
     * Check if user exists
     */
    @Query("SELECT COUNT(*) FROM users WHERE id = :id")
    suspend fun userExists(id: String): Int
}
