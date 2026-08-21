import csv
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_csv(name):
    with open(os.path.join(BASE_DIR, "data", name), "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def main():
    snapshot = read_csv("case-index-snapshot.csv")
    optimized = read_csv("case-index-optimized.csv")
    queue_path = os.path.join(BASE_DIR, "work", "optimization-queue.csv")
    with open(queue_path, "r", encoding="utf-8-sig", newline="") as f:
        queue = list(csv.DictReader(f))
    evidence = read_csv("case-evidence.csv")
    cards = read_csv("case-insight-cards.csv")

    assert len(snapshot) == 461, len(snapshot)
    assert len(optimized) == 461, len(optimized)
    assert len(queue) == 461, len(queue)
    assert len({row["case_id"] for row in queue}) == 461
    assert len({row["case_id"] for row in evidence}) == len(evidence)
    assert {row["case_id"] for row in evidence} <= {row["case_id"] for row in queue}
    assert len(cards) == len(evidence), len(cards)
    assert {row["case_id"] for row in cards} == {row["case_id"] for row in evidence}
    completed_cards = [row for row in cards if row["card_status"] == "已完成"]
    cards_dir = os.path.join(BASE_DIR, "案例卡")
    assert os.path.isdir(cards_dir), cards_dir
    generated_cards = [name for name in os.listdir(cards_dir) if name.endswith(".md")]
    assert len(generated_cards) == len(completed_cards), len(generated_cards)
    for card in cards:
        if card["card_status"] == "已完成":
            assert card["project_highlight"], card["case_id"]
            assert card["transferable_action"], card["case_id"]
            assert card["applicability_trigger"], card["case_id"]
            assert card["required_conditions"], card["case_id"]

    batch_dir = os.path.join(BASE_DIR, "work", "batches")
    batch_rows = []
    for filename in os.listdir(batch_dir):
        if filename.endswith(".csv"):
            with open(os.path.join(batch_dir, filename), "r", encoding="utf-8-sig", newline="") as f:
                batch_rows.extend(csv.DictReader(f))
    assert len(batch_rows) == 461, len(batch_rows)
    assert {row["case_id"] for row in batch_rows} == {row["case_id"] for row in queue}

    required_docs = ["README.md", "优化规范.md", "字段字典.md", "分类体系.md", "核验工作流.md"]
    for name in required_docs:
        assert os.path.exists(os.path.join(BASE_DIR, name)), name

    print(
        f"workspace OK: {len(queue)} cases, {len(evidence)} evidence records, "
        f"{len(cards)} insight cards, {len(batch_rows)} batched rows"
    )


if __name__ == "__main__":
    main()
