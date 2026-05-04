<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">✍️ 标题优化器</h1>
      <p class="agent-desc">输入原标题，AI 给出 5 个高点击率版本</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-group">
          <label class="form-label">当前标题</label>
          <input v-model="form.originalTitle" class="form-input" placeholder="输入你的原标题" maxlength="50" />
          <p class="char-count">{{ form.originalTitle.length }}/50</p>
        </div>
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
            <label class="form-label">标题风格偏好</label>
            <select v-model="form.style" class="form-input">
              <option value="mixed">混合推荐</option>
              <option value="number">数字型（3个技巧/5大误区）</option>
              <option value="pain">痛点型（别再XX了）</option>
              <option value="curiosity">悬念型（为什么XX）</option>
              <option value="benefit">利益型（XX元就能XX）</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="!form.originalTitle" style="width:100%; margin-top:20px;">
          生成 5 个优化标题
        </button>
        <div v-if="titles.length" class="titles-list">
          <div v-for="(t, i) in titles" :key="i" class="title-item">
            <div class="title-rank">{{ i + 1 }}</div>
            <div class="title-content">
              <h4>{{ t.text }}</h4>
              <p class="title-reason">{{ t.reason }}</p>
            </div>
            <button class="copy-btn" @click="copyTitle(t.text)">复制</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const titles = ref([])
const form = reactive({ originalTitle: '', industry: 'restaurant', style: 'mixed' })

const titleFormulas = {
  number: [
    (t) => ({ text: `${t.replace(/标题|XX|内容/, '')}的 3 个关键技巧，第 2 个 90% 的人不知道`, reason: '数字 + 稀缺性，激发好奇心' }),
    (t) => ({ text: `避开这 5 个坑，你的${t.slice(0, 4)}能多赚 30%`, reason: '具体数字 + 利益承诺' }),
    (t) => ({ text: `2026 年做${t.slice(0, 4)}，记住这 4 个字就够了`, reason: '年份 + 极简表达，降低认知门槛' })
  ],
  pain: [
    (t) => ({ text: `别再${t.replace(/标题|XX|内容/g, '').slice(0, 6)}了！90% 的老板都在踩这个坑`, reason: '否定式开头 + 数据支撑，强钩子' }),
    (t) => ({ text: `为什么你的${t.slice(0, 4)}没人来？问题出在这`, reason: '直接戳痛点，引发焦虑与好奇' }),
    (t) => ({ text: `花了 X 万买教训，${t.slice(0, 4)}千万别这么干`, reason: '损失厌恶心理，提升点击率' })
  ],
  curiosity: [
    (t) => ({ text: `为什么隔壁店${t.slice(0, 4)}天天排队，你家却没人？`, reason: '对比式悬念，引发好奇与焦虑' }),
    (t) => ({ text: `${t.slice(0, 4)}行业最大的秘密，今天公开`, reason: '内幕型标题，吸引行业关注者' }),
    (t) => ({ text: `做${t.slice(0, 4)}十年，我只敢说一次`, reason: '权威性 + 稀缺性，提升信任感' })
  ],
  benefit: [
    (t) => ({ text: `${t.slice(0, 4)}只要 9.9 元！同城限时福利，手慢无`, reason: '低价 + 紧迫感，直接促点击' }),
    (t) => ({ text: `花小钱办大事！${t.slice(0, 4)}这样选最划算`, reason: '利益导向，吸引价格敏感人群' }),
    (t) => ({ text: `月薪 5000 也能享受的${t.slice(0, 4)}，就在XX`, reason: '降低门槛，扩大受众范围' })
  ]
}

const generate = () => {
  const style = form.style === 'mixed' ? ['number', 'pain', 'curiosity', 'benefit'][Math.floor(Math.random() * 4)] : form.style
  const formulas = titleFormulas[style]
  const selectedFormulas = formulas.slice(0, 5)
  titles.value = selectedFormulas.map(fn => fn(form.originalTitle || '你的内容'))
}

const copyTitle = (text) => {
  navigator.clipboard.writeText(text)
}
</script>

<style scoped>
@import './agent-common.css';
.char-count { text-align: right; font-size: var(--text-caption); color: var(--text-muted); }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.titles-list { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
.title-item { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--bg-subtle); border-radius: 8px; }
.title-rank { width: 32px; height: 32px; background: var(--brand-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-bold); }
.title-content { flex: 1; }
.title-content h4 { font-size: var(--text-body); margin-bottom: 4px; }
.title-reason { font-size: var(--text-caption); color: var(--text-muted); }
.copy-btn { padding: 6px 16px; background: white; border: 1px solid var(--border-light); border-radius: 6px; cursor: pointer; font-size: var(--text-body-sm); }
</style>
