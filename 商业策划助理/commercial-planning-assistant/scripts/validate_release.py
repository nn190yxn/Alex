#!/usr/bin/env python3
"""
发布校验脚本
在发布skill前运行，检查案例库与索引的一致性。

检查项：
1. 案例库正文案例数 == 索引案例数
2. 索引中每个案例的行号指向正确的案例标题
3. 统计表数字与实际案例数一致
4. 无半角冒号残留
5. 所有案例标题格式统一（## 案例XN：项目名）
6. 每个案例包含全部标准章节
7. 索引关键字段覆盖率和状态值有效

用法: python scripts/validate_release.py
退出码: 0=全部通过, 1=有错误
"""

import re
import csv
import sys
import os
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CASE_FILE = os.path.join(BASE_DIR, "references", "感性城市案例库_待核验.md")
INDEX_FILE = os.path.join(BASE_DIR, "references", "case-index.csv")
ENRICHMENT_FILE = os.path.join(BASE_DIR, "references", "case-enrichment.csv")
TEST_FIXTURE_FILE = os.path.join(BASE_DIR, "tests", "fixtures", "项目测试清单.md")
REQUIRED_ENRICHMENT_FIELDS = {
    "case_id",
    "target_problem",
    "customer_type",
    "operation_goal",
    "asset_condition",
    "scale_level",
    "investment_level",
    "migration_difficulty",
    "verification_priority",
}

CASE_HEADER_RE = re.compile(r"^## (案例[A-E]\d+)[：:](.+)")


