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

    def get_val(metric_name):
        m = metrics.get(metric_name, {})
        return m.get('values', m)

    # 1. HTTP Request Duration (Latency)
    duration = get_val('http_req_duration')
    avg_lat = duration.get('avg', 0)
    min_lat = duration.get('min', 0)
    med_lat = duration.get('med', 0)
    p90_lat = duration.get('p(90)', 0)
    p95_lat = duration.get('p(95)', 0)
    p99_lat = duration.get('p(99)', 0)
    max_lat = duration.get('max', 0)

    # 2. HTTP Requests (RPS & Total)
    reqs = get_val('http_reqs')
    total_reqs = reqs.get('count', 0)
    rps = reqs.get('rate', 0)

    # 3. HTTP Request Failures
    failed = get_val('http_req_failed')
    failed_rate = failed.get('value', failed.get('rate', 0)) * 100
    failed_passes = failed.get('passes', 0)
    failed_fails = failed.get('fails', 0)

    # 4. Virtual Users
    vus = get_val('vus')
    vus_val = vus.get('value', 0)
    vus_max_dict = get_val('vus_max')
    vus_max = vus_max_dict.get('value', vus_max_dict.get('max', 0))

    # 5. Custom Workflow Metrics
    login_dur = get_val('login_duration')
    read_dur = get_val('profile_read_duration')
    update_dur = get_val('profile_update_duration')
    lockout_dur = get_val('lockout_duration')

    print(f"| Metric Name                   | Value / Percentile           |")
    print(f"|-------------------------------|------------------------------|")
    print(f"| Total HTTP Requests           | {total_reqs:,} reqs          |")
    print(f"| Throughput (RPS)              | {rps:.2f} req/s              |")
    print(f"| Latency Avg (Overall)         | {avg_lat:.2f} ms             |")
    print(f"| Latency Median (p50)          | {med_lat:.2f} ms             |")
    print(f"| Latency p90                   | {p90_lat:.2f} ms             |")
    print(f"| Latency p95                   | {p95_lat:.2f} ms             |")
    print(f"| Latency Max                   | {max_lat:.2f} ms             |")
    print(f"| Auth Login p95                | {login_dur.get('p(95)', 0):.2f} ms             |")
    print(f"| Read Profile p95              | {read_dur.get('p(95)', 0):.2f} ms             |")
    print(f"| Transactional Update p95      | {update_dur.get('p(95)', 0):.2f} ms             |")
    print(f"| Lockout Check p95             | {lockout_dur.get('p(95)', 0):.2f} ms             |")
    print(f"| Raw Non-2xx Responses Rate    | {failed_rate:.2f}% ({failed_passes}/{total_reqs}) |")
    print(f"| Peak Virtual Users (VUs)      | {vus_max}                    |")
    print(f"=======================================================\n")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <path_to_summary.json>")
        sys.exit(1)
    audit_summary(sys.argv[1])
