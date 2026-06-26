"""
Simple load test for NLU service
Usage: python load_test.py --url http://localhost:8001/predict --requests 50 --concurrency 5
"""

import argparse
import json
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib import request

SAMPLE_TEXTS = [
    "Patient has severe chest pain and shortness of breath",
    "Calculate SOFA score for this patient",
    "Interpret potassium level of 6.1",
    "Show sepsis protocol",
    "What are risk factors for stroke?",
]


def post_json(url: str, payload: dict) -> float:
    start = time.time()
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with request.urlopen(req, timeout=10) as response:
        response.read()
    return (time.time() - start) * 1000


def run_load_test(url: str, num_requests: int, concurrency: int) -> None:
    latencies = []
    payloads = [{"text": SAMPLE_TEXTS[i % len(SAMPLE_TEXTS)]} for i in range(num_requests)]

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(post_json, url, payload) for payload in payloads]
        for future in as_completed(futures):
            latencies.append(future.result())

    latencies.sort()
    p50 = latencies[int(0.50 * len(latencies))]
    p95 = latencies[int(0.95 * len(latencies))]
    p99 = latencies[int(0.99 * len(latencies))]

    print("\nNLU Load Test Results")
    print("---------------------")
    print(f"Requests: {num_requests}")
    print(f"Concurrency: {concurrency}")
    print(f"P50 latency: {p50:.2f} ms")
    print(f"P95 latency: {p95:.2f} ms")
    print(f"P99 latency: {p99:.2f} ms")
    print(f"Mean latency: {statistics.mean(latencies):.2f} ms")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8001/predict")
    parser.add_argument("--requests", type=int, default=50)
    parser.add_argument("--concurrency", type=int, default=5)
    args = parser.parse_args()

    run_load_test(args.url, args.requests, args.concurrency)
