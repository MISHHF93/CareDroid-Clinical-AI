package com.caredroid.clinical.di

import android.content.Context
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
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt Module for Network/API dependencies
 * Provides Retrofit client and API service instance
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    private fun normalizedBaseUrl(): String {
        return BuildConfig.API_BASE_URL.trimEnd('/') + "/"
    }

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
    fun provideTokenInterceptor(
        @ApplicationContext context: Context
    ): TokenInterceptor {
        return TokenInterceptor(context)
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
            .baseUrl(normalizedBaseUrl())
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
