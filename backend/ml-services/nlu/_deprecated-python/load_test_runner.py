"""
Load Test Runner for NLU - Demonstration Mode
Shows load testing framework without requiring a live NLU service
"""

import argparse
import concurrent.futures
import json
import logging
import random
import statistics
import time
from typing import Dict, List

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Sample clinical queries for testing
SAMPLE_QUERIES = [
    "Patient showing signs of cardiac arrest",
    "What's the SOFA score for this patient?",
    "Interpret these lab values: WBC 15, Hgb 10",
    "Search sepsis protocol",
    "What are the contraindications for aspirin?",
]


def simulate_nlu_prediction(text: str) -> Dict:
    """
    Simulates NLU service /predict endpoint
    Real implementation would use requests.post(url, json={"text": text})
    """
    # Simulate network + processing latency (20-60ms)
    latency_ms = random.uniform(20, 60)
    time.sleep(latency_ms / 1000.0)
    
    # Simulated response
    return {
        "intent": "clinical_tool",
        "confidence": random.uniform(0.7, 0.99),
        "latency_ms": latency_ms,
    }


def run_single_request(task_id: int, query: str, use_live_service: bool, url: str) -> float:
    """
    Execute a single prediction request
    
    Args:
        task_id: Task identifier
        query: Clinical query text
        use_live_service: If True, use real HTTP requests; if False, simulate
        url: NLU service URL
    
    Returns:
        Latency in milliseconds
    """
    start_time = time.time()
    
    if use_live_service:
        try:
            import requests
            response = requests.post(url, json={"text": query}, timeout=5)
            response.raise_for_status()
            result = response.json()
        except Exception as e:
            logger.warning(f"Request {task_id} failed: {e}")
            return -1  # Indicate failure
    else:
        # Simulation mode
        result = simulate_nlu_prediction(query)
    
    latency_ms = (time.time() - start_time) * 1000
    return latency_ms


def run_load_test(
    url: str,
    num_requests: int,
    concurrency: int,
    use_live_service: bool,
) -> Dict:
    """
    Execute load testing with concurrent requests
    
    Args:
        url: NLU service URL
        num_requests: Total number of requests
        concurrency: Number of concurrent workers
        use_live_service: Whether to use real HTTP or simulation
    
    Returns:
        Dictionary with latency statistics
    """
    logger.info(f"Starting load test:")
    logger.info(f"  URL: {url}")
    logger.info(f"  Total Requests: {num_requests}")
    logger.info(f"  Concurrency: {concurrency}")
    logger.info(f"  Mode: {'Live Service' if use_live_service else 'Simulation'}")
    
    latencies = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        # Submit all tasks
        futures = []
        for i in range(num_requests):
            query = SAMPLE_QUERIES[i % len(SAMPLE_QUERIES)]
            future = executor.submit(
                run_single_request, i, query, use_live_service, url
            )
            futures.append(future)
        
        # Collect results
        for future in concurrent.futures.as_completed(futures):
            try:
                latency = future.result()
                if latency > 0:  # Filter out failed requests
                    latencies.append(latency)
            except Exception as e:
                logger.error(f"Task failed: {e}")
    
    if not latencies:
        logger.error("No successful requests!")
        return {}
    
    # Compute statistics
    latencies.sort()
    num_successful = len(latencies)
    
    p50_index = int(num_successful * 0.50)
    p95_index = int(num_successful * 0.95)
    p99_index = int(num_successful * 0.99)
    
    stats = {
        "total_requests": num_requests,
        "successful_requests": num_successful,
        "failed_requests": num_requests - num_successful,
        "p50_ms": latencies[p50_index],
        "p95_ms": latencies[p95_index],
        "p99_ms": latencies[p99_index],
        "mean_ms": statistics.mean(latencies),
        "min_ms": min(latencies),
        "max_ms": max(latencies),
    }
    
    return stats


def main():
    """Main entry point for load testing"""
    parser = argparse.ArgumentParser(description="NLU Load Testing")
    parser.add_argument(
        "--url",
        default="http://localhost:8001/predict",
        help="NLU service URL"
    )
    parser.add_argument(
        "--requests",
        type=int,
        default=50,
        help="Total number of requests"
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=5,
        help="Number of concurrent workers"
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Use live NLU service (requires running service)"
    )
    
    args = parser.parse_args()
    
    # Run load test
    stats = run_load_test(
        url=args.url,
        num_requests=args.requests,
        concurrency=args.concurrency,
        use_live_service=args.live,
    )
    
    if not stats:
        logger.error("Load test failed - no results")
        return
    
    # Display results
    logger.info("\n" + "=" * 60)
    logger.info("LOAD TEST RESULTS")
    logger.info("=" * 60)
    logger.info(f"Total Requests:      {stats['total_requests']}")
    logger.info(f"Successful:          {stats['successful_requests']}")
    logger.info(f"Failed:              {stats['failed_requests']}")
    logger.info("-" * 60)
    logger.info(f"Latency p50:         {stats['p50_ms']:.2f} ms")
    logger.info(f"Latency p95:         {stats['p95_ms']:.2f} ms")
    logger.info(f"Latency p99:         {stats['p99_ms']:.2f} ms")
    logger.info(f"Mean Latency:        {stats['mean_ms']:.2f} ms")
    logger.info(f"Min Latency:         {stats['min_ms']:.2f} ms")
    logger.info(f"Max Latency:         {stats['max_ms']:.2f} ms")
    logger.info("=" * 60)
    
    # Target comparison
    target_p95_ms = 50
    if stats['p95_ms'] < target_p95_ms:
        logger.info(f"✓ PASS: p95 latency {stats['p95_ms']:.2f}ms < target {target_p95_ms}ms")
    else:
        logger.warning(f"✗ FAIL: p95 latency {stats['p95_ms']:.2f}ms >= target {target_p95_ms}ms")


if __name__ == "__main__":
    main()
