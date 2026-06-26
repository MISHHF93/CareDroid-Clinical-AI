"""
Data preparation script for NLU training
Splits training data into train/val/test sets
"""

import json
import os
from pathlib import Path
from sklearn.model_selection import train_test_split

def prepare_datasets():
    """Load and split dataset into train/val/test"""
    
    data_dir = Path("data")
    train_file = data_dir / "train.jsonl"
    
    if not train_file.exists():
        print(f"❌ Training file not found: {train_file}")
        return
    
    # Load data
    print(f"📖 Loading data from {train_file}...")
    data = []
    with open(train_file, 'r') as f:
        for line in f:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            data.append(json.loads(line))
    
    print(f"✓ Loaded {len(data)} examples")
    
    # Check intent distribution
    intent_counts = {}
    for item in data:
        intent = item.get("intent", "unknown")
        intent_counts[intent] = intent_counts.get(intent, 0) + 1
    
    print("\n📊 Intent Distribution:")
    for intent, count in sorted(intent_counts.items()):
        percentage = (count / len(data)) * 100
        print(f"  {intent:20s}: {count:3d} ({percentage:5.1f}%)")
    
    # Split into train (80%), temp (20%)
    train_data, rest = train_test_split(data, test_size=0.2, random_state=42, stratify=[d.get("intent") for d in data])
    
    # Split temp into val (10%) and test (10%)
    val_data, test_data = train_test_split(rest, test_size=0.5, random_state=42, stratify=[d.get("intent") for d in rest])
    
    # Save splits
    print("\n💾 Saving splits...")
    
    # Save train
    with open(data_dir / "train.jsonl", 'w') as f:
        for item in train_data:
            f.write(json.dumps(item) + '\n')
    print(f"✓ Train: {len(train_data)} examples → data/train.jsonl")
    
    # Save validation
    with open(data_dir / "val.jsonl", 'w') as f:
        for item in val_data:
            f.write(json.dumps(item) + '\n')
    print(f"✓ Val:   {len(val_data)} examples → data/val.jsonl")
    
    # Save test
    with open(data_dir / "test.jsonl", 'w') as f:
        for item in test_data:
            f.write(json.dumps(item) + '\n')
    print(f"✓ Test:  {len(test_data)} examples → data/test.jsonl")
    
    print("\n✅ Data preparation complete!")
    print("\nNext: python train.py")

if __name__ == "__main__":
    prepare_datasets()
