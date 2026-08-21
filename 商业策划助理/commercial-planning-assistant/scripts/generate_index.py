#!/usr/bin/env python3
"""
案例库索引生成脚本
从感性城市案例库_待核验.md生成结构化CSV索引，包含完整字段和重复组标识。

用法: python scripts/generate_index.py
输出: references/case-index.csv
"""

import re
import csv
import os
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CASE_FILE = os.path.join(BASE_DIR, "references", "感性城市案例库_待核验.md")
INDEX_FILE = os.path.join(BASE_DIR, "references", "case-index.csv")
ENRICHMENT_FILE = os.path.join(BASE_DIR, "references", "case-enrichment.csv")

ENRICHMENT_FIELDS = [
    "target_problem",
    "customer_type",
    "operation_goal",
    "asset_condition",
    "scale_level",
    "investment_level",
    "migration_difficulty",
    "verification_priority",
]

# 案例标题匹配：支持全角和半角冒号
CASE_HEADER_RE = re.compile(r"^## (案例[A-E]\d+)[：:](.+)")

# 字段匹配：支持全角和半角冒号
FIELD_PATTERNS = {
    "model": re.compile(r"\*\*所属商业模型\*\*\s*[：:]\s*(.+)"),
    "video_no": re.compile(r"\*\*来源视频编号\*\*\s*[：:]\s*(.+)"),
    "status": re.compile(r"\*\*核验状态\*\*\s*[：:]\s*(.+)"),
}

# 项目概况字段
PROJECT_FIELDS = {
    "city": re.compile(r"^-\s+城市[：:]\s*(.+)"),
    "size": re.compile(r"^-\s+体量[：:]\s*(.+)"),
    "business_tags": re.compile(r"^-\s+业态构成[：:]\s*(.+)"),
}

# 可迁移要素表中的标签
MIGRATION_TAG_RE = re.compile(r"^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)")

# 空间类型关键词
SPACE_KEYWORDS = {
    "盒子mall": ["盒子", "mall", "购物中心", "万象城", "大悦城", "万达", "吾悦"],
    "街区": ["街区", "街巷", "弄堂", "里弄", "block"],
    "滨水": ["滨水", "河", "江", "湖", "海岸", "码头", "滩"],
    "地下": ["地下", "负一层", "B1", "防空洞"],
    "屋顶": ["屋顶", "顶楼", "天台"],
    "公园": ["公园", "绿地"],
    "历史文化": ["历史", "文化", "古迹", "老街", "古镇", "文物"],
    "产业园": ["产业园", "工业园", "仓库", "厂房"],
}


def load_enrichment():
    """读取人工补录的案例决策标签，索引重建时保留这些字段。"""
    if not os.path.exists(ENRICHMENT_FILE):
        return {}

    with open(ENRICHMENT_FILE, "r", encoding="utf-8-sig", newline="") as f:
        rows = csv.DictReader(f)
        return {
            row["case_id"].strip(): {
                field: row.get(field, "").strip() for field in ENRICHMENT_FIELDS
            }
            for row in rows
            if row.get("case_id", "").strip()
        }


def extract_cases(lines):
    """从案例库文本中提取所有案例的结构化信息"""
    cases = []
    current_case = None
    in_project_overview = False
    in_migration_table = False
    migration_tags = []

    for i, line in enumerate(lines):
        header_match = CASE_HEADER_RE.match(line)

        if header_match:
            # 保存前一个案例
            if current_case:
                current_case["migration_tags"] = (
                    "; ".join(migration_tags) if migration_tags else ""
                )
                cases.append(current_case)

            case_id = header_match.group(1).strip()
            case_name = header_match.group(2).strip()
            current_case = {
                "case_id": case_id,
                "project_name": case_name,
                "model": "",
                "video_no": "",
                "status": "",
                "city": "",
                "size": "",
                "space_type": "",
                "business_tags": "",
                "migration_tags": "",
                "completeness": "",
                "line_no": i + 1,
            }
            in_project_overview = False
            in_migration_table = False
            migration_tags = []
            continue

        if current_case is None:
            continue

        # 提取字段
        for field_name, pattern in FIELD_PATTERNS.items():
            m = pattern.match(line)
            if m:
                current_case[field_name] = m.group(1).strip()
                continue

        # 检测项目概况/产品概况段
        if line.startswith("### 项目概况") or line.startswith("### 产品概况"):
            in_project_overview = True
            continue
        elif line.startswith("### ") and in_project_overview:
            in_project_overview = False

        # 提取项目概况字段
        if in_project_overview:
            for field_name, pattern in PROJECT_FIELDS.items():
                m = pattern.match(line)
                if m:
                    current_case[field_name] = m.group(1).strip()
                    break

        # 检测可迁移要素表
        if line.startswith("### 可迁移要素"):
            in_migration_table = True
            continue
        elif line.startswith("### ") and in_migration_table:
            in_migration_table = False

        # 提取可迁移要素标签
        if in_migration_table:
            m = MIGRATION_TAG_RE.match(line)
            if m and not m.group(1).strip().startswith("要素"):
                tag = m.group(1).strip()
                if tag and tag != "---":
                    migration_tags.append(tag)

    # 保存最后一个案例
    if current_case:
        current_case["migration_tags"] = (
            "; ".join(migration_tags) if migration_tags else ""
        )
        cases.append(current_case)

    return cases


