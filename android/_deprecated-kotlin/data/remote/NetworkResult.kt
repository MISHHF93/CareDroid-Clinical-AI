package com.caredroid.clinical.data.remote

/**
 * NetworkResult sealed class for handling API responses
 * Wraps success, error, and loading states for network calls
 */
sealed class NetworkResult<out T> {
    
    /**
     * Successful response with data
     */
    data class Success<T>(val data: T) : NetworkResult<T>()
    
    /**
     * Error response with message and optional throwable
     */
    data class Error(
        val message: String,
        val code: Int? = null,
        val throwable: Throwable? = null
    ) : NetworkResult<Nothing>()
    
    /**
     * Loading state
     */
    object Loading : NetworkResult<Nothing>()
    
    /**
     * Check if result is successful
     */
    val isSuccess: Boolean
        get() = this is Success
    
    /**
     * Check if result is error
     */
    val isError: Boolean
        get() = this is Error
    
    /**
     * Check if result is loading
     */
    val isLoading: Boolean
        get() = this is Loading
    
    /**
     * Get data if successful, null otherwise
     */
    fun getOrNull(): T? = when (this) {
        is Success -> data
        else -> null
    }
    
    /**
     * Get data if successful, throw exception otherwise
     */
    fun getOrThrow(): T = when (this) {
        is Success -> data
        is Error -> throw throwable ?: Exception(message)
        is Loading -> throw IllegalStateException("Cannot get data while loading")
    }
    
    /**
     * Execute action if successful
     */
    inline fun onSuccess(action: (T) -> Unit): NetworkResult<T> {
        if (this is Success) {
            action(data)
        }
        return this
    }
    
    /**
     * Execute action if error
     */
    inline fun onError(action: (String, Int?, Throwable?) -> Unit): NetworkResult<T> {
        if (this is Error) {
            action(message, code, throwable)
        }
        return this
    }
    
    /**
     * Execute action if loading
     */
    inline fun onLoading(action: () -> Unit): NetworkResult<T> {
        if (this is Loading) {
            action()
        }
        return this
    }
    
    /**
     * Map success data to another type
     */
    inline fun <R> map(transform: (T) -> R): NetworkResult<R> {
        return when (this) {
            is Success -> Success(transform(data))
            is Error -> Error(message, code, throwable)
            is Loading -> Loading
        }
    }
    
    /**
     * Flat map to another NetworkResult
     */
    inline fun <R> flatMap(transform: (T) -> NetworkResult<R>): NetworkResult<R> {
        return when (this) {
            is Success -> transform(data)
            is Error -> Error(message, code, throwable)
            is Loading -> Loading
        }
    }
    
    companion object {
        /**
         * Create a success result
         */
        fun <T> success(data: T): NetworkResult<T> = Success(data)
        
        /**
         * Create an error result
         */
        fun error(
            message: String,
            code: Int? = null,
            throwable: Throwable? = null
        ): NetworkResult<Nothing> = Error(message, code, throwable)
        
        /**
         * Create a loading result
         */
        fun loading(): NetworkResult<Nothing> = Loading
    }
}

/**
 * Extension function to convert Result to NetworkResult
 */
fun <T> Result<T>.toNetworkResult(): NetworkResult<T> {
    return fold(
        onSuccess = { NetworkResult.Success(it) },
        onFailure = { NetworkResult.Error(it.message ?: "Unknown error", throwable = it) }
    )
}
