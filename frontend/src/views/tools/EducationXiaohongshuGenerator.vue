<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="xhs-education-form">
        <div class="form-group">
          <label class="form-label">课程/服务</label>
          <input v-model="form.product" type="text" class="form-input" placeholder="例如：小学数学提分班、少儿美术体验课" />
        </div>

        <div class="form-group">
          <label class="form-label">教培科目</label>
          <select v-model="form.subjectType" class="form-input">
            <option value="K12学科">K12学科</option>
            <option value="艺术类">艺术类</option>
            <option value="体育类">体育类</option>
            <option value="语言类">语言类</option>
            <option value="科创类">科创类</option>
            <option value="托管/素养类">托管/素养类</option>
            <option value="职业教育">职业教育</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">笔记目标</label>
          <select v-model="form.contentGoal" class="form-input">
            <option value="招生获客">招生获客</option>
            <option value="试听转化">试听转化</option>
            <option value="家长信任">家长信任</option>
            <option value="成果展示">成果展示</option>
            <option value="课程科普">课程科普</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">目标家长/学员</label>
          <input v-model="form.target" type="text" class="form-input" placeholder="例如：三年级数学薄弱学生家长、4-8岁美术启蒙家庭" />
        </div>

        <div class="form-group">
          <label class="form-label">校区/课程亮点</label>
          <input v-model="form.highlights" type="text" class="form-input" placeholder="例如：小班教学、可视化反馈、阶段测评、同城口碑" />
        </div>

        <div class="form-group">
          <label class="form-label">账号人设</label>
          <input v-model="form.persona" type="text" class="form-input" placeholder="例如：10年小学数学老师、少儿美术校长、青少年体能教练" />
        </div>

        <div class="form-group">
          <label class="form-label">内容类型</label>
          <select v-model="form.contentType" class="form-input">
            <option value="痛点干货 + 试听转化">痛点干货 + 试听转化</option>
            <option value="课程科普 + 家长信任">课程科普 + 家长信任</option>
            <option value="学员成果 + 案例观察">学员成果 + 案例观察</option>
            <option value="课堂日常 + 老师IP">课堂日常 + 老师IP</option>
            <option value="资料领取 + 私域承接">资料领取 + 私域承接</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">承接方式</label>
          <input v-model="form.conversionPath" type="text" class="form-input" placeholder="例如：私信领测评表，加企微预约试听课" />
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateWithAI } from '@/api/tool'

const toolInfo = getToolByCode('xiaohongshu-education')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'education',
  platform: 'xiaohongshu',
  product: '',
  subjectType: 'K12学科',
  contentGoal: '招生获客',
  target: '',
  highlights: '',
  persona: '',
  contentType: '痛点干货 + 试听转化',
  conversionPath: ''
})

async function handleSubmit() {
  if (!form.product) {
    result.value = { error: '请填写课程或服务' }
    return
  }

  try {
    const data = await generateWithAI('xiaohongshu-education', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.xhs-education-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
