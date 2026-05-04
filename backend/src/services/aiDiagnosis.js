// AI 后置诊断服务 — 调用 LLM 生成结构化诊断报告
// 数据来源：阶段0/模块F/I/阶段1等收集的数据

import { generateStructured } from './ai.js'

// 构建 AI 诊断的系统提示词
function buildSystemPrompt() {
  return `你是企业增长全景顾问，精准识别增长瓶颈，输出可落地方案。

## 目标用户
二三线城市中小企业主（1-200人）

## 风格要求
- 精准、锋利、围绕增长、平实易懂
- 不用术语，用企业主听得懂的话
- 指出问题不绕弯，但给解决方向
- 发展性视角：不是"你哪里不行"，而是"你该进化成什么"

## 核心原则
1. 先听后说、聚焦增长、灵活组合
2. 回路思维：画出问题之间的因果闭环，而非列出孤立的清单
3. 滞后预警：每个改进建议标注效果显现时间，管理预期
4. 城市线级贯穿：所有诊断建议需结合城市线级的市场环境特征

## 输出格式
你必须输出 JSON 格式的诊断报告，包含以下结构：
{
  "industryProfile": { /* 行业画像摘要 */ },
  "founderAnalysis": { /* 创始人能力画像 */ },
  "rentAssessment": { /* 企业租评估 */ },
  "scanResults": { /* 快速扫描6维度 */ },
  "loopAnalysis": { /* 回路分析 */ },
  "ipDiagnosis": { /* 创始人IP诊断（如触发） */ },
  "growthLevers": [ /* 增长杠杆+改进路径 */ ],
  "lagWarnings": [ /* 滞后预警 */ ],
  "riskNotes": [ /* 问题清单 */ ],
  "nextSteps": [ /* 推荐下一步行动 */ ]
}`
}

// 构建用户提示词
function buildUserPrompt(diagnosisData) {
  const { stage0, founder, rent, scan, ip } = diagnosisData

  let prompt = `# 企业增长全景顾问数据\n\n`

  // 阶段0
  if (stage0) {
    prompt += `## 阶段0：行业与城市画像\n`
    prompt += `- 城市：${stage0.city?.name || '未知'}（${stage0.city?.tier || '未知'}）\n`
    prompt += `- 行业：${stage0.industry || '未知'}\n`
    prompt += `- 客户类型：${stage0.customerType || '未知'}\n`
    prompt += `- 客单价：${stage0.priceRange || '未知'}\n`
    prompt += `- 决策周期：${stage0.decisionCycle || '未知'}\n`
    prompt += `- 线上化程度：${stage0.onlineLevel || '未知'}\n`
    prompt += `- 竞争格局：${stage0.competition || '未知'}\n`
    prompt += `- 复购属性：${stage0.repurchase || '未知'}\n`
    prompt += `- 业务范围：${stage0.region || '未知'}\n`
    prompt += `- 核心痛点：${stage0.painPoint || '未知'}\n`
    prompt += `- 团队规模：${stage0.teamSize || '未知'}\n`
    prompt += `- 市场环境：${JSON.stringify(stage0.marketEnv?.features || {})}\n\n`
  }

  // 模块F
  if (founder) {
    prompt += `## 模块F：创始人能力诊断\n`
    prompt += `- 当前阶段：阶段${founder.stage?.stage}（${founder.stage?.name || '未知'}）\n`
    prompt += `- 当前角色：${founder.stage?.role || '未知'}\n`
    prompt += `- 应进化为：${founder.stage?.targetRole || '未知'}\n`
    if (founder.scores) {
      prompt += `- 能力雷达：\n`
      for (const [key, val] of Object.entries(founder.scores)) {
        prompt += `  - ${val.name || key}：${val.score}分\n`
      }
      prompt += `- 平均得分：${founder.average}分\n`
    }
    if (founder.strongest) {
      prompt += `- 最强能力：${founder.strongest}\n`
    }
    if (founder.weakest) {
      prompt += `- 最短板：${founder.weakest}\n`
    }
    prompt += '\n'
  }

  // 模块I
  if (rent) {
    prompt += `## 模块I：企业租评估\n`
    prompt += `- 劳动占比：${rent.laborPercent}%（依赖创始人个人）\n`
    prompt += `- 租占比：${rent.rentPercent}%（离开创始人还能转）\n\n`
  }

  // 阶段1
  if (scan) {
    prompt += `## 阶段1：快速扫描（6维度）\n`
    for (const [key, val] of Object.entries(scan.scores || {})) {
      prompt += `- ${val.label || key}：${val.score}分（${val.loopType || ''}）\n`
    }
    if (scan.loops) {
      prompt += `\n### 回路分析\n`
      prompt += `- 飞轮卡点（最弱增强回路）：${scan.loops.flywheel?.weakest?.label || '未知'}（${scan.loops.flywheel?.weakest?.score}分）\n`
      prompt += `- 天花板瓶颈（最弱调节回路）：${scan.loops.ceiling?.weakest?.label || '未知'}（${scan.loops.ceiling?.weakest?.score}分）\n`
    }
    prompt += '\n'
  }

  // 模块G
  if (ip) {
    prompt += `## 模块G：创始人IP诊断\n`
    prompt += `- IP适配度总分：${ip.totalScore}分\n`
    prompt += `- 适配度判定：${ip.judgment || '未知'}\n`
    prompt += `- 推荐形式：${ip.recommendedForm || '未知'}\n\n`
  }

  prompt += `---\n\n请根据以上诊断数据，生成完整的企业增长全景顾问报告。`
  prompt += `要求：\n`
  prompt += `1. 结合城市线级给出针对性建议\n`
  prompt += `2. 创始人能力分析要结合企业阶段（超级业务员→团队搭建者→组织建筑师→战略制定者）\n`
  prompt += `3. 回路分析要画出问题之间的因果闭环\n`
  prompt += `4. 每个改进建议要标注滞后效应（效果显现时间）\n`
  prompt += `5. 语言平实易懂，不要堆砌术语\n`
  prompt += `6. 输出必须是合法的 JSON 格式\n`

  return prompt
}

