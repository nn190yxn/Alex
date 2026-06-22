<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="restaurant-douyin-form">
        <div class="form-group">
          <label class="form-label">产品/套餐</label>
          <input v-model="form.product" type="text" class="form-input" placeholder="例如：双人火锅套餐、招牌牛肉汉堡、轻食周卡、奶茶新品" />
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
          <label class="form-label">短视频目标</label>
          <select v-model="form.videoGoal" class="form-input">
            <option value="同城新客到店">同城新客到店</option>
            <option value="团购核销转化">团购核销转化</option>
            <option value="直播间成交">直播间成交</option>
            <option value="新品起量">新品起量</option>
            <option value="老客复购唤醒">老客复购唤醒</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">出镜角色</label>
          <input v-model="form.persona" type="text" class="form-input" placeholder="例如：老板、主理人、厨师长、店长、吧台伙伴" />
        </div>

        <div class="form-group">
          <label class="form-label">目标顾客</label>
          <input v-model="form.target" type="text" class="form-input" placeholder="例如：周边上班族、家庭聚餐、大学生、夜宵人群" />
        </div>

        <div class="form-group">
          <label class="form-label">门店亮点</label>
          <input v-model="form.highlights" type="text" class="form-input" placeholder="例如：现炒现做、锅底自熬、低卡配餐、手作鲜奶、露台空间" />
        </div>

        <div class="form-group">
          <label class="form-label">承接方式</label>
          <input v-model="form.conversionPath" type="text" class="form-input" placeholder="例如：评论团购，私信发套餐，抖音团购下单到店核销" />
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

const toolInfo = getToolByCode('douyin-restaurant')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'restaurant',
  platform: 'douyin',
  product: '',
  category: '正餐',
  videoGoal: '同城新客到店',
  persona: '',
  target: '',
  highlights: '',
  conversionPath: ''
})

async function handleSubmit() {
  if (!form.product) {
    result.value = { error: '请填写产品或套餐' }
    return
  }

  try {
    result.value = await generateWithAI('douyin-restaurant', form)
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.restaurant-douyin-form { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
