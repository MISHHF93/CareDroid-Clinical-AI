"""
Training script for NLU model
Fine-tunes BERT on clinical intent classification dataset
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import torch
from datasets import Dataset
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader
from transformers import AutoModelForSequenceClassification, AutoTokenizer, Trainer, TrainingArguments

from config import (
    INTENT_LABELS,
    MODEL_CONFIG,
    MODEL_PATHS,
    TRAINING_CONFIG,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def load_jsonl_dataset(filepath: str) -> List[Dict]:
    """Load dataset from JSONL file"""
    data = []
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            for line in f:
                if line.strip():
                    data.append(json.loads(line))
    return data


def prepare_dataset() -> Tuple[Dataset, Dataset, Dataset]:
    """
    Load and prepare training, validation, and test datasets
    
    Returns:
        (train_dataset, val_dataset, test_dataset)
    """
    logger.info("Loading dataset...")
    
    # Load training data
    train_data = load_jsonl_dataset(MODEL_PATHS["training_data"])
    
    if not train_data:
        # If no dedicated files, split training data
        all_data = load_jsonl_dataset(MODEL_PATHS["training_data"] or "./data/train.jsonl")
        train_data, val_test = train_test_split(all_data, test_size=0.3, random_state=42)
        val_data, test_data = train_test_split(val_test, test_size=0.5, random_state=42)
    else:
        val_data = load_jsonl_dataset(MODEL_PATHS["validation_data"]) or []
        test_data = load_jsonl_dataset(MODEL_PATHS["test_data"]) or []
    
    logger.info(f"Dataset sizes - Train: {len(train_data)}, Val: {len(val_data)}, Test: {len(test_data)}")
    
    # Convert to HuggingFace Dataset format
    train_dataset = Dataset.from_dict({
        "text": [d["text"] for d in train_data],
        "label": [INTENT_LABELS[d["intent"]] for d in train_data],
    })
    
    val_dataset = Dataset.from_dict({
        "text": [d["text"] for d in val_data] if val_data else [d["text"] for d in train_data[:len(train_data)//10]],
        "label": [INTENT_LABELS[d["intent"]] for d in val_data] if val_data else [INTENT_LABELS[d["intent"]] for d in train_data[:len(train_data)//10]],
    })
    
    test_dataset = Dataset.from_dict({
        "text": [d["text"] for d in test_data] if test_data else [d["text"] for d in train_data[-len(train_data)//10:]],
        "label": [INTENT_LABELS[d["intent"]] for d in test_data] if test_data else [INTENT_LABELS[d["intent"]] for d in train_data[-len(train_data)//10:]],
    })
    
    return train_dataset, val_dataset, test_dataset


def preprocess_function(examples, tokenizer):
    """Tokenize texts"""
    return tokenizer(
        examples["text"],
        padding="max_length",
        max_length=MODEL_CONFIG["max_length"],
        truncation=True,
    )


def train():
    """Train the NLU model"""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    
    # Load tokenizer and model
    logger.info(f"Loading pretrained model: {MODEL_CONFIG['model_name']}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_CONFIG["model_name"])
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_CONFIG["model_name"],
        num_labels=MODEL_CONFIG["num_labels"],
    )
    
    # Prepare datasets
    train_dataset, val_dataset, test_dataset = prepare_dataset()
    
    # Tokenize datasets
    logger.info("Tokenizing datasets...")
    train_dataset = train_dataset.map(
        lambda x: preprocess_function(x, tokenizer),
        batched=True,
        remove_columns=["text"],
    )
    val_dataset = val_dataset.map(
        lambda x: preprocess_function(x, tokenizer),
        batched=True,
        remove_columns=["text"],
    )
    test_dataset = test_dataset.map(
        lambda x: preprocess_function(x, tokenizer),
        batched=True,
        remove_columns=["text"],
    )
    
    # Set format to PyTorch
    train_dataset.set_format("torch")
    val_dataset.set_format("torch")
    test_dataset.set_format("torch")
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=MODEL_PATHS["best_model_dir"],
        num_train_epochs=TRAINING_CONFIG["num_epochs"],
        per_device_train_batch_size=TRAINING_CONFIG["batch_size"],
        per_device_eval_batch_size=TRAINING_CONFIG["batch_size"],
        learning_rate=TRAINING_CONFIG["learning_rate"],
        warmup_steps=TRAINING_CONFIG["warmup_steps"],
        weight_decay=TRAINING_CONFIG["weight_decay"],
        logging_dir="./logs",
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        seed=TRAINING_CONFIG["seed"],
        push_to_hub=False,
    )
    
    # Create trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
    )
    
    # Train
    logger.info("Starting training...")
    trainer.train()
    
    # Save model
    logger.info(f"Saving model to {MODEL_PATHS['best_model_dir']}")
    model_dir = Path(MODEL_PATHS["best_model_dir"]).resolve()
    model_dir.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(model_dir))
    tokenizer.save_pretrained(str(model_dir))
    
    # Evaluate
    logger.info("Evaluating on test set...")
    test_results = trainer.evaluate(test_dataset)
    logger.info(f"Test results: {test_results}")
    
    # Save metrics
    with open(MODEL_PATHS["metrics_output"], "w") as f:
        json.dump(test_results, f, indent=2)
    
    logger.info("Training completed!")


if __name__ == "__main__":
    train()
