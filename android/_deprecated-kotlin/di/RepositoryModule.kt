package com.caredroid.clinical.di

import com.caredroid.clinical.data.repository.*
import com.caredroid.clinical.domain.repository.*
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt Module for Repository dependencies
 * Binds repository interfaces to their implementations
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    
    /**
     * Bind AuthRepository implementation
     */
    @Binds
    @Singleton
    abstract fun bindAuthRepository(
        authRepositoryImpl: AuthRepositoryImpl
    ): AuthRepository
    
    /**
     * Bind ChatRepository implementation
     */
    @Binds
    @Singleton
    abstract fun bindChatRepository(
        chatRepositoryImpl: ChatRepositoryImpl
    ): ChatRepository
    
    /**
     * Bind ToolsRepository implementation
     */
    @Binds
    @Singleton
    abstract fun bindToolsRepository(
        toolsRepositoryImpl: ToolsRepositoryImpl
    ): ToolsRepository
    
    /**
     * Bind HealthRepository implementation
     */
    @Binds
    @Singleton
    abstract fun bindHealthRepository(
        healthRepositoryImpl: HealthRepositoryImpl
    ): HealthRepository
}
