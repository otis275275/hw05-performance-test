#!/usr/bin/env python3
"""
audit_metrics.py - Independent Metrics Auditor for k6 Performance Tests
Parses k6 summary JSON file and outputs key percentiles and audit checkpoints.
"""
import sys
import json
import os

def audit_summary(json_path):
    if not os.path.exists(json_path):
        print(f"[ERROR] File not found: {json_path}")
        sys.exit(1)

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    metrics = data.get('metrics', {})

    print(f"\n=======================================================")
    print(f" METRIC AUDIT REPORT: {os.path.basename(json_path)}")
    print(f"=======================================================")

    # 1. HTTP Request Duration (Latency)
    duration = metrics.get('http_req_duration', {}).get('values', {})
    avg_lat = duration.get('avg', 0)
    min_lat = duration.get('min', 0)
    med_lat = duration.get('med', 0)
    p90_lat = duration.get('p(90)', 0)
    p95_lat = duration.get('p(95)', 0)
    p99_lat = duration.get('p(99)', 0)
    max_lat = duration.get('max', 0)

    # 2. HTTP Requests (RPS & Total)
    reqs = metrics.get('http_reqs', {}).get('values', {})
    total_reqs = reqs.get('count', 0)
    rps = reqs.get('rate', 0)

    # 3. HTTP Request Failures
    failed = metrics.get('http_req_failed', {}).get('values', {})
    failed_rate = failed.get('rate', 0) * 100
    failed_passes = failed.get('passes', 0)
    failed_fails = failed.get('fails', 0)

    # 4. Virtual Users
    vus = metrics.get('vus', {}).get('values', {}).get('value', 0)
    vus_max = metrics.get('vus_max', {}).get('values', {}).get('value', 0)

    print(f"| Metric Name              | Value / Percentile           |")
    print(f"|--------------------------|------------------------------|")
    print(f"| Total HTTP Requests      | {total_reqs:,} reqs          |")
    print(f"| Throughput (RPS)         | {rps:.2f} req/s              |")
    print(f"| Latency Avg              | {avg_lat:.2f} ms             |")
    print(f"| Latency Min              | {min_lat:.2f} ms             |")
    print(f"| Latency Median (p50)     | {med_lat:.2f} ms             |")
    print(f"| Latency p90              | {p90_lat:.2f} ms             |")
    print(f"| Latency p95              | {p95_lat:.2f} ms             |")
    print(f"| Latency p99              | {p99_lat:.2f} ms             |")
    print(f"| Latency Max              | {max_lat:.2f} ms             |")
    print(f"| Error Rate (%)           | {failed_rate:.2f}% ({failed_passes}/{total_reqs}) |")
    print(f"| Max VUs Reached          | {vus_max}                    |")
    print(f"=======================================================\n")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <path_to_summary.json>")
        sys.exit(1)
    audit_summary(sys.argv[1])
