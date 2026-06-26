"""
NLU FastAPI Service
Clinical intent classification microservice with REST API
"""

import logging
import os
import time
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from config import SERVICE_CONFIG, LOGGING_CONFIG, INTENT_CLASSES
from model import NLUModel

# Setup logging
logging.basicConfig(**LOGGING_CONFIG)
logger = logging.getLogger(__name__)

# Global model instance
nlu_model: Optional[NLUModel] = None


# ============================================================================
# Models (Request/Response)
# ============================================================================

class PredictRequest(BaseModel):
    """Single prediction request"""
    text: str = Field(..., min_length=1, max_length=2048)
    include_embeddings: bool = False


class PredictResponse(BaseModel):
    """Single prediction response"""
    intent: str
    confidence: float
    label_id: int
    subcategory: Optional[str] = None
    key_terms: List[str]
    latency_ms: float


class BatchPredictRequest(BaseModel):
    """Batch prediction request"""
    texts: List[str] = Field(..., min_items=1, max_items=100)


class BatchPredictResponse(BaseModel):
    """Batch prediction response"""
    results: List[dict]
    processing_time_ms: float
    batch_size: int


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    model_name: str
    intent_classes: List[str]
    uptime_seconds: int


# ============================================================================
# Lifecycle Management
# ============================================================================

startup_time: float = 0


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events"""
    global startup_time, nlu_model
    
    startup_time = time.time()
    logger.info("NLU Service starting...")
    
    # Initialize model on startup
    try:
        nlu_model = NLUModel()
        logger.info("NLU model initialized (lazy loading enabled)")
    except Exception as e:
        logger.error(f"Failed to initialize model: {str(e)}")
        raise
    
    yield
    
    # Cleanup on shutdown
    if nlu_model:
        nlu_model.unload()
        logger.info("NLU Service shutdown complete")


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="CareDroid NLU Service",
    description="Clinical intent classification with fine-tuned BERT",
    version="1.0.0",
    lifespan=lifespan,
)


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Health check endpoint
    
    Returns:
        HealthCheckResponse with service status
    """
    try:
        uptime = int(time.time() - startup_time)
        model_info = nlu_model.get_model_info()
        
        return HealthCheckResponse(
            status="healthy",
            model_loaded=model_info.get("status") == "loaded",
            model_name=model_info.get("model_name", "unknown"),
            intent_classes=INTENT_CLASSES,
            uptime_seconds=uptime,
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Health check failed",
        )


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    Predict intent for a single text
    
    Args:
        request: PredictRequest with clinical text
        
    Returns:
        PredictResponse with predicted intent and confidence
        
    Raises:
        HTTPException: If prediction fails
    """
    try:
        # Ensure model is loaded
        if not nlu_model.loaded:
            nlu_model.load()
        
        # Get prediction
        result = nlu_model.predict(request.text)
        
        return PredictResponse(
            intent=result["intent"],
            confidence=result["confidence"],
            label_id=result["label_id"],
            subcategory=result.get("subcategory"),
            key_terms=result.get("key_terms", []),
            latency_ms=result["latency_ms"],
        )
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )


@app.post("/batch-predict", response_model=BatchPredictResponse)
async def batch_predict(request: BatchPredictRequest):
    """
    Batch predict intents for multiple texts
    
    Args:
        request: BatchPredictRequest with list of texts
        
    Returns:
        BatchPredictResponse with predictions for all texts
        
    Raises:
        HTTPException: If batch prediction fails
    """
    try:
        if len(request.texts) == 0:
            raise ValueError("Empty text list")
        
        # Ensure model is loaded
        if not nlu_model.loaded:
            nlu_model.load()
        
        # Get batch prediction
        start_time = time.time()
        results = nlu_model.predict_batch(request.texts)
        elapsed = (time.time() - start_time) * 1000
        
        return BatchPredictResponse(
            results=results,
            processing_time_ms=round(elapsed, 2),
            batch_size=len(request.texts),
        )
    except Exception as e:
        logger.error(f"Batch prediction failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction failed: {str(e)}",
        )


@app.get("/model-info")
async def model_info():
    """Get detailed model information"""
    try:
        return nlu_model.get_model_info()
    except Exception as e:
        logger.error(f"Failed to get model info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve model information",
        )


@app.get("/intent-classes")
async def intent_classes():
    """Get list of supported intent classes"""
    return {
        "intent_classes": INTENT_CLASSES,
        "num_classes": len(INTENT_CLASSES),
    }


# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle validation errors"""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected errors"""
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ============================================================================
# Startup Message
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting NLU service on {SERVICE_CONFIG['host']}:{SERVICE_CONFIG['port']}")
    
    uvicorn.run(
        "app:app",
        host=SERVICE_CONFIG["host"],
        port=SERVICE_CONFIG["port"],
        workers=SERVICE_CONFIG["workers"],
        reload=SERVICE_CONFIG["reload"],
        log_level=SERVICE_CONFIG["log_level"],
    )
