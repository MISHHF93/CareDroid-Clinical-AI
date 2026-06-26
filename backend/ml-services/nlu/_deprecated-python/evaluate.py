"""
Evaluation script for NLU model
Evaluates trained model on test set and generates metrics
"""

import json
import logging
from pathlib import Path
from typing import Dict

import numpy as np
import torch
from datasets import Dataset
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from config import (
    INFERENCE_CONFIG,
    INTENT_LABELS,
    LABEL_TO_INTENT,
    MODEL_CONFIG,
    MODEL_PATHS,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def load_jsonl_dataset(filepath: str):
    """Load dataset from JSONL file"""
    import json
    data = []
    with open(filepath, 'r') as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    return data


def evaluate():
    """Evaluate the trained model"""
    device = torch.device("cuda" if INFERENCE_CONFIG["use_gpu"] and torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    
    # Load model and tokenizer
    model_dir = str(Path(MODEL_PATHS['best_model_dir']).resolve()).replace("\\", "/")
    logger.info(f"Loading model from {model_dir}")
    tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir, local_files_only=True)
    model.to(device)
    model.eval()
    
    # Load test data
    logger.info("Loading test dataset...")
    test_data = load_jsonl_dataset(MODEL_PATHS["test_data"] or "./data/test.jsonl")
    
    if not test_data:
        logger.warning("No test data found, using sample data")
        test_data = load_jsonl_dataset("./data/train.jsonl")[-50:]  # Use last 50 examples
    
    # Evaluate
    predictions = []
    true_labels = []
    inference_times = []
    
    logger.info(f"Evaluating on {len(test_data)} examples...")
    
    for example in test_data:
        text = example["text"]
        true_intent = example["intent"]
        true_label = INTENT_LABELS[true_intent]
        
        # Tokenize
        inputs = tokenizer(
            text,
            max_length=MODEL_CONFIG["max_length"],
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Inference
        import time
        start = time.time()
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits[0]
        inference_time = (time.time() - start) * 1000
        inference_times.append(inference_time)
        
        # Get prediction
        pred_label = torch.argmax(logits, dim=-1).item()
        predictions.append(pred_label)
        true_labels.append(true_label)
    
    # Calculate metrics
    accuracy = accuracy_score(true_labels, predictions)
    macro_f1 = f1_score(true_labels, predictions, average="macro")
    weighted_f1 = f1_score(true_labels, predictions, average="weighted")
    macro_precision = precision_score(true_labels, predictions, average="macro", zero_division=0)
    macro_recall = recall_score(true_labels, predictions, average="macro", zero_division=0)
    
    # Inference latency
    inference_times_sorted = sorted(inference_times)
    p50_latency = inference_times_sorted[len(inference_times) // 2]
    p95_latency = inference_times_sorted[int(len(inference_times) * 0.95)]
    p99_latency = inference_times_sorted[int(len(inference_times) * 0.99)]
    
    metrics = {
        "accuracy": float(accuracy),
        "macro_f1": float(macro_f1),
        "weighted_f1": float(weighted_f1),
        "macro_precision": float(macro_precision),
        "macro_recall": float(macro_recall),
        "latency_ms": {
            "p50": float(p50_latency),
            "p95": float(p95_latency),
            "p99": float(p99_latency),
            "mean": float(np.mean(inference_times)),
        },
        "test_set_size": len(test_data),
    }
    
    # Print results
    logger.info(f"\n{'='*50}")
    logger.info("EVALUATION RESULTS")
    logger.info(f"{'='*50}")
    logger.info(f"Accuracy: {accuracy:.4f}")
    logger.info(f"Macro F1: {macro_f1:.4f}")
    logger.info(f"Weighted F1: {weighted_f1:.4f}")
    logger.info(f"Macro Precision: {macro_precision:.4f}")
    logger.info(f"Macro Recall: {macro_recall:.4f}")
    logger.info(f"\nInference Latency (ms):")
    logger.info(f"  P50: {p50_latency:.2f}")
    logger.info(f"  P95: {p95_latency:.2f}")
    logger.info(f"  P99: {p99_latency:.2f}")
    logger.info(f"  Mean: {np.mean(inference_times):.2f}")
    logger.info(f"Test Set Size: {len(test_data)}")
    logger.info(f"{'='*50}\n")
    
    # Save metrics
    with open(MODEL_PATHS["metrics_output"], "w") as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Metrics saved to {MODEL_PATHS['metrics_output']}")


if __name__ == "__main__":
    evaluate()
