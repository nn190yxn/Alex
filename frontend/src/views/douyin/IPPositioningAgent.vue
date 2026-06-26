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
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
        <div v-if="upgradeHint" class="upgrade-hint">{{ upgradeHint }}</div>

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
import request from '@/api/request'
const result = ref(null)
const errorMessage = ref('')
const upgradeHint = ref('')
const form = reactive({ industry: 'restaurant', personality: 'professional', experience: '5-10', goal: 'trust' })

const generate = async () => {
  errorMessage.value = ''
  upgradeHint.value = ''
  result.value = null
  try {
    const response = await request.post('/douyin/ip-positioning', form)
    result.value = response.result || response
    upgradeHint.value = response.upgradeHint || ''
  } catch (error) {
    errorMessage.value = error.message || 'IP 定位生成失败，请稍后重试'
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.upgrade-hint { margin-top: 16px; padding: 12px 16px; background: #fff7ed; color: #9a3412; border-radius: 8px; font-size: var(--text-body-sm); }
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
