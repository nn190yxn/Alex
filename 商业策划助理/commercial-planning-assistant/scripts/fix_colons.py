"""
修复D82-D100标题行半角冒号→全角冒号
同时修复这些案例内部字段行的半角冒号
"""

import re

file_path = r"E:\程序开发\自创skill\commercial-planning-assistant\references\感性城市案例库_待核验.md"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.read().split("\n")

fixed_count = 0
in_range = False

for i in range(len(lines)):
    line = lines[i]
    # 检测D82开始
    if line.startswith("## 案例D82:"):
        in_range = True
    # 检测D100结束（下一个---后的分类五标题或E系列案例）
    if line.startswith("## 案例E") and in_range:
        in_range = False

    if in_range:
        # 修复标题行的半角冒号: "## 案例D82:XXX" → "## 案例D82：XXX"
        if re.match(r"^## 案例D\d+:", line):
            lines[i] = line.replace(":", "：", 1)
            fixed_count += 1
        # 修复字段行半角冒号: "**XXX**:" → "**XXX**："
        # 不处理URL行
        if "http" not in line and "https" not in line:
            new_line = re.sub(r"(\*\*[^*]+\*\*)\s*:", r"\1：", line)
            if new_line != line:
                lines[i] = new_line
                fixed_count += 1

with open(file_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"修复D82-D100半角冒号: {fixed_count}处")
