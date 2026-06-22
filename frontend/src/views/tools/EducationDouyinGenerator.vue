<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="douyin-education-form">
        <div class="form-group">
          <label class="form-label">课程/服务</label>
          <input v-model="form.product" type="text" class="form-input" placeholder="例如：小学数学提分班、少儿篮球训练营" />
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
          <label class="form-label">短视频目标</label>
          <select v-model="form.videoGoal" class="form-input">
            <option value="同城招生获客">同城招生获客</option>
            <option value="老师IP建立信任">老师IP建立信任</option>
            <option value="试听课转化">试听课转化</option>
            <option value="直播引流预约">直播引流预约</option>
            <option value="课程成果展示">课程成果展示</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">出镜角色</label>
          <input v-model="form.persona" type="text" class="form-input" placeholder="例如：校长、主讲老师、体能教练、课程顾问" />
        </div>

        <div class="form-group">
          <label class="form-label">目标家长/学员</label>
          <input v-model="form.target" type="text" class="form-input" placeholder="例如：海淀三四年级数学薄弱学生家长" />
        </div>

        <div class="form-group">
          <label class="form-label">校区/课程亮点</label>
          <input v-model="form.highlights" type="text" class="form-input" placeholder="例如：小班教学、阶段测评、训练反馈、同城口碑" />
        </div>

        <div class="form-group">
          <label class="form-label">承接方式</label>
          <input v-model="form.conversionPath" type="text" class="form-input" placeholder="例如：评论关键词，私信领测评表，预约试听课" />
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

const toolInfo = getToolByCode('douyin-education')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'education',
  platform: 'douyin',
  product: '',
  subjectType: 'K12学科',
  videoGoal: '同城招生获客',
  persona: '',
  target: '',
  highlights: '',
  conversionPath: ''
})

async function handleSubmit() {
  if (!form.product) {
    result.value = { error: '请填写课程或服务' }
    return
  }

  try {
    const data = await generateWithAI('douyin-education', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.douyin-education-form {
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
