package com.caredroid.clinical.di

import com.caredroid.clinical.BuildConfig
import com.caredroid.clinical.data.remote.api.CareDroidApiService
import com.caredroid.clinical.data.remote.interceptor.TokenInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt Module for Network/API dependencies
 * Provides Retrofit client and API service instance
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    /**
     * Provides HttpLoggingInterceptor for request/response logging
     */
    @Singleton
    @Provides
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }
    
    /**
     * Provides TokenInterceptor for adding auth headers
     */
    @Singleton
    @Provides
    fun provideTokenInterceptor(): TokenInterceptor {
        return TokenInterceptor()
    }
    
    /**
     * Provides OkHttpClient with interceptors configured
     */
    @Singleton
    @Provides
    fun provideOkHttpClient(
        loggingInterceptor: HttpLoggingInterceptor,
        tokenInterceptor: TokenInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(tokenInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    /**
     * Provides Retrofit instance
     */
    @Singleton
    @Provides
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    /**
     * Provides CareDroidApiService
     */
    @Singleton
    @Provides
    fun provideCareDroidApiService(retrofit: Retrofit): CareDroidApiService {
        return retrofit.create(CareDroidApiService::class.java)
    }
}
