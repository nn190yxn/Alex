import csv
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
CARDS_DIR = os.path.join(BASE_DIR, "案例卡")


def read_csv(name):
    with open(os.path.join(DATA_DIR, name), "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def safe_name(value):
    return re.sub(r'[\\/:*?"<>|]', "-", value)


def main():
    cards = read_csv("case-insight-cards.csv")
    evidence_by_id = {row["case_id"]: row for row in read_csv("case-evidence.csv")}
    os.makedirs(CARDS_DIR, exist_ok=True)

    generated = 0
    for card in cards:
        if card["card_status"] != "已完成":
            continue
        evidence = evidence_by_id[card["case_id"]]
        content = f'''# {card["project_name"]}

- 案例编号：{card["case_id"]}
- 证据状态：{card["evidence_status"]}
- 提案用途：{card["proposal_use"]}

## 项目亮点

{card["project_highlight"]}

## 解决的问题或机会

{card["problem_opportunity"]}

## 关键动作

{card["decisive_action"]}

## 商业机制

{card["mechanism_chain"]}

## 已确认的结果

{card["evidence_backed_result"]}

## 可借鉴动作

{card["transferable_action"]}

## 适用触发条件

{card["applicability_trigger"]}

## 成立前提

{card["required_conditions"]}

## 不可照搬条件

{card["non_transferable_conditions"]}

## 证据

- 来源等级：{evidence["source_level"]}
- 支撑范围：{evidence["fact_scope"]}
- 核验结论：{evidence["verification_conclusion"]}
- 来源：{evidence["source_url"] or "待补"}
- 备注：{evidence["notes"]}
'''
        path = os.path.join(CARDS_DIR, f'{card["case_id"]}-{safe_name(card["project_name"])}.md')
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        generated += 1

    print(f"generated {generated} independent case cards")


if __name__ == "__main__":
    main()
