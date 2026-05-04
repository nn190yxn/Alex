<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🌟 老板 IP 定位器</h1>
      <p class="agent-desc">性格 + 行业，生成人设标签与内容方向</p>
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
              <option value="service">生活服务</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">你的性格特质（选最接近的）</label>
            <select v-model="form.personality" class="form-input">
              <option value="professional">专业严谨型（技术流/专家）</option>
              <option value="friendly">亲和温暖型（贴心/关怀）</option>
              <option value="direct">直率豪爽型（真性情/敢说）</option>
              <option value="humorous">幽默风趣型（搞笑/段子）</option>
              <option value="storyteller">故事达人型（会讲/共情）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">从业年限</label>
            <select v-model="form.experience" class="form-input">
              <option value="3-5">3-5 年</option>
              <option value="5-10">5-10 年</option>
              <option value="10+">10 年以上</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">IP 目标</label>
            <select v-model="form.goal" class="form-input">
              <option value="trust">建立行业信任（专业背书）</option>
              <option value="traffic">获取同城流量（门店引流）</option>
              <option value="premium">打造高端人设（高客单价）</option>
              <option value="franchise">招商加盟（品牌扩张）</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" style="width:100%; margin-top:20px;">
          生成 IP 定位方案
        </button>

        <div v-if="result" class="result-state">
          <div class="ip-profile">
            <h3>🎯 IP 人设定位</h3>
            <div class="ip-name">{{ result.ipName }}</div>
            <p class="ip-slogan">Slogan："{{ result.slogan }}"</p>
          </div>

          <div class="ip-tags">
            <h3>人设标签</h3>
            <div class="tags">
              <span v-for="(tag, i) in result.tags" :key="i" class="tag">{{ tag }}</span>
            </div>
          </div>

          <div class="ip-content">
            <h3>内容方向（3 大支柱）</h3>
            <div v-for="(pillar, i) in result.pillars" :key="i" class="pillar-card">
              <h4>{{ pillar.name }}</h4>
              <p>{{ pillar.desc }}</p>
              <p class="pillar-example">示例：{{ pillar.example }}</p>
            </div>
          </div>

          <div class="ip-dos-donts">
            <div class="dos">
              <h3>✅ 应该做</h3>
              <ul><li v-for="(d, i) in result.dos" :key="i">{{ d }}</li></ul>
            </div>
            <div class="donts">
              <h3>❌ 不要做</h3>
              <ul><li v-for="(d, i) in result.donts" :key="i">{{ d }}</li></ul>
            </div>
          </div>

          <div class="upgrade-hint">
            <p>获取完整《老板 IP 年度内容日历》与《人设一致性检查工具》，请升级高阶会员</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const result = ref(null)
const form = reactive({ industry: 'restaurant', personality: 'professional', experience: '5-10', goal: 'trust' })

const generate = () => {
  const industryMap = { restaurant: '餐饮', beauty: '美业', education: '教培', service: '生活服务' }
  const personalityMap = {
    professional: { name: '专家型', slogan: '用专业说话，用数据证明', tags: ['技术流', '干货派', '行业权威'] },
    friendly: { name: '暖心理', slogan: '做你身边最懂 XX 的朋友', tags: ['贴心', '耐心', '可信赖'] },
    direct: { name: '真性情型', slogan: '敢说真话，敢揭行业内幕', tags: ['直率', '敢说', '反差萌'] },
    humorous: { name: '段子手型', slogan: '笑着笑着就学到了', tags: ['搞笑', '接地气', '记忆点强'] },
    storyteller: { name: '故事型', slogan: '每个顾客都有一个故事', tags: ['共情', '温暖', '真实'] }
  }

  const p = personalityMap[form.personality]
  const ind = industryMap[form.industry]

  result.value = {
    ipName: `${ind}行业${p.name}IP`,
    slogan: p.slogan,
    tags: p.tags,
    pillars: [
      { name: '专业知识输出', desc: '分享行业干货、技术解析、避坑指南', example: `${ind}行业 90% 的人都不知道的 3 个真相` },
      { name: '真实工作日常', desc: '展示幕后工作场景，建立真实感', example: `凌晨 4 点的${ind}人，你在做什么？` },
      { name: '顾客故事/案例', desc: '用真实案例证明专业与价值', example: `这位顾客来了 3 次，终于明白...` }
    ],
    dos: ['保持固定更新频率（每周 3-5 条）', '统一视觉风格（封面/字幕/着装）', '回复评论区互动，建立粉丝连接', '定期分享个人成长与学习经历'],
    donts: ['不要频繁更换人设风格', '不要过度营销，内容要大于广告', '不要与其他行业盲目对标', '不要忽视负面评论，要真诚回应']
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.result-state { margin-top: 24px; }
.ip-profile { text-align: center; padding: 24px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; margin-bottom: 20px; }
.ip-profile h3 { font-size: var(--text-h4); margin-bottom: 12px; }
.ip-name { font-size: var(--text-h3); font-weight: var(--font-weight-bold); margin-bottom: 8px; }
.ip-slogan { font-size: var(--text-body); color: var(--text-secondary); font-style: italic; }
.ip-tags { margin-bottom: 20px; }
.ip-tags h3, .ip-content h3 { font-size: var(--text-body-lg); margin-bottom: 12px; }
.tags { display: flex; gap: 8px; flex-wrap: wrap; }
.tag { padding: 6px 16px; background: #dbeafe; color: #2563eb; border-radius: 20px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.pillar-card { padding: 16px; background: var(--bg-subtle); border-radius: 8px; margin-bottom: 12px; }
.pillar-card h4 { font-size: var(--text-body); margin-bottom: 4px; }
.pillar-card p { font-size: var(--text-body-sm); color: var(--text-secondary); }
.pillar-example { color: var(--brand-primary); font-weight: var(--font-weight-semibold); }
.ip-dos-donts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
.dos, .donts { padding: 16px; border-radius: 8px; }
.dos { background: #d1fae5; }
.donts { background: #fee2e2; }
.dos h3, .donts h3 { font-size: var(--text-body); margin-bottom: 8px; }
.dos ul, .donts ul { margin: 0; padding-left: 20px; }
.dos li, .donts li { margin-bottom: 4px; font-size: var(--text-body-sm); }
</style>
