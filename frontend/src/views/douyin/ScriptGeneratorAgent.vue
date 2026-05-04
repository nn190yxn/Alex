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

const loading = ref(false)
const script = ref(null)

const form = reactive({
  template: 'talking',
  duration: '30',
  topic: '',
  target: 'young'
})

const scriptTemplates = {
  talking: {
    title: '口播讲解型脚本',
    scenes: (topic, duration) => {
      const isShort = duration === '15'
      return [
        { time: '0-3s', action: '近景面对镜头，表情认真或惊讶', text: `别再${topic}了！90% 的人都做错了`, bgm: '悬疑音效起' },
        { time: isShort ? '3-10s' : '3-15s', action: '手持道具或指向背景板', text: '你以为 XX 是这样的，其实行业内根本不是这样', bgm: '节奏加快' },
        { time: isShort ? '10-15s' : '15-25s', action: '展示真实数据或对比图', text: '真正的高手都是这样做...', bgm: '重音强调' },
        ...(isShort ? [] : [
          { time: '25-30s', action: '指向屏幕下方或购物车', text: '想知道详细方案？左下角/评论区告诉你', bgm: '行动引导音效' }
        ])
      ]
    },
    tips: ['前 3 秒必须出钩子，语速要快', '眼神直视镜头，不要看提词器', '背景简洁，突出主体', '字幕用粗体高亮关键词']
  },
  story: {
    title: '剧情反转型脚本',
    scenes: (topic, duration) => [
      { time: '0-5s', action: '顾客进店，面露不满或疑问', text: '"你们家这个${topic}怎么这么贵？"', bgm: '日常环境音' },
      { time: '5-15s', action: '老板/员工微笑回应，开始展示', text: '"姐，您先看看我们用的材料/工艺..."', bgm: '轻快音乐' },
      { time: '15-25s', action: '顾客体验后表情惊喜', text: '"哇，确实不一样！这钱花得值！"', bgm: '惊喜音效' },
      { time: '25-30s', action: '画外音或字幕总结', text: '好的${topic}，值得这个价。点击左下角体验', bgm: '引导音效' }
    ],
    tips: ['顾客表情要自然，不要过度表演', '反转要快，不要拖沓', '最后 5 秒必须有行动引导', '可以加入真实顾客出镜增加信任感']
  },
  showcase: {
    title: '种草展示型脚本',
    scenes: (topic, duration) => [
      { time: '0-3s', action: '产品/服务特写镜头', text: '今天给大家种草一个我用了很久的${topic}', bgm: '轻松 BGM' },
      { time: '3-15s', action: '多角度展示细节/过程', text: '你看这个质地/工艺/环境，真的绝了', bgm: '节奏感 BGM' },
      { time: '15-25s', action: '使用效果对比/客户反馈', text: '用完/吃完之后，整个人都不一样了', bgm: '强调音效' },
      { time: '25-30s', action: '价格展示 + 行动引导', text: '现在只要 XX 元，链接在左下角', bgm: '紧迫感 BGM' }
    ],
    tips: ['光线要充足，产品要拍得清晰', '多用特写镜头展示细节', '加入真实使用场景增加代入感', '价格要放在最后制造期待']
  },
  comparison: {
    title: '对比评测型脚本',
    scenes: (topic, duration) => [
      { time: '0-5s', action: '左右分屏展示两种方案', text: '左边 99 元 vs 右边 399 元，差距到底在哪？', bgm: '悬念音效' },
      { time: '5-15s', action: '逐项对比材质/服务/效果', text: '首先看 XX，再对比 XX，差距很明显', bgm: '节奏 BGM' },
      { time: '15-25s', action: '展示最终效果差异', text: '贵的确实有贵的道理', bgm: '结论音效' },
      { time: '25-30s', action: '给出购买建议', text: '追求性价比选左边，要品质选右边', bgm: '引导音效' }
    ],
    tips: ['对比要客观，不要刻意贬低', '用分屏或剪辑手法强化对比', '数据要真实可验证', '最后给出明确选择建议']
  },
  tutorial: {
    title: '教程步骤型脚本',
    scenes: (topic, duration) => [
      { time: '0-3s', action: '展示最终成果', text: `${topic}的正确做法，建议收藏反复看`, bgm: '轻快 BGM' },
      { time: '3-10s', action: '第一步演示', text: '第一步：XX（关键细节说明）', bgm: '步骤提示音' },
      { time: '10-20s', action: '第二步演示', text: '第二步：XX（注意这个细节）', bgm: '步骤提示音' },
      { time: '20-30s', action: '第三步演示 + 成果展示', text: '第三步：XX，完成！学会了吗？', bgm: '完成音效' }
    ],
    tips: ['步骤要清晰，每步不超过 10 秒', '关键细节要用字幕或箭头标注', '语速适中，让观众能跟上', '结尾引导收藏提升长效权重']
  }
}

const generate = async () => {
  loading.value = true
  try {
    const template = scriptTemplates[form.template]
    const durationMap = { '15': '15', '30': '30', '60': '45' }
    script.value = {
      title: template.title,
      duration: form.duration,
      template: { talking: '口播', story: '剧情', showcase: '种草', comparison: '对比', tutorial: '教程' }[form.template],
      scenes: template.scenes(form.topic, form.duration),
      tips: template.tips
    }
  } catch (error) {
    console.error('生成失败:', error)
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
