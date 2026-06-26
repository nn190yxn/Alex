<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">人设一致性检查</h1>
      <p class="agent-desc">抽检笔记标题与内容，评估语气、视觉和内容一致性</p>
    </div>

    <div class="agent-content container">
      <div class="form-panel">
        <div class="note-list">
          <div v-for="(note, index) in notes" :key="index" class="note-card">
            <div class="note-header">
              <strong>笔记 {{ index + 1 }}</strong>
              <button v-if="notes.length > 1" class="text-btn" @click="removeNote(index)">移除</button>
            </div>
            <input v-model="note.title" class="form-input" placeholder="笔记标题">
            <textarea v-model="note.content" class="form-input textarea" placeholder="笔记正文摘要、封面风格或表达方式"></textarea>
          </div>
        </div>
        <button class="secondary-btn" :disabled="notes.length >= 5" @click="addNote">添加笔记</button>
        <button class="generate-btn" :disabled="loading" @click="checkConsistency">
          {{ loading ? '正在检查...' : '检查一致性' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="score-header">
          <div>
            <h2>综合评分</h2>
            <p>{{ result.summary }}</p>
          </div>
          <div class="score-badge">{{ result.overallScore }}</div>
        </div>
        <div class="check-list">
          <div v-for="item in result.checks" :key="item.title" class="check-card">
            <h3>{{ item.title }}</h3>
            <div class="score-row">
              <span>语气 {{ item.toneScore }}</span>
              <span>视觉 {{ item.visualScore }}</span>
              <span>内容 {{ item.contentScore }}</span>
            </div>
            <p v-if="item.issues.length">问题：{{ item.issues.join('、') }}</p>
          </div>
        </div>
        <div class="tips-box">
          <h3>优化建议</h3>
          <ul><li v-for="tip in result.tips" :key="tip">{{ tip }}</li></ul>
        </div>
        <div class="upgrade-box">需要建立完整 IP 视觉规范、标题公式和内容栏目，可升级获取 1v1 定制方案。</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import request from '@/api/request'

const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')

const notes = reactive([
  { title: '敏感肌护肤避坑指南', content: '封面使用粉白色系，语气专业温和，正文以真实案例切入。' },
  { title: '熬夜后怎么快速修护', content: '封面使用产品特写，语气偏经验分享，正文强调步骤和注意事项。' }
])

const addNote = () => {
  if (notes.length >= 5) return
  notes.push({ title: '', content: '' })
}

const removeNote = (index) => {
  notes.splice(index, 1)
}

const checkConsistency = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/ip-consistency', {
      notes: notes.map(note => ({ title: note.title.trim(), content: note.content.trim() })).filter(note => note.title || note.content)
    })
    result.value = response.result
  } catch (error) {
    console.error('人设一致性检查失败:', error)
    errorMessage.value = error.message || '人设一致性检查失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import '../agent-common.css';
.agent-page { min-height: 100vh; background: #f8f9fa; padding-bottom: 60px; }
.agent-header { padding: 36px 16px 24px; }
.back-btn { border: none; background: transparent; color: #ff2442; cursor: pointer; margin-bottom: 16px; }
.agent-title { font-size: var(--text-h2); font-weight: var(--font-weight-bold); color: #333; margin-bottom: 8px; }
.form-panel, .result-card { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
.note-list, .check-list { display: grid; gap: 16px; }
.note-card, .check-card, .tips-box, .upgrade-box { padding: 16px; background: #f8fafc; border-radius: 8px; }
.note-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.text-btn { border: none; background: transparent; color: #ff2442; cursor: pointer; }
.form-input { width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px; }
.textarea { min-height: 90px; resize: vertical; }
.secondary-btn, .generate-btn { width: 100%; margin-top: 16px; padding: 12px; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.secondary-btn { background: #fff; color: #ff2442; border: 1px solid #ff2442; }
.generate-btn { background: #ff2442; color: white; border: none; }
.secondary-btn:disabled, .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.score-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.score-header h2 { font-size: var(--text-h4); margin-bottom: 8px; }
.score-header p, .check-card p { color: #666; }
.score-badge { width: 72px; height: 72px; border-radius: 50%; background: #ff2442; color: white; display: flex; align-items: center; justify-content: center; font-size: var(--text-h3); font-weight: var(--font-weight-bold); flex-shrink: 0; }
.check-card h3 { margin-bottom: 10px; }
.score-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.score-row span { padding: 4px 8px; border-radius: 999px; background: #fff; color: #ff2442; font-size: var(--text-caption); }
.tips-box, .upgrade-box { margin-top: 16px; }
.tips-box h3 { margin-bottom: 8px; }
.upgrade-box { background: #fff1f2; color: #be123c; }
ul { margin: 0; padding-left: 20px; color: #666; }
@media (max-width: 768px) { .score-header { flex-direction: column; } }
</style>
