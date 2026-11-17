#!/usr/bin/env python3
"""
csv_to_jtl.py - Convert k6 raw CSV metric stream into standard JMeter .jtl format
Usage: python3 csv_to_jtl.py <k6_raw.csv> <output.jtl>
"""
import sys
import csv

def convert_k6_to_jtl(csv_path, jtl_path):
    with open(csv_path, 'r', encoding='utf-8') as f_in, open(jtl_path, 'w', encoding='utf-8', newline='') as f_out:
        reader = csv.DictReader(f_in)
        fieldnames = [
            'timeStamp', 'elapsed', 'label', 'responseCode', 'responseMessage',
            'threadName', 'dataType', 'success', 'failureMessage', 'bytes',
            'sentBytes', 'grpThreads', 'allThreads', 'URL', 'Latency', 'IdleTime', 'Connect'
        ]
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()
        
        sample_count = 0
        for row in reader:
            if row.get('metric_name') == 'http_req_duration':
                ts = int(float(row.get('timestamp', 0)) * 1000)
                elapsed = int(round(float(row.get('metric_value', 0))))
                status = row.get('status', '200')
                label = row.get('group', '').replace('::', '') or row.get('name', 'HTTP Request')
                url = row.get('url', '')
                success = 'true' if int(status) < 400 or status in ['401', '403'] else 'false'
                resp_msg = 'OK' if status == '200' else ('Unauthorized/Forbidden' if status in ['401', '403'] else 'Error')
                
                writer.writerow({
                    'timeStamp': ts,
                    'elapsed': elapsed,
                    'label': label,
                    'responseCode': status,
                    'responseMessage': resp_msg,
                    'threadName': 'k6-thread-pool',
                    'dataType': 'text',
                    'success': success,
                    'failureMessage': '',
                    'bytes': 512,
                    'sentBytes': 256,
                    'grpThreads': 15,
                    'allThreads': 15,
                    'URL': url,
                    'Latency': elapsed,
                    'IdleTime': 0,
                    'Connect': 0
                })
                sample_count += 1
        print(f"[CONVERT] Successfully generated JTL log with {sample_count} samples: {jtl_path}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 csv_to_jtl.py <k6_raw.csv> <output.jtl>")
        sys.exit(1)
    convert_k6_to_jtl(sys.argv[1], sys.argv[2])
