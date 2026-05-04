<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">📅 15 天速胜计划</h1>
      <p class="agent-desc">生成短期打法节奏表，快速见效</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">行业</label>
            <select v-model="form.industry" class="form-input">
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">核心目标</label>
            <select v-model="form.goal" class="form-input">
              <option value="traffic">快速起量（拉播放/涨粉）</option>
              <option value="conversion">团购转化（提核销）</option>
              <option value="leads">线索收集（留资/加微信）</option>
              <option value="live">直播预热（蓄水）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">每日更新频率</label>
            <select v-model="form.frequency" class="form-input">
              <option value="1">1 条/天</option>
              <option value="2">2 条/天</option>
              <option value="3">3 条/天</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">是否配合投流</label>
            <select v-model="form.adSupport" class="form-input">
              <option value="no">纯自然流量</option>
              <option value="dou">DOU+ 辅助</option>
              <option value="local">本地推投放</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" style="width:100%; margin-top:20px;">
          生成 15 天计划
        </button>

        <div v-if="plan" class="plan-result">
          <div class="plan-header">
            <h3>{{ plan.title }}</h3>
            <p>{{ plan.summary }}</p>
          </div>
          <div class="timeline">
            <div v-for="(phase, pi) in plan.phases" :key="pi" class="phase-group">
              <h4 class="phase-title">{{ phase.name }}</h4>
              <div v-for="(day, di) in phase.days" :key="di" class="day-card">
                <div class="day-num">Day {{ day.day }}</div>
                <div class="day-content">
                  <p><strong>动作：</strong>{{ day.action }}</p>
                  <p><strong>内容方向：</strong>{{ day.content }}</p>
                  <p v-if="day.ad"><strong>投流：</strong>{{ day.ad }}</p>
                  <p v-if="day.kpi"><strong>KPI：</strong>{{ day.kpi }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="upgrade-hint">
            <p>需要 90 天完整战略？预约专家 1v1 定制全案</p>
            <button class="upgrade-btn" @click="$router.push('/douyin/full-strategy')">查看 90 天周期战略</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const plan = ref(null)
const form = reactive({ industry: 'restaurant', goal: 'conversion', frequency: '1', adSupport: 'no' })

const generate = () => {
  const industryMap = { restaurant: '餐饮', beauty: '美业', education: '教培' }
  const goalMap = { traffic: '快速起量', conversion: '团购转化', leads: '线索收集', live: '直播预热' }

  plan.value = {
    title: `${industryMap[form.industry]}行业 15 天${goalMap[form.goal]}速胜计划`,
    summary: `本计划采用"测试-放大-收割"三阶段策略，配合每日${form.frequency}条更新${form.adSupport !== 'no' ? '与投流辅助' : ''}，快速验证内容模型并放量。`,
    phases: [
      {
        name: '第 1-5 天：测试期（验证内容模型）',
        days: [
          { day: 1, action: '发布第 1 条测试视频，选择知识科普型', content: '行业内幕/避坑指南类，测试完播率', ad: form.adSupport !== 'no' ? '投放 100 元 DOU+ 定向同城' : '', kpi: '完播率 > 25%' },
          { day: 2, action: '发布第 2 条，选择过程展示型', content: '后厨/服务过程/效果对比', ad: '', kpi: '点赞率 > 3%' },
          { day: 3, action: '分析前 2 条数据，确定优势内容方向', content: '根据数据反馈调整第 3 条选题', ad: '', kpi: '确定 1 个高潜力方向' },
          { day: 4, action: '发布第 3 条（优势方向深化）', content: '延续高数据表现的内容模板', ad: form.adSupport !== 'no' ? '对高数据视频追投 200 元' : '', kpi: '播放量 > 前两条均值' },
          { day: 5, action: '发布第 4 条，加入行动引导', content: '在结尾添加团购/留资引导话术', ad: '', kpi: '转化率 > 1%' }
        ]
      },
      {
        name: '第 6-10 天：放大期（赛马放量）',
        days: [
          { day: 6, action: '复制成功模板，批量制作 3 条同类内容', content: '同类型不同角度的变体', ad: form.adSupport !== 'no' ? '对跑量素材开启本地推' : '', kpi: '至少 1 条进入下一级流量池' },
          { day: 7, action: '发布第 5 条（爆款复制）', content: '使用已验证的钩子 + 结构', ad: '', kpi: '收藏率 > 5%' },
          { day: 8, action: '发布第 6 条（交叉测试新方向）', content: '尝试剧情/福利型内容', ad: '', kpi: '测试新方向可行性' },
          { day: 9, action: '复盘数据，淘汰低效内容类型', content: '聚焦 1-2 个高 ROI 方向', ad: form.adSupport !== 'no' ? '加大高转化素材预算' : '', kpi: '确定主力内容方向' },
          { day: 10, action: '发布第 7 条（主力方向深化）', content: '加入用户证言/案例背书', ad: '', kpi: '互动率提升 20%' }
        ]
      },
      {
        name: '第 11-15 天：收割期（转化变现）',
        days: [
          { day: 11, action: '发布第 8 条（强转化导向）', content: '限时套餐/福利+紧迫感话术', ad: form.adSupport !== 'no' ? '投放转化目标（下单/留资）' : '', kpi: '团购/留资数 > 10' },
          { day: 12, action: '发布第 9 条（信任背书）', content: '顾客好评/效果展示/资质证明', ad: '', kpi: '主页访问量提升' },
          { day: 13, action: '发布第 10 条（逼单型）', content: '最后一天/限量/涨价预告', ad: form.adSupport !== 'no' ? '最后冲刺投放' : '', kpi: '转化率 > 3%' },
          { day: 14, action: '全量数据复盘，总结 15 天成果', content: '对比起始数据，评估 ROI', ad: '', kpi: '整体目标达成率' },
          { day: 15, action: '制定下一周期计划', content: '固化成功 SOP，规划新内容方向', ad: '', kpi: '进入下一循环' }
        ]
      }
    ]
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.plan-result { margin-top: 24px; }
.plan-header { margin-bottom: 20px; }
.plan-header h3 { font-size: var(--text-h4); margin-bottom: 8px; }
.plan-header p { color: var(--text-secondary); }
.phase-group { margin-bottom: 20px; }
.phase-title { font-size: var(--text-body-lg); padding: 8px 16px; background: var(--brand-primary); color: white; border-radius: 8px; margin-bottom: 12px; }
.day-card { display: flex; gap: 16px; padding: 12px; background: var(--bg-subtle); border-radius: 8px; margin-bottom: 8px; }
.day-num { width: 60px; font-weight: var(--font-weight-bold); color: var(--brand-primary); flex-shrink: 0; }
.day-content p { margin: 2px 0; font-size: var(--text-body-sm); color: var(--text-secondary); }
.day-content strong { color: var(--text-main); }
</style>
