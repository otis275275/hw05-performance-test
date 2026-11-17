#!/bin/bash
# run_scenario.sh - Automated k6 performance test execution script
# Usage: ./run_scenario.sh <SCRIPT_FILE> <REPORT_NAME>

set -e

SCRIPT_PATH="$1"
REPORT_NAME="$2"

if [ -z "$SCRIPT_PATH" ] || [ -z "$REPORT_NAME" ]; then
  echo "Usage: $0 <path_to_k6_script> <report_name>"
  exit 1
fi

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REPORT_DIR="$BASE_DIR/report-final"
HTML_DIR="$REPORT_DIR/html-reports"
RAW_DIR="$REPORT_DIR/raw-logs"

mkdir -p "$HTML_DIR" "$RAW_DIR"

echo "=========================================================="
echo " [STEP 1] Resetting Database & Clearing Account Lockouts..."
echo "=========================================================="
node "$BASE_DIR/skills/performance-testing/scripts/reset_db.js"

echo "=========================================================="
echo " [STEP 2] Executing k6 Scenario: $REPORT_NAME"
echo " Script: $SCRIPT_PATH"
echo " Dashboard Export: $HTML_DIR/${REPORT_NAME}_dashboard.html"
echo " Raw JSON Summary: $RAW_DIR/${REPORT_NAME}_summary.json"
echo " Full Raw CSV Log: $RAW_DIR/${REPORT_NAME}_raw.csv"
echo "=========================================================="

k6 run \
  --out "web-dashboard=export=$HTML_DIR/${REPORT_NAME}_dashboard.html" \
  --out "csv=$RAW_DIR/${REPORT_NAME}_raw.csv" \
  --summary-export "$RAW_DIR/${REPORT_NAME}_summary.json" \
  "$SCRIPT_PATH"

python3 "$BASE_DIR/skills/performance-testing/scripts/csv_to_jtl.py" \
  "$RAW_DIR/${REPORT_NAME}_raw.csv" \
  "$RAW_DIR/${REPORT_NAME}_raw.jtl"

echo "=========================================================="
echo " [STEP 3] Scenario Completed Successfully!"
echo " Reports generated at:"
echo " - HTML: $HTML_DIR/${REPORT_NAME}_dashboard.html"
echo " - JSON Summary: $RAW_DIR/${REPORT_NAME}_summary.json"
echo " - Full Raw CSV: $RAW_DIR/${REPORT_NAME}_raw.csv"
echo " - Standard JTL: $RAW_DIR/${REPORT_NAME}_raw.jtl"
echo "=========================================================="
