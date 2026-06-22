<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="restaurant-xhs-form">
        <div class="form-group">
          <label class="form-label">产品/门店卖点</label>
          <input v-model="form.product" type="text" class="form-input" placeholder="例如：低卡轻食套餐、重庆火锅锅底、手作奶茶新品、西餐约会套餐" />
        </div>

        <div class="form-group">
          <label class="form-label">餐饮品类</label>
          <select v-model="form.category" class="form-input">
            <option value="正餐">正餐</option>
            <option value="小吃">小吃</option>
            <option value="火锅">火锅</option>
            <option value="奶茶">奶茶</option>
            <option value="轻食">轻食</option>
            <option value="西式">西式</option>
            <option value="烧烤夜宵">烧烤夜宵</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">笔记目标</label>
          <select v-model="form.contentGoal" class="form-input">
            <option value="同城种草">同城种草</option>
            <option value="探店打卡">探店打卡</option>
            <option value="菜品种草">菜品种草</option>
            <option value="套餐转化">套餐转化</option>
            <option value="新品首发">新品首发</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">目标顾客</label>
          <input v-model="form.target" type="text" class="form-input" placeholder="例如：周末约会情侣、附近上班族、健身控、学生党" />
        </div>

        <div class="form-group">
          <label class="form-label">门店亮点</label>
          <input v-model="form.highlights" type="text" class="form-input" placeholder="例如：明档厨房、低脂高蛋白、现煮茶底、城市夜景、手工现包" />
        </div>

        <div class="form-group">
          <label class="form-label">内容类型</label>
          <select v-model="form.contentType" class="form-input">
            <option value="探店攻略 + 到店引导">探店攻略 + 到店引导</option>
            <option value="菜品种草 + 套餐推荐">菜品种草 + 套餐推荐</option>
            <option value="避坑指南 + 本地搜索">避坑指南 + 本地搜索</option>
            <option value="新品测评 + 评论互动">新品测评 + 评论互动</option>
            <option value="场景清单 + 预约转化">场景清单 + 预约转化</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">承接方式</label>
          <input v-model="form.conversionPath" type="text" class="form-input" placeholder="例如：评论发菜单，私信领团购券，门店 POI 下单" />
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

const toolInfo = getToolByCode('xiaohongshu-restaurant')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'restaurant',
  platform: 'xiaohongshu',
  product: '',
  category: '正餐',
  contentGoal: '同城种草',
  target: '',
  highlights: '',
  contentType: '探店攻略 + 到店引导',
  conversionPath: ''
})

async function handleSubmit() {
  if (!form.product) {
    result.value = { error: '请填写产品或门店卖点' }
    return
  }

  try {
    result.value = await generateWithAI('xiaohongshu-restaurant', form)
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.restaurant-xhs-form { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
