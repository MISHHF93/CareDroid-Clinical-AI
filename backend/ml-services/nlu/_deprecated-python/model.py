"""
NLU Model Management
Handles model loading, inference, and batch processing
"""

import logging
import time
from typing import Dict, List, Optional, Tuple
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np

from config import (
    MODEL_CONFIG,
    INFERENCE_CONFIG,
    INTENT_CLASSES,
    LABEL_TO_INTENT,
    EMERGENCY_SUBCATEGORIES,
)

logger = logging.getLogger(__name__)


class NLUModel:
    """
    Wrapper for clinical intent classification model
    
    Features:
    - Lazy loading (loads model on first inference)
    - Batch processing support
    - Confidence scoring via softmax
    - Emergency subcategory detection
    - Inference latency tracking
    """

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize NLU model wrapper
        
        Args:
            model_path: Path to fine-tuned model. If None, uses MODEL_CONFIG['model_cache_dir']
        """
        self.model_path = model_path or MODEL_CONFIG["model_cache_dir"]
        self.device = self._get_device()
        self.tokenizer: Optional[AutoTokenizer] = None
        self.model: Optional[AutoModelForSequenceClassification] = None
        self.loaded = False
        
        logger.info(f"NLUModel initialized. Device: {self.device}")

    def _get_device(self) -> torch.device:
        """Get GPU device if available, else CPU"""
        if INFERENCE_CONFIG["use_gpu"] and torch.cuda.is_available():
            device = torch.device("cuda")
            logger.info(f"GPU available: {torch.cuda.get_device_name(0)}")
        else:
            device = torch.device("cpu")
            logger.info("Using CPU for inference")
        return device

    def load(self) -> None:
        """
        Load tokenizer and model from disk
        Called lazily on first inference to save startup time
        """
        if self.loaded:
            return

        try:
            logger.info(f"Loading model from {self.model_path}...")
            start_time = time.time()

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_path,
                cache_dir=MODEL_CONFIG["model_cache_dir"],
            )

            # Load model
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_path,
                num_labels=MODEL_CONFIG["num_labels"],
                cache_dir=MODEL_CONFIG["model_cache_dir"],
            )

            # Move model to device
            self.model.to(self.device)
            self.model.eval()

            elapsed = time.time() - start_time
            logger.info(f"Model loaded successfully in {elapsed:.2f}s")
            self.loaded = True

        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise

    def predict(self, text: str) -> Dict:
        """
        Predict intent for a single text
        
        Args:
            text: Input clinical note or query
            
        Returns:
            {
                "intent": "emergency",
                "confidence": 0.98,
                "label_id": 0,
                "logits": [0.1, 0.2, ...],
                "subcategory": "cardiac",
                "key_terms": ["chest pain"],
                "latency_ms": 42
            }
        """
        if not self.loaded:
            self.load()

        start_time = time.time()

        try:
            # Tokenize
            inputs = self.tokenizer(
                text,
                max_length=MODEL_CONFIG["max_length"],
                padding="max_length",
                truncation=True,
                return_tensors="pt",
            )

            # Move to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits[0].detach().cpu().numpy()

            # Convert logits to probabilities
            probabilities = torch.softmax(
                torch.tensor(logits), dim=-1
            ).numpy()

            # Get top prediction
            label_id = int(np.argmax(logits))
            confidence = float(probabilities[label_id])
            intent = LABEL_TO_INTENT[label_id]

            # Detect subcategory for emergency intent
            subcategory = None
            if intent == "emergency":
                subcategory = self._detect_subcategory(text, logits)

            # Extract key terms (simple keyword extraction)
            key_terms = self._extract_key_terms(text, intent)

            latency_ms = (time.time() - start_time) * 1000

            return {
                "intent": intent,
                "confidence": confidence,
                "label_id": label_id,
                "logits": logits.tolist(),
                "probabilities": probabilities.tolist(),
                "subcategory": subcategory,
                "key_terms": key_terms,
                "latency_ms": round(latency_ms, 2),
            }

        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            raise

    def predict_batch(self, texts: List[str]) -> List[Dict]:
        """
        Batch predict intents for multiple texts
        
        Args:
            texts: List of input texts
            
        Returns:
            List of prediction dicts
        """
        if not self.loaded:
            self.load()

        predictions = []
        batch_size = INFERENCE_CONFIG["batch_size"]

        # Process in batches for efficiency
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            batch_results = self._predict_batch_internal(batch_texts)
            predictions.extend(batch_results)

        return predictions

    def _predict_batch_internal(self, texts: List[str]) -> List[Dict]:
        """Internal batch prediction with batch tokenization"""
        start_time = time.time()

        try:
            # Batch tokenize
            inputs = self.tokenizer(
                texts,
                max_length=MODEL_CONFIG["max_length"],
                padding=True,
                truncation=True,
                return_tensors="pt",
            )

            # Move to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Batch inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits.detach().cpu().numpy()

            results = []
            for i, (text, logit_row) in enumerate(zip(texts, logits)):
                probabilities = torch.softmax(
                    torch.tensor(logit_row), dim=-1
                ).numpy()
                label_id = int(np.argmax(logit_row))
                confidence = float(probabilities[label_id])
                intent = LABEL_TO_INTENT[label_id]

                subcategory = None
                if intent == "emergency":
                    subcategory = self._detect_subcategory(text, logit_row)

                key_terms = self._extract_key_terms(text, intent)

                results.append({
                    "text": text,
                    "intent": intent,
                    "confidence": confidence,
                    "label_id": label_id,
                    "logits": logit_row.tolist(),
                    "probabilities": probabilities.tolist(),
                    "subcategory": subcategory,
                    "key_terms": key_terms,
                })

            latency_ms = (time.time() - start_time) * 1000
            logger.debug(f"Batch prediction ({len(texts)} texts) completed in {latency_ms:.2f}ms")

            return results

        except Exception as e:
            logger.error(f"Batch prediction failed: {str(e)}")
            raise

    def _detect_subcategory(self, text: str, logits: np.ndarray) -> Optional[str]:
        """
        Detect emergency subcategory based on text keywords
        
        Only called when intent == "emergency"
        """
        text_lower = text.lower()

        for subcategory, keywords in EMERGENCY_SUBCATEGORIES.items():
            if any(keyword in text_lower for keyword in keywords):
                return subcategory

        return "unknown"

    def _extract_key_terms(self, text: str, intent: str) -> List[str]:
        """
        Simple keyword extraction for key terms
        """
        # For now, return empty list. Can be enhanced with TF-IDF or other methods
        # This is a placeholder for future enhancement
        return []

    def get_model_info(self) -> Dict:
        """Get information about the loaded model"""
        if not self.loaded:
            return {
                "status": "not_loaded",
                "model_name": self.model_path,
            }

        model_size_mb = sum(
            p.numel() for p in self.model.parameters()
        ) * 4 / (1024 * 1024)  # Approximate size in MB

        return {
            "status": "loaded",
            "model_name": self.model_path,
            "device": str(self.device),
            "model_size_mb": round(model_size_mb, 2),
            "num_parameters": sum(p.numel() for p in self.model.parameters()),
            "num_labels": MODEL_CONFIG["num_labels"],
            "intent_classes": INTENT_CLASSES,
        }

    def unload(self) -> None:
        """Unload model from memory"""
        if self.model is not None:
            del self.model
        if self.tokenizer is not None:
            del self.tokenizer
        self.loaded = False
        torch.cuda.empty_cache()
        logger.info("Model unloaded")