def classify_space_type(case):
    """根据项目名、体量和业态构成推断空间类型"""
    text = (
        f"{case['project_name']} {case.get('size', '')} {case.get('business_tags', '')}"
    )
    types = []
    for space_type, keywords in SPACE_KEYWORDS.items():
        if any(kw.lower() in text.lower() for kw in keywords):
            types.append(space_type)
    return "; ".join(types) if types else "未分类"


def classify_business_tags(case):
    """从业态构成提取业态标签"""
    biz = case.get("business_tags", "") or case.get("size", "")
    if not biz:
        return ""
    # 简化：取前3个业态关键词
    tags = []
    keywords_map = {
        "餐饮": ["餐饮", "食集", "美食", "咖啡", "茶", "酒"],
        "零售": ["零售", "服饰", "品牌", "美妆", "潮牌", "买手"],
        "体验": ["体验", "手作", "工坊", "DIY"],
        "娱乐": ["娱乐", "电竞", "KTV", "酒吧", "live"],
        "亲子": ["亲子", "儿童", "游乐"],
        "文化": ["文化", "艺术", "展览", "策展", "书店"],
        "运动": ["运动", "体育", "健身", "滑雪"],
        "办公": ["办公", "写字楼", "联合办公"],
        "酒店": ["酒店", "民宿", "住宿"],
        "生鲜": ["生鲜", "超市", "菜场"],
    }
    for tag, keywords in keywords_map.items():
        if any(kw in biz for kw in keywords):
            tags.append(tag)
    return "; ".join(tags[:5]) if tags else ""


def calculate_completeness(case):
    """计算案例完整度：检查必要字段是否填充"""
    required_fields = ["model", "video_no", "status", "city", "size"]
    filled = sum(
        1
        for f in required_fields
        if case.get(f, "").strip() and case.get(f, "").strip() != "未提及"
    )
    has_migration = bool(case.get("migration_tags", "").strip())
    has_business = bool(case.get("business_tags", "").strip())

    score = filled / len(required_fields) * 70
    if has_migration:
        score += 15
    if has_business:
        score += 15

    if score >= 85:
        return "高"
    elif score >= 60:
        return "中"
    else:
        return "低"


def find_duplicates(cases):
    """找出项目名重复的案例组。

    归一化规则：
    1. 去除括号及括号内内容
    2. 去除连字符及之后的后缀（如'-生命之树'）
    3. 去除'社区品牌'等附加词

    返回重复组数量。
    """

    def normalize(name):
        # 去括号
        cleaned = re.sub(r"[（(].*?[)）]", "", name).strip()
        # 去连字符后缀
        cleaned = re.sub(r"[-—]\s*.+$", "", cleaned).strip()
        # 去常见附加词
        for suffix in ["社区品牌", "品牌"]:
            if cleaned.endswith(suffix):
                cleaned = cleaned[: -len(suffix)].strip()
        return cleaned

    # 按归一化名称分组
    name_to_cases = defaultdict(list)
    for case in cases:
        normalized = normalize(case["project_name"])
        name_to_cases[normalized].append(case)

    # 分配duplicate_group：只给有2个以上成员的组分配
    group_id = 0
    for name in sorted(name_to_cases.keys()):
        group_cases = name_to_cases[name]
        if len(group_cases) > 1:
            group_id += 1
            gid = f"DG{group_id:02d}"
            for case in group_cases:
                case["duplicate_group"] = gid
        else:
            group_cases[0]["duplicate_group"] = ""

    return group_id


def main():
    with open(CASE_FILE, "r", encoding="utf-8") as f:
        lines = f.read().split("\n")

    cases = extract_cases(lines)
    enrichment = load_enrichment()

    # 后处理：空间类型、业态标签、完整度，并合并人工补录的决策标签
    for case in cases:
        case["space_type"] = classify_space_type(case)
        case["business_tags"] = classify_business_tags(case)
        case["completeness"] = calculate_completeness(case)
        case.update(enrichment.get(case["case_id"], {}))

    # 重复组标识
    dup_count = find_duplicates(cases)

    # 写CSV
    fieldnames = [
        "case_id",
        "project_name",
        "model",
        "city",
        "size",
        "space_type",
        "business_tags",
        "migration_tags",
        "completeness",
        "video_no",
        "status",
        "duplicate_group",
        "line_no",
        *ENRICHMENT_FIELDS,
    ]

    with open(INDEX_FILE, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for case in cases:
            writer.writerow({k: case.get(k, "") for k in fieldnames})

    print(f"索引生成完成: {INDEX_FILE}")
    print(f"案例总数: {len(cases)}")
    print(f"重复组数: {dup_count}")

    # 按分类统计
    model_counts = defaultdict(int)
    for case in cases:
        model_counts[case["model"]] += 1
    print("\n按分类统计:")
    for model, count in sorted(model_counts.items()):
        print(f"  {model}: {count}个")


if __name__ == "__main__":
    main()
