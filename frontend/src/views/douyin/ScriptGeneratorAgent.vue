<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">📝 脚本生成器</h1>
      <p class="agent-desc">选模板，自动生成分镜脚本</p>
    </div>

    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">脚本模板</label>
            <select v-model="form.template" class="form-input">
              <option value="talking">口播讲解型</option>
              <option value="story">剧情反转型</option>
              <option value="showcase">种草展示型</option>
              <option value="comparison">对比评测型</option>
              <option value="tutorial">教程步骤型</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">视频时长</label>
            <select v-model="form.duration" class="form-input">
              <option value="15">15 秒以内（完播优先）</option>
              <option value="30">15-30 秒（信息密度型）</option>
              <option value="60">30-60 秒（深度讲解型）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">核心主题/产品</label>
            <input v-model="form.topic" class="form-input" placeholder="例如：双人套餐、美白护理、试听课程" />
          </div>
          <div class="form-group">
            <label class="form-label">目标人群</label>
            <select v-model="form.target" class="form-input">
              <option value="young">年轻白领（18-30）</option>
              <option value="family">家庭客群（30-45）</option>
              <option value="parent">学生家长（35-50）</option>
              <option value="universal">全年龄段</option>
            </select>
          </div>
        </div>

        <button class="generate-btn" @click="generate" :disabled="!form.topic" style="width:100%; margin-top:20px;">
          生成分镜脚本
        </button>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>AI 正在编写脚本...</p>
        </div>

        <div v-else-if="errorMessage" class="error-state">
          {{ errorMessage }}
        </div>

        <div v-else-if="script" class="script-result">
          <div class="script-header">
            <h3>{{ script.title }}</h3>
            <div class="script-meta">
              <span class="meta-tag">时长：{{ script.duration }}s</span>
              <span class="meta-tag">模板：{{ script.template }}</span>
            </div>
          </div>

          <div class="timeline">
            <div v-for="(scene, index) in script.scenes" :key="index" class="scene-card">
              <div class="scene-time">{{ scene.time }}</div>
              <div class="scene-content">
                <p class="scene-action"><strong>画面：</strong>{{ scene.action }}</p>
                <p class="scene-text"><strong>台词/字幕：</strong>{{ scene.text }}</p>
                <p v-if="scene.bgm" class="scene-bgm"><strong>BGM/音效：</strong>{{ scene.bgm }}</p>
              </div>
            </div>
          </div>

          <div class="script-tips">
            <h3>拍摄要点</h3>
            <ul>
              <li v-for="(tip, i) in script.tips" :key="i">{{ tip }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import request from '@/api/request'

const loading = ref(false)
const script = ref(null)
const errorMessage = ref('')

const form = reactive({
  template: 'talking',
  duration: '30',
  topic: '',
  target: 'young'
})

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await request.post('/douyin/script-generator', {
      topic: form.topic,
      format: form.template,
      duration: Number(form.duration),
      target: form.target
    })
    script.value = response.script
  } catch (error) {
    console.error('生成失败:', error)
    errorMessage.value = error.message || '生成失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 20px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.script-header { margin-bottom: 24px; }
.script-header h3 { font-size: var(--text-h4); margin-bottom: 8px; }
.script-meta { display: flex; gap: 8px; }
.meta-tag { padding: 4px 10px; background: var(--bg-subtle); border-radius: 12px; font-size: var(--text-caption); }
.timeline { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.scene-card { display: flex; gap: 16px; padding: 16px; background: var(--bg-subtle); border-radius: 8px; }
.scene-time { width: 60px; font-weight: var(--font-weight-bold); color: var(--brand-primary); font-size: var(--text-body-sm); flex-shrink: 0; }
.scene-content p { margin: 4px 0; font-size: var(--text-body-sm); color: var(--text-secondary); }
.scene-content strong { color: var(--text-main); }
.script-tips { padding: 16px; background: #fef3c7; border-radius: 8px; }
.script-tips h3 { font-size: var(--text-body-lg); margin-bottom: 8px; }
.script-tips ul { margin: 0; padding-left: 20px; }
.script-tips li { margin-bottom: 4px; font-size: var(--text-body-sm); color: #92400e; }
</style>