// AI 诊断主函数
export async function generateAIDiagnosis(diagnosisData) {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(diagnosisData)

  try {
    const result = await generateStructured({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      max_tokens: 4000
    })

    // 尝试解析 JSON
    try {
      // 清理可能的 markdown 代码块
      let cleaned = result.trim()
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      return JSON.parse(cleaned)
    } catch (parseError) {
      // 如果解析失败，返回原始文本
      return {
        rawText: result,
        parseError: parseError.message
      }
    }
  } catch (error) {
    throw new Error(`AI 诊断生成失败：${error.message}`)
  }
}

// 构建简版 AI 诊断提示（用于快速诊断）
export async function generateQuickDiagnosis(diagnosisData) {
  const { stage0, founder, scan } = diagnosisData

  let prompt = `你是一位企业增长全景顾问。请根据以下诊断数据，快速生成一份简洁的诊断报告（300字以内）。\n\n`

  if (stage0) {
    prompt += `企业：${stage0.city?.name}（${stage0.city?.tier}）· ${stage0.industry} · ${stage0.teamSize}\n`
    prompt += `核心痛点：${stage0.painPoint}\n\n`
  }

  if (founder) {
    prompt += `创始人阶段：阶段${founder.stage?.stage}（${founder.stage?.name}），能力平均得分：${founder.average}分\n\n`
  }

  if (scan) {
    prompt += `6维度评分：`
    for (const [key, val] of Object.entries(scan.scores || {})) {
      prompt += `${val.label || key}${val.score}分，`
    }
    prompt += '\n\n'
  }

  prompt += `请给出：\n1. 核心问题（1句话）\n2. 最优先行动（1条）\n3. 滞后预警（1条）`

  try {
    return await generateStructured({
      systemPrompt: '你是企业增长全景顾问，语言平实锋利，直接指出问题和解决方向。',
      userPrompt: prompt,
      temperature: 0.8,
      max_tokens: 500
    })
  } catch (error) {
    throw new Error(`快速诊断生成失败：${error.message}`)
  }
}
