<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="beauty-douyin-form">
        <div class="form-group">
          <label class="form-label">项目/服务</label>
          <input v-model="form.product" type="text" class="form-input" placeholder="例如：皮肤管理、头皮护理、抗衰项目、轻医美体验" />
        </div>

        <div class="form-group">
          <label class="form-label">门店类型</label>
          <select v-model="form.storeType" class="form-input">
            <option value="皮肤管理">皮肤管理</option>
            <option value="美容院">美容院</option>
            <option value="美发沙龙">美发沙龙</option>
            <option value="美甲美睫">美甲美睫</option>
            <option value="轻医美">轻医美</option>
            <option value="综合美业门店">综合美业门店</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">短视频目标</label>
          <select v-model="form.videoGoal" class="form-input">
            <option value="同城新客到店">同城新客到店</option>
            <option value="团购核销转化">团购核销转化</option>
            <option value="老板IP建立信任">老板IP建立信任</option>
            <option value="直播预约体验">直播预约体验</option>
            <option value="老客复购唤醒">老客复购唤醒</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">出镜角色</label>
          <input v-model="form.persona" type="text" class="form-input" placeholder="例如：院长、皮肤管理师、发型总监、店长顾问" />
        </div>

        <div class="form-group">
          <label class="form-label">目标顾客</label>
          <input v-model="form.target" type="text" class="form-input" placeholder="例如：25-40岁本地女性、婚前护理顾客、脱发焦虑男士" />
        </div>

        <div class="form-group">
          <label class="form-label">门店亮点</label>
          <input v-model="form.highlights" type="text" class="form-input" placeholder="例如：专业检测、真人案例、标准流程、私密服务、老客口碑" />
        </div>

        <div class="form-group">
          <label class="form-label">承接方式</label>
          <input v-model="form.conversionPath" type="text" class="form-input" placeholder="例如：评论关键词，私信发体验价，加企微预约到店" />
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

const toolInfo = getToolByCode('douyin-beauty')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'beauty',
  platform: 'douyin',
  product: '',
  storeType: '皮肤管理',
  videoGoal: '同城新客到店',
  persona: '',
  target: '',
  highlights: '',
  conversionPath: ''
})

async function handleSubmit() {
  if (!form.product) {
    result.value = { error: '请填写项目或服务' }
    return
  }

  try {
    result.value = await generateWithAI('douyin-beauty', form)
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.beauty-douyin-form { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