def main():
    errors = []
    warnings = []

    # 1. 读取案例库
    with open(CASE_FILE, "r", encoding="utf-8") as f:
        lines = f.read().split("\n")

    # 提取案例标题
    case_headers = []
    for i, line in enumerate(lines):
        m = CASE_HEADER_RE.match(line)
        if m:
            case_id = m.group(1).strip()
            case_name = m.group(2).strip()
            colon = "：" if "：" in line.split(m.group(1))[1][:1] else ":"
            case_headers.append(
                {
                    "case_id": case_id,
                    "project_name": case_name,
                    "line_no": i + 1,
                    "colon_type": colon,
                }
            )

    # 2. 读取索引
    with open(INDEX_FILE, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        index_rows = list(reader)

    # 检查1: 案例数一致
    if len(case_headers) != len(index_rows):
        errors.append(
            f"案例数不一致: 案例库={len(case_headers)}, 索引={len(index_rows)}"
        )

        # 找出差异
        header_ids = set(h["case_id"] for h in case_headers)
        index_ids = set(r["case_id"] for r in index_rows)
        missing_in_index = header_ids - index_ids
        missing_in_case = index_ids - header_ids
        if missing_in_index:
            errors.append(f"索引中缺失的案例: {sorted(missing_in_index)}")
        if missing_in_case:
            errors.append(f"案例库中缺失的案例: {sorted(missing_in_case)}")
    else:
        print(f"[OK] 案例数一致: {len(case_headers)}")

    # 检查2: 行号指向正确的案例标题
    for row in index_rows:
        line_no = int(row["line_no"])
        if line_no <= len(lines):
            header_at_line = lines[line_no - 1]
            if row["case_id"] not in header_at_line:
                errors.append(
                    f"行号错误: {row['case_id']} 指向行{line_no}但该行不是该案例标题"
                )
    if not any("行号错误" in e for e in errors):
        print(f"[OK] 索引行号全部正确")

    # 检查3: 统计表数字
    # 提取统计表
    stat_section = False
    stats = {}
    for line in lines:
        if line.startswith("## 案例统计"):
            stat_section = True
            continue
        if stat_section and line.startswith("## "):
            break
        if (
            stat_section
            and line.startswith("|")
            and "合计" not in line
            and "---" not in line
            and "分类" not in line
        ):
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) >= 4:
                stats[parts[0]] = int(parts[3])

    # 按分类统计实际案例数
    actual_counts = defaultdict(int)
    for h in case_headers:
        # 从案例ID推断分类
        prefix = h["case_id"][2]  # A/B/C/D/E
        model_map = {
            "A": "一、区域型购物中心/综合体",
            "B": "二、城市级概念/产业文商旅",
            "C": "三、街区/滨河/历史文化街区",
            "D": "四、社区型非标商业",
            "E": "五、混合业态资产激活",
        }
        if prefix in model_map:
            actual_counts[model_map[prefix]] += 1

    if set(stats) != set(actual_counts):
        errors.append(
            f"统计表分类不完整: 统计表={sorted(stats)}, 实际={sorted(actual_counts)}"
        )

    for model, expected in stats.items():
        actual = actual_counts.get(model, 0)
        if expected != actual:
            errors.append(f"统计表数字错误: {model} 统计表={expected}, 实际={actual}")
        else:
            print(f"[OK] {model}: {actual}")

    # 检查4: 半角冒号残留
    half_colon_cases = [h for h in case_headers if h["colon_type"] == ":"]
    if half_colon_cases:
        errors.append(
            f"半角冒号残留: {len(half_colon_cases)}个案例标题使用半角冒号: {[h['case_id'] for h in half_colon_cases]}"
        )
    else:
        print(f"[OK] 无半角冒号残留")

    # 检查5: 标题格式统一
    for h in case_headers:
        if not re.match(r"^案例[A-E]\d+$", h["case_id"]):
            warnings.append(f"案例编号格式异常: {h['case_id']} (行{h['line_no']})")

    # 检查6: 重复组完整性
    dup_groups = defaultdict(list)
    for row in index_rows:
        if row["duplicate_group"]:
            dup_groups[row["duplicate_group"]].append(row["case_id"])

    single_member_groups = {gid: ids for gid, ids in dup_groups.items() if len(ids) < 2}
    if single_member_groups:
        errors.append(f"重复组只有1个成员: {single_member_groups}")
    else:
        print(f"[OK] 重复组全部有2个以上成员: {len(dup_groups)}组")

    # 检查7: 每个案例包含全部标准章节
    required_sections = (
        "项目概况",
        "产品逻辑",
        "可迁移要素",
        "适用条件",
        "禁止迁移内容",
        "原文关键句",
    )
    for position, header in enumerate(case_headers):
        start = header["line_no"]
        end = (
            case_headers[position + 1]["line_no"] - 1
            if position + 1 < len(case_headers)
            else len(lines)
        )
        block = lines[start:end]
        headings = {line.removeprefix("### ").strip() for line in block if line.startswith("### ")}
        missing = [section for section in required_sections if section not in headings]
        if missing:
            errors.append(f"案例章节缺失: {header['case_id']} 缺少{missing}")
    if not any("案例章节缺失" in error for error in errors):
        print(f"[OK] {len(case_headers)}个案例均包含全部标准章节")

    # 检查8: 索引关键字段覆盖率和状态值
    if index_rows:
        tagged_count = sum(bool(row["business_tags"].strip()) for row in index_rows)
        tagged_ratio = tagged_count / len(index_rows)
        if tagged_ratio < 0.9:
            errors.append(
                f"business_tags覆盖率过低: {tagged_count}/{len(index_rows)} ({tagged_ratio:.1%})"
            )
        else:
            print(
                f"[OK] business_tags覆盖率: {tagged_count}/{len(index_rows)} ({tagged_ratio:.1%})"
            )

        allowed_statuses = {"待核验", "已核验", "已否决", "pending", "verified", "rejected"}
        invalid_statuses = sorted(
            {row["status"].strip() for row in index_rows if row["status"].strip() not in allowed_statuses}
        )
        if invalid_statuses:
            errors.append(f"索引状态值无效: {invalid_statuses}")
        else:
            print("[OK] 索引状态值全部有效")

        unclassified_count = sum(row["space_type"] == "未分类" for row in index_rows)
        if unclassified_count / len(index_rows) > 0.5:
            warnings.append(
                f"space_type未分类比例较高: {unclassified_count}/{len(index_rows)} "
                f"({unclassified_count / len(index_rows):.1%})"
            )

    # 检查9: 人工补录字段与项目测试夹具
    if not os.path.exists(ENRICHMENT_FILE):
        errors.append("缺少案例人工补录文件: references/case-enrichment.csv")
    else:
        with open(ENRICHMENT_FILE, "r", encoding="utf-8-sig", newline="") as f:
            enrichment_headers = set(csv.DictReader(f).fieldnames or [])
        missing_enrichment_fields = REQUIRED_ENRICHMENT_FIELDS - enrichment_headers
        if missing_enrichment_fields:
            errors.append(f"案例人工补录字段缺失: {sorted(missing_enrichment_fields)}")
        else:
            print("[OK] 案例人工补录字段完整")

    if not os.path.exists(TEST_FIXTURE_FILE):
        errors.append("缺少项目测试夹具: tests/fixtures/项目测试清单.md")
    else:
        with open(TEST_FIXTURE_FILE, "r", encoding="utf-8") as f:
            fixture_text = f.read()
        required_scenarios = ("场景一：", "场景二：", "场景三：", "统一验收")
        missing_scenarios = [item for item in required_scenarios if item not in fixture_text]
        if missing_scenarios:
            errors.append(f"项目测试夹具不完整: 缺少{missing_scenarios}")
        else:
            print("[OK] 三类项目测试夹具完整")

    # 输出结果
    print()
    if warnings:
        print(f"[警告] {len(warnings)}项:")
        for w in warnings:
            print(f"  {w}")

    if errors:
        print(f"[失败] {len(errors)}项错误:")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)
    else:
        print("[通过] 全部检查通过")
        sys.exit(0)


if __name__ == "__main__":
    main()
