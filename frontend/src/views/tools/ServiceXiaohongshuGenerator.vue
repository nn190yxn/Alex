<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="service-xhs-form">
        <div class="form-group">
          <label class="form-label">服务/卖点</label>
          <input v-model="form.product" type="text" class="form-input" placeholder="例如：收纳整理、汽车贴膜、甲醛治理、婚礼策划、财税咨询" />
        </div>

        <div class="form-group">
          <label class="form-label">服务类型</label>
          <select v-model="form.category" class="form-input">
            <option value="到店服务">到店服务</option>
            <option value="上门服务">上门服务</option>
            <option value="项目服务">项目服务</option>
            <option value="车辆服务">车辆服务</option>
            <option value="专业服务">专业服务</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">笔记目标</label>
          <select v-model="form.contentGoal" class="form-input">
            <option value="同城种草">同城种草</option>
            <option value="案例信任">案例信任</option>
            <option value="避坑攻略">避坑攻略</option>
            <option value="报价咨询">报价咨询</option>
            <option value="预约转化">预约转化</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">目标客户</label>
          <input v-model="form.target" type="text" class="form-input" placeholder="例如：新房业主、周边车主、宝妈家庭、小微企业、备婚人群" />
        </div>

        <div class="form-group">
          <label class="form-label">服务亮点</label>
          <input v-model="form.highlights" type="text" class="form-input" placeholder="例如：报价透明、前后对比、师傅经验、流程标准、售后响应" />
        </div>

        <div class="form-group">
          <label class="form-label">内容类型</label>
          <select v-model="form.contentType" class="form-input">
            <option value="案例拆解 + 预约引导">案例拆解 + 预约引导</option>
            <option value="避坑清单 + 私信咨询">避坑清单 + 私信咨询</option>
            <option value="报价说明 + 需求收集">报价说明 + 需求收集</option>
            <option value="流程展示 + 信任建立">流程展示 + 信任建立</option>
            <option value="场景清单 + 复购转介绍">场景清单 + 复购转介绍</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">承接方式</label>
          <input v-model="form.conversionPath" type="text" class="form-input" placeholder="例如：评论发清单，私信发报价表，企微确认需求并预约" />
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

const toolInfo = getToolByCode('xiaohongshu-service')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'service',
  platform: 'xiaohongshu',
  product: '',
  category: '到店服务',
  contentGoal: '同城种草',
  target: '',
  highlights: '',
  contentType: '案例拆解 + 预约引导',
  conversionPath: ''
})

async function handleSubmit() {
  if (!form.product) {
    result.value = { error: '请填写服务或卖点' }
    return
  }

  try {
    result.value = await generateWithAI('xiaohongshu-service', form)
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.service-xhs-form { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
