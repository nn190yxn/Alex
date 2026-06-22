<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="beauty-xhs-form">
        <div class="form-group">
          <label class="form-label">项目/服务</label>
          <input v-model="form.product" type="text" class="form-input" placeholder="例如：补水护理、头皮养护、抗衰项目、日式美甲" />
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
          <label class="form-label">笔记目标</label>
          <select v-model="form.contentGoal" class="form-input">
            <option value="新客种草">新客种草</option>
            <option value="项目科普">项目科普</option>
            <option value="案例信任">案例信任</option>
            <option value="门店探店">门店探店</option>
            <option value="私信预约">私信预约</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">目标顾客</label>
          <input v-model="form.target" type="text" class="form-input" placeholder="例如：熬夜暗沉上班族、第一次做皮肤管理的新客" />
        </div>

        <div class="form-group">
          <label class="form-label">门店亮点</label>
          <input v-model="form.highlights" type="text" class="form-input" placeholder="例如：真人案例、专业检测、一次一客、老客复购率高" />
        </div>

        <div class="form-group">
          <label class="form-label">账号人设</label>
          <input v-model="form.persona" type="text" class="form-input" placeholder="例如：8年皮肤管理院长、头皮养护顾问、审美在线店长" />
        </div>

        <div class="form-group">
          <label class="form-label">内容类型</label>
          <select v-model="form.contentType" class="form-input">
            <option value="项目科普 + 私信预约">项目科普 + 私信预约</option>
            <option value="真人案例 + 信任建立">真人案例 + 信任建立</option>
            <option value="避坑指南 + 到店体验">避坑指南 + 到店体验</option>
            <option value="门店探店 + 新客权益">门店探店 + 新客权益</option>
            <option value="护理日常 + 老客复购">护理日常 + 老客复购</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">承接方式</label>
          <input v-model="form.conversionPath" type="text" class="form-input" placeholder="例如：私信发护理建议，加企微预约到店检测" />
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

const toolInfo = getToolByCode('xiaohongshu-beauty')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'beauty',
  platform: 'xiaohongshu',
  product: '',
  storeType: '皮肤管理',
  contentGoal: '新客种草',
  target: '',
  highlights: '',
  persona: '',
  contentType: '项目科普 + 私信预约',
  conversionPath: ''
})

async function handleSubmit() {
  if (!form.product) {
    result.value = { error: '请填写项目或服务' }
    return
  }

  try {
    result.value = await generateWithAI('xiaohongshu-beauty', form)
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.beauty-xhs-form { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
