#!/bin/bash
set -euo pipefail

API_URL=${API_URL:-http://localhost:4000}
DATA_DIR=${DATA_DIR:-$(cd "$(dirname "$0")/../docs/generated_datasets" && pwd)}

classes_csv="$DATA_DIR/classes.csv"
teachers_csv="$DATA_DIR/teachers.csv"
students_csv="$DATA_DIR/students.csv"
student_assignments_csv="$DATA_DIR/student_class_assignments.csv"
faculty_assignments_csv="$DATA_DIR/faculty_class_assignments.csv"
advisor_assignments_csv="$DATA_DIR/advisor_class_assignments.csv"

summary_from_json() {
  python3 - <<'PY'
import json
import sys

def summarise(payload):
    if not isinstance(payload, dict):
        return None
    parts = []
    message = payload.get('message')

    def normalise(label, value):
        if isinstance(value, list):
            return f"{label}={len(value)}"
        if isinstance(value, int):
            return f"{label}={value}"
        return None

    for key in ('successful', 'failed', 'failedEntries'):
        note = normalise(key, payload.get(key))
        if note:
            parts.append(note)

    results = payload.get('results')
    if isinstance(results, dict):
        for key in ('successful', 'failed', 'failedEntries'):
            note = normalise(key, results.get(key))
            if note and note not in parts:
                parts.append(note)

    summary = ', '.join(parts)
    if message and summary:
        return f"{message} ({summary})"
    if message:
        return message
    if summary:
        return summary
    return json.dumps(payload)

try:
    data = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(1)
else:
    output = summarise(data)
    if output is None:
        sys.exit(1)
    print(output)
PY
}

post_csv() {
  local endpoint="$1"
  local file_path="$2"
  local label="$3"

  if [ ! -f "$file_path" ]; then
    echo "Required file $file_path not found" >&2
    exit 1
  fi

  echo "Uploading $label from $file_path"
  response=$(curl -sS -f -X POST "$API_URL/api$endpoint" -H 'Accept: application/json' -F "file=@${file_path}")
  if command -v python3 >/dev/null 2>&1; then
    if ! summary=$(printf '%s' "$response" | summary_from_json); then
      echo "$response"
    else
      echo "$summary"
    fi
  else
    echo "$response"
  fi
  echo ""
}

post_csv "/class/bulk-create" "$classes_csv" "classes"
post_csv "/teacher/bulk-register" "$teachers_csv" "teachers"
post_csv "/student/bulk-register" "$students_csv" "students"
post_csv "/assignment/students-to-classes" "$student_assignments_csv" "student-class assignments"
post_csv "/assignment/faculty-to-classes" "$faculty_assignments_csv" "faculty-class assignments"
post_csv "/assignment/advisors-to-classes" "$advisor_assignments_csv" "advisor-class assignments"

echo "Seeding complete."
