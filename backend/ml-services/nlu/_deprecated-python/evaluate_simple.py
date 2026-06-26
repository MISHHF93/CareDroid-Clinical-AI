"""
Simple evaluation script - demonstrates evaluation process without full model training 
Uses the BiomedBERT base model on test set to show accuracy metrics
"""

import json
import logging
from pathlib import Path
from typing import Dict, List

import numpy as np
import torch
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from config import INTENT_LABELS, LABEL_TO_INTENT, MODEL_CONFIG, MODEL_PATHS

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def load_jsonl_dataset(filepath: str) -> List[Dict]:
    """Load dataset from JSONL file"""
    data = []
    with open(filepath, 'r') as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    return data


def evaluate_simple():
    """
    Evaluate the model on test set
    Uses base model if fine-tuned model not available
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    
    # Try to load fine-tuned model, fall back to base model
    model_dir = str(Path(MODEL_PATHS["best_model_dir"]).resolve()).replace("\\", "/")
    best_model_exists = Path(MODEL_PATHS["best_model_dir"]).exists() and \
                       any(Path(MODEL_PATHS["best_model_dir"]).iterdir())
    
    if best_model_exists:
        logger.info(f"Loading fine-tuned model from {model_dir}")
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)
            model = AutoModelForSequenceClassification.from_pretrained(model_dir, local_files_only=True)
        except Exception as e:
            logger.warning(f"Failed to load fine-tuned model: {e}. Using base model.")
            tokenizer = AutoTokenizer.from_pretrained(MODEL_CONFIG["model_name"])
            model = AutoModelForSequenceClassification.from_pretrained(
                MODEL_CONFIG["model_name"],
                num_labels=MODEL_CONFIG["num_labels"],
            )
    else:
        logger.info(f"Fine-tuned model not found. Using base model: {MODEL_CONFIG['model_name']}")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_CONFIG["model_name"])
        model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_CONFIG["model_name"],
            num_labels=MODEL_CONFIG["num_labels"],
        )
    
    model.to(device)
    model.eval()
    
    # Load test data
    logger.info("Loading test dataset...")
    test_data = load_jsonl_dataset(MODEL_PATHS["test_data"] or "./data/test.jsonl")
    
    if not test_data:
        logger.warning("No test data found")
        return
    
    logger.info(f"Loaded {len(test_data)} test examples")
    
    # Tokenize and predict
    predictions = []
    references = []
    
    for example in test_data:
        text = example.get("text", "")
        intent = example.get("intent", "")
        label = INTENT_LABELS.get(intent, 0)
        
        references.append(label)
        
        # Tokenize
        inputs = tokenizer(
            text,
            padding="max_length",
            max_length=MODEL_CONFIG["max_length"],
            truncation=True,
            return_tensors="pt"
        )
        
        # Move to device
        for key in inputs:
            inputs[key] = inputs[key].to(device)
        
        # Predict
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            pred = torch.argmax(logits, dim=1).item()
            predictions.append(pred)
    
    # Compute metrics
    accuracy = accuracy_score(references, predictions)
    f1 = f1_score(references, predictions, average="weighted", zero_division=0)
    precision = precision_score(references, predictions, average="weighted", zero_division=0)
    recall = recall_score(references, predictions, average="weighted", zero_division=0)
    
    # Log results
    results = {
        "accuracy": float(accuracy),
        "f1": float(f1),
        "precision": float(precision),
        "recall": float(recall),
        "num_test_examples": len(test_data),
    }
    
    logger.info(f"Test Results:")
    logger.info(f"  Accuracy:  {accuracy:.4f}")
    logger.info(f"  F1 Score:  {f1:.4f}")
    logger.info(f"  Precision: {precision:.4f}")
    logger.info(f"  Recall:    {recall:.4f}")
    
    # Save metrics
    with open(MODEL_PATHS["metrics_output"], "w") as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"Metrics saved to {MODEL_PATHS['metrics_output']}")
    logger.info("Evaluation completed!")


if __name__ == "__main__":
    evaluate_simple()
