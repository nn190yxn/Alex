<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🎨 封面文案助手</h1>
      <p class="agent-desc">数字型/悬念型/痛点型钩子词生成</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">视频主题</label>
            <input v-model="form.topic" class="form-input" placeholder="例如：双人套餐、美白护理" />
          </div>
          <div class="form-group">
            <label class="form-label">钩子类型</label>
            <select v-model="form.type" class="form-input">
              <option value="mixed">混合推荐</option>
              <option value="number">数字型（3 个/5 大）</option>
              <option value="suspense">悬念型（为什么/竟然）</option>
              <option value="pain">痛点型（别再/千万别）</option>
              <option value="contrast">对比型（之前 vs 之后）</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="!form.topic" style="width:100%; margin-top:20px;">
          生成封面文案
        </button>

        <div v-if="covers.length" class="covers-grid">
          <div v-for="(c, i) in covers" :key="i" class="cover-card">
            <div class="cover-type">{{ c.type }}</div>
            <h3 class="cover-text">{{ c.text }}</h3>
            <p class="cover-reason">{{ c.reason }}</p>
            <button class="copy-btn" @click="copyText(c.text)">复制</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const covers = ref([])
const form = reactive({ topic: '', type: 'mixed' })

const formulas = {
  number: [
    (t) => ({ type: '数字型', text: `${t}必看的 3 个技巧`, reason: '数字降低认知门槛，提升点击意愿' }),
    (t) => ({ type: '数字型', text: `90% 的人不知道的 5 个${t}真相`, reason: '高比例数字 + 悬念，激发好奇心' }),
    (t) => ({ type: '数字型', text: `${t}花 1 万买教训，总结出这 4 条`, reason: '损失数字 + 经验总结，提升信任感' })
  ],
  suspense: [
    (t) => ({ type: '悬念型', text: `为什么隔壁${t}天天排队？`, reason: '对比式悬念，引发好奇与焦虑' }),
    (t) => ({ type: '悬念型', text: `做${t}十年，我只敢说一次`, reason: '权威 + 稀缺，提升信任与期待' }),
    (t) => ({ type: '悬念型', text: `${t}行业最大的秘密，今天公开`, reason: '内幕型，吸引行业关注者' })
  ],
  pain: [
    (t) => ({ type: '痛点型', text: `别再被${t}骗了！`, reason: '否定式开头，强情绪钩子' }),
    (t) => ({ type: '痛点型', text: `${t}千万别这么干！`, reason: '命令式语气，制造紧迫感' }),
    (t) => ({ type: '痛点型', text: `选了 5 家${t}，这家最坑`, reason: '具体经历 + 负面情绪，引发共鸣' })
  ],
  contrast: [
    (t) => ({ type: '对比型', text: `99 元 vs 399 元，差距在哪？`, reason: '价格对比，制造价值悬念' }),
    (t) => ({ type: '对比型', text: `做${t}之前 vs 之后，差距太大了`, reason: '效果对比，直观展示价值' }),
    (t) => ({ type: '对比型', text: `同行不愿说的${t}真相`, reason: '信息差对比，建立权威感' })
  ]
}

const generate = () => {
  const type = form.type === 'mixed' ? ['number', 'suspense', 'pain', 'contrast'][Math.floor(Math.random() * 4)] : form.type
  covers.value = formulas[type].map(fn => fn(form.topic))
}

const copyText = (text) => {
  navigator.clipboard.writeText(text)
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.covers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-top: 24px; }
.cover-card { padding: 20px; background: var(--bg-subtle); border-radius: 12px; position: relative; }
.cover-type { display: inline-block; padding: 2px 10px; background: var(--brand-primary); color: white; border-radius: 12px; font-size: var(--text-caption); margin-bottom: 8px; }
.cover-text { font-size: var(--text-body-lg); font-weight: var(--font-weight-bold); margin-bottom: 8px; min-height: 48px; }
.cover-reason { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: 12px; }
.copy-btn { padding: 6px 16px; background: white; border: 1px solid var(--border-light); border-radius: 6px; cursor: pointer; font-size: var(--text-body-sm); }
</style>
