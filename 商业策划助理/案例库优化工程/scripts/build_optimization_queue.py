import csv
import math
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_FILE = os.path.join(BASE_DIR, "data", "case-index-snapshot.csv")
QUEUE_FILE = os.path.join(BASE_DIR, "work", "optimization-queue.csv")
OPTIMIZED_INDEX_FILE = os.path.join(BASE_DIR, "data", "case-index-optimized.csv")
BATCH_DIR = os.path.join(BASE_DIR, "work", "batches")

OPTIMIZED_FIELDS = [
    "aliases",
    "project_type",
    "opening_or_operation_stage",
    "developer_operator",
    "target_problem_detail",
    "core_mechanism",
    "traffic_mechanism",
    "space_mechanism",
    "tenant_brand_mechanism",
    "content_operation_mechanism",
    "revenue_or_asset_effect",
    "recommended_project_types",
    "evidence_status",
]

HIGH_VALUE_RANGES = {
    "A": 20,
    "B": 15,
    "C": 14,
    "D": 9,
    "E": 8,
}


def is_high_value(case_id):
    match = re.fullmatch(r"(?:案例)?([A-Z])(\d+)", case_id.strip())
    return bool(match and int(match.group(2)) <= HIGH_VALUE_RANGES.get(match.group(1), 0))


def priority(row):
    if row.get("status", "").strip() in {"已核验", "verified"} or is_high_value(row["case_id"]):
        return "P0"
    if row.get("completeness", "").strip() == "高":
        return "P1"
    return "P2"


def main():
    os.makedirs(os.path.dirname(QUEUE_FILE), exist_ok=True)
    os.makedirs(BATCH_DIR, exist_ok=True)

    with open(INDEX_FILE, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        source_fields = list(reader.fieldnames or [])

    optimized_fields = source_fields + [
        field for field in OPTIMIZED_FIELDS if field not in source_fields
    ]
    optimized_rows = []
    for row in rows:
        optimized_row = dict(row)
        optimized_row.update({field: "" for field in OPTIMIZED_FIELDS})
        optimized_row["evidence_status"] = {
            "已核验": "已核验",
            "verified": "已核验",
            "待核验": "线索",
            "pending": "线索",
        }.get(row.get("status", "").strip(), "未整理")
        optimized_rows.append(optimized_row)

    with open(OPTIMIZED_INDEX_FILE, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=optimized_fields)
        writer.writeheader()
        writer.writerows(optimized_rows)

    progress = {}
    if os.path.exists(QUEUE_FILE):
        with open(QUEUE_FILE, "r", encoding="utf-8-sig", newline="") as f:
            progress_rows = csv.DictReader(f)
            progress = {
                row["case_id"]: row for row in progress_rows if row.get("case_id")
            }

    rows.sort(key=lambda row: (priority(row), row["model"], row["case_id"]))
    queue = []
    for position, row in enumerate(rows, start=1):
        queue.append({
            "queue_no": position,
            "case_id": row["case_id"],
            "project_name": row["project_name"],
            "model": row["model"],
            "original_status": row.get("status", ""),
            "completeness": row.get("completeness", ""),
            "triage_priority": priority(row),
            "batch": f"B{math.ceil(position / 25):03d}",
            "research_status": progress.get(row["case_id"], {}).get("research_status", "未开始"),
            "evidence_status": progress.get(row["case_id"], {}).get("evidence_status", "未整理"),
            "reviewer_notes": progress.get(row["case_id"], {}).get("reviewer_notes", ""),
        })

    fields = list(queue[0].keys())
    with open(QUEUE_FILE, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(queue)

    for filename in os.listdir(BATCH_DIR):
        if filename.endswith(".csv"):
            os.remove(os.path.join(BATCH_DIR, filename))

    for batch in sorted({row["batch"] for row in queue}):
        batch_rows = [row for row in queue if row["batch"] == batch]
        with open(os.path.join(BATCH_DIR, f"{batch}.csv"), "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(batch_rows)

    counts = {}
    for row in queue:
        counts[row["triage_priority"]] = counts.get(row["triage_priority"], 0) + 1
    print(f"案例队列已生成: {len(queue)}")
    print("分层统计:", counts)
    print(f"批次数量: {math.ceil(len(queue) / 25)}")


if __name__ == "__main__":
    main()
