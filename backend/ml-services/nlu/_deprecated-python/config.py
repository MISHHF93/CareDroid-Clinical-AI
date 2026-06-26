"""
NLU Service Configuration
Hyperparameters and settings for model training and inference
"""

import os
from typing import Dict, List

# Model Configuration
MODEL_CONFIG = {
    "model_name": os.getenv(
        "NLU_MODEL_NAME",
        "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
    ),
    "model_cache_dir": os.getenv("NLU_MODEL_CACHE_DIR", "./models"),
    "num_labels": 7,  # Number of intent classes
    "max_length": int(os.getenv("NLU_MAX_LENGTH", "512")),
    "hidden_dropout_prob": 0.1,
    "attention_probs_dropout_prob": 0.1,
}

# Training Configuration
TRAINING_CONFIG = {
    "num_epochs": int(os.getenv("NLU_EPOCHS", "5")),
    "batch_size": int(os.getenv("NLU_BATCH_SIZE", "16")),
    "learning_rate": float(os.getenv("NLU_LEARNING_RATE", "2e-5")),
    "warmup_steps": int(os.getenv("NLU_WARMUP_STEPS", "500")),
    "weight_decay": 0.01,
    "max_grad_norm": 1.0,
    "seed": 42,
    "early_stopping_patience": 3,
    "early_stopping_threshold": 0.01,
    "gradient_accumulation_steps": 1,
    "use_amp": True,  # Automatic Mixed Precision
    "num_workers": int(os.getenv("NLU_NUM_WORKERS", "4")),
}

# Inference Configuration
INFERENCE_CONFIG = {
    "batch_size": int(os.getenv("NLU_INFERENCE_BATCH_SIZE", "32")),
    "use_gpu": os.getenv("NLU_USE_GPU", "true").lower() == "true",
    "num_workers": int(os.getenv("NLU_INFERENCE_WORKERS", "4")),
    "confidence_threshold": float(
        os.getenv(
            "NLU_INFERENCE_CONFIDENCE_THRESHOLD",
            os.getenv("NLU_CONFIDENCE_THRESHOLD", "0.5"),
        )
    ),
}

# Service Configuration
SERVICE_CONFIG = {
    "host": os.getenv("NLU_HOST", "0.0.0.0"),
    "port": int(os.getenv("NLU_PORT", "8001")),
    "workers": int(os.getenv("NLU_WORKERS", "4")),
    "reload": os.getenv("NLU_RELOAD", "false").lower() == "true",
    "log_level": os.getenv("NLU_LOG_LEVEL", "info"),
}

# Intent Configuration
INTENT_CLASSES: List[str] = [
    "emergency",          # 0: Critical patient conditions
    "clinical_tool",      # 1: SOFA, drug interactions, lab interpreter
    "lab_query",          # 2: Interpret lab values
    "protocol_search",    # 3: Search medical protocols/guidelines
    "general_query",      # 4: General medical knowledge
    "patient_data",       # 5: Patient history, records access
    "admin_function",     # 6: Admin tasks, configuration
]

INTENT_LABELS: Dict[str, int] = {intent: idx for idx, intent in enumerate(INTENT_CLASSES)}
LABEL_TO_INTENT: Dict[int, str] = {idx: intent for intent, idx in INTENT_LABELS.items()}

# Subcategories for Emergency Intent
EMERGENCY_SUBCATEGORIES = {
    "cardiac": ["chest pain", "arrhythmia", "myocardial infarction", "mi", "acs"],
    "neurological": ["stroke", "cva", "seizure", "altered mental status", "ams"],
    "respiratory": ["dyspnea", "respiratory failure", "respiratory distress", "apnea"],
    "sepsis": ["sepsis", "septic shock", "fever", "infection"],
    "trauma": ["trauma", "blunt", "penetrating", "burns"],
    "psychiatric": ["suicide", "suicidal", "psychiatric emergency", "psychotic"],
}

# Model Paths
MODEL_PATHS = {
    "base_model_dir": os.getenv("NLU_BASE_MODEL_DIR", "./models"),
    "best_model_dir": os.getenv("NLU_BEST_MODEL_DIR", "./models/best_model"),
    "training_data": os.getenv("NLU_TRAINING_DATA", "./data/train.jsonl"),
    "validation_data": os.getenv("NLU_VALIDATION_DATA", "./data/val.jsonl"),
    "test_data": os.getenv("NLU_TEST_DATA", "./data/test.jsonl"),
    "metrics_output": os.getenv("NLU_METRICS_OUTPUT", "./metrics.json"),
}

# Feature Extraction
FEATURE_CONFIG = {
    "extract_embeddings": False,  # Return token embeddings (disable for speed)
    "extract_attention": False,   # Return attention weights (disable for speed)
    "return_logits": True,        # Return raw logits for confidence scoring
}

# Logging
LOGGING_CONFIG = {
    "level": os.getenv("NLU_LOG_LEVEL", "INFO"),
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
}
