#!/usr/bin/env python3
"""
Phase 4 Anomaly Detection Service
Uses Isolation Forest (supervised ML) to detect anomalies in Prometheus metrics.
Runs every 5 minutes to compute anomaly scores and push to Prometheus.
"""

import os
import sys
import time
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import requests
import numpy as np
from sklearn.ensemble import IsolationForest
from prometheus_client import Counter, Gauge, CollectorRegistry, push_to_gateway

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AnomalyDetector:
    """Detects anomalies in Prometheus metrics using Isolation Forest"""

    def __init__(self, prometheus_url: str = "http://localhost:9090"):
        self.prometheus_url = prometheus_url
        self.isolation_forest = IsolationForest(
            contamination=0.1,  # Expect 10% anomalies
            random_state=42,
            n_estimators=100
        )
        
        # Metrics to monitor for anomalies
        self.metrics_to_monitor = [
            {
                'name': 'intent_classification_confidence',
                'query': 'intent_classification_confidence',
                'window': '1h',
                'threshold': 0.7  # Flag if score > 0.7
            },
            {
                'name': 'http_request_duration_seconds',
                'query': 'histogram_quantile(0.95, http_request_duration_seconds_bucket)',
                'window': '1h',
                'threshold': 0.7
            },
            {
                'name': 'errors_total',
                'query': 'rate(errors_total[5m])',
                'window': '1h',
                'threshold': 0.7
            },
            {
                'name': 'tool_invocation_duration_seconds',
                'query': 'histogram_quantile(0.95, tool_invocation_duration_seconds_bucket)',
                'window': '1h',
                'threshold': 0.7
            },
            {
                'name': 'rag_retrieval_duration_seconds',
                'query': 'histogram_quantile(0.95, rag_retrieval_duration_seconds_bucket)',
                'window': '1h',
                'threshold': 0.7
            }
        ]

    def query_prometheus(self, query: str, start_time: str, end_time: str, step: str = '5m') -> List[Dict]:
        """
        Query Prometheus API for metric data over time range
        Returns list of (timestamp, value) tuples
        """
        try:
            params = {
                'query': query,
                'start': start_time,
                'end': end_time,
                'step': step
            }
            response = requests.get(
                f'{self.prometheus_url}/api/v1/query_range',
                params=params,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            if data['status'] != 'success':
                logger.error(f"Prometheus query failed: {data.get('error', 'Unknown error')}")
                return []
            
            results = []
            for series in data.get('data', {}).get('result', []):
                for timestamp, value in series.get('values', []):
                    try:
                        results.append({
                            'timestamp': int(timestamp),
                            'value': float(value)
                        })
                    except (ValueError, TypeError):
                        continue
            
            return results
        except Exception as e:
            logger.error(f"Error querying Prometheus: {e}")
            return []

    def detect_anomalies(self, values: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Detect anomalies using Isolation Forest
        
        Returns:
            - predictions: -1 for anomalies, 1 for normal
            - anomaly_score: normalized score (0.0 to 1.0, higher = more anomalous)
        """
        if len(values) < 10:
            logger.warning(f"Insufficient data points ({len(values)}) for anomaly detection")
            return np.ones(len(values)), 0.0
        
        try:
            # Reshape for sklearn
            X = values.reshape(-1, 1)
            
            # Fit and predict
            self.isolation_forest.fit(X)
            predictions = self.isolation_forest.predict(X)
            
            # Get anomaly scores (lower = more anomalous, so invert to 0-1 scale)
            raw_scores = self.isolation_forest.score_samples(X)
            # Normalize to 0-1 range (lower raw scores = higher anomaly)
            min_score = raw_scores.min()
            max_score = raw_scores.max()
            if max_score > min_score:
                anomaly_scores = 1 - (raw_scores - min_score) / (max_score - min_score)
            else:
                anomaly_scores = np.zeros_like(raw_scores)
            
            # Latest anomaly score
            latest_score = float(anomaly_scores[-1])
            
            return predictions, latest_score
        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")
            return np.ones(len(values)), 0.0

    def process_metric(self, metric_config: Dict) -> Tuple[str, float]:
        """
        Process single metric and return (metric_name, anomaly_score)
        """
        metric_name = metric_config['name']
        query = metric_config['query']
        window = metric_config['window']
        threshold = metric_config['threshold']
        
        try:
            # Determine time range (last N hours)
            hours = 24  # Look at last 24 hours of data
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=hours)
            
            end_ts = int(end_time.timestamp())
            start_ts = int(start_time.timestamp())
            
            logger.info(f"Processing metric: {metric_name}")
            
            # Query prometheus
            data_points = self.query_prometheus(
                query=query,
                start_time=str(start_ts),
                end_time=str(end_ts),
                step='5m'
            )
            
            if not data_points:
                logger.warning(f"No data for metric {metric_name}")
                return metric_name, 0.0
            
            # Extract values
            values = np.array([dp['value'] for dp in data_points])
            
            # Handle NaN/Inf
            values = np.nan_to_num(values, nan=0.0, posinf=1e6, neginf=0.0)
            
            # Detect anomalies
            predictions, anomaly_score = self.detect_anomalies(values)
            
            logger.info(f"{metric_name}: anomaly_score={anomaly_score:.3f}")
            
            return metric_name, anomaly_score
        except Exception as e:
            logger.error(f"Error processing metric {metric_name}: {e}")
            return metric_name, 0.0

    def run(self):
        """Main detection loop - runs once per invocation"""
        logger.info("Starting anomaly detection run...")
        
        # Initialize metrics for tracking
        anomaly_scores = {}
        
        # Process each metric
        for metric_config in self.metrics_to_monitor:
            metric_name, score = self.process_metric(metric_config)
            anomaly_scores[metric_name] = score
        
        # Push results to Prometheus via remote write or exposition format
        logger.info(f"Anomaly scores: {json.dumps(anomaly_scores, indent=2)}")
        
        # Push to Prometheus pushgateway if available
        if os.getenv('PROMETHEUS_PUSHGATEWAY_URL'):
            self.push_metrics(anomaly_scores)
        else:
            # Otherwise, just log (in Docker, volumes can capture logs)
            logger.info(f"Metrics ready for push: {anomaly_scores}")
        
        return anomaly_scores

    def push_metrics(self, anomaly_scores: Dict[str, float]):
        """Push anomaly scores to Prometheus Pushgateway"""
        try:
            gateway_url = os.getenv('PROMETHEUS_PUSHGATEWAY_URL', 'http://localhost:9091')
            registry = CollectorRegistry()
            
            # Create gauge for each metric
            anomaly_gauge = Gauge(
                'anomaly_score',
                'Anomaly score (0-1, higher = more anomalous)',
                labelnames=['metric_name'],
                registry=registry
            )
            
            for metric_name, score in anomaly_scores.items():
                anomaly_gauge.labels(metric_name=metric_name).set(score)
            
            # Push to gateway
            push_to_gateway(
                gateway_url,
                job='anomaly_detector',
                registry=registry
            )
            logger.info(f"Metrics pushed to {gateway_url}")
        except Exception as e:
            logger.error(f"Error pushing metrics to gateway: {e}")


def main():
    """Entry point"""
    prometheus_url = os.getenv('PROMETHEUS_URL', 'http://localhost:9090')
    
    logger.info(f"Anomaly Detector starting (Prometheus: {prometheus_url})")
    
    detector = AnomalyDetector(prometheus_url=prometheus_url)
    anomaly_scores = detector.run()
    
    logger.info("Anomaly detection run complete")
    return anomaly_scores


if __name__ == '__main__':
    main()
