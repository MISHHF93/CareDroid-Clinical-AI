"""
Utility functions for NLU service
"""

import hashlib
from typing import List


def hash_text(text: str) -> str:
    """Generate SHA-256 hash of text for caching"""
    return hashlib.sha256(text.encode()).hexdigest()


def truncate_text(text: str, max_length: int = 2048) -> str:
    """Truncate text to maximum length"""
    if len(text) > max_length:
        return text[:max_length] + "..."
    return text


def split_into_chunks(text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
    """
    Split long text into overlapping chunks for processing
    Useful for texts longer than model's max_length
    """
    chunks = []
    words = text.split()
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    
    return chunks


def normalize_text(text: str) -> str:
    """Normalize text for consistent processing"""
    # Remove extra whitespace
    text = " ".join(text.split())
    return text.strip()
