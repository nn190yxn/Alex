<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" :disabled="loading" @click="$router.back()">← 返回</button>
      <h1 class="agent-title">海报生成器</h1>
      <p class="agent-desc">8 大场景海报一键生成，智能匹配行业设计规范</p>
    </div>

    <div class="agent-content container">
      <!-- Error state -->
      <div v-if="initError" class="error-state">
        <p>{{ initError }}</p>
        <button class="generate-btn" @click="location.reload()">刷新页面</button>
      </div>

      <template v-else>
        <!-- Steps indicator -->
        <div class="steps-bar">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="step-item"
            :class="{ active: currentStep === index, done: currentStep > index }"
            @click="index < currentStep && goToStep(index)"
          >
            <span class="step-num">{{ index + 1 }}</span>
            <span class="step-label">{{ step }}</span>
          </div>
        </div>

        <!-- Step 1: Select Type -->
        <div v-if="currentStep === 0" class="wizard-panel">
          <h3 class="panel-title">选择海报类型</h3>
          <p class="panel-subtitle">根据您的使用场景选择合适的海报类型</p>

          <div class="type-grid">
            <div
              v-for="type in posterTypes"
              :key="type.code"
              class="type-card"
              :class="{ selected: selectedType === type.code }"
              @click="selectType(type.code)"
            >
              <span class="type-icon">{{ type.icon }}</span>
              <h4 class="type-name">{{ type.name }}</h4>
              <p class="type-desc">{{ type.description }}</p>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">所属行业</label>
            <div class="industry-row">
              <button
                v-for="ind in industries"
                :key="ind.key"
                class="industry-btn"
                :class="{ active: industry === ind.key }"
                @click="industry = ind.key"
              >
                {{ ind.label }}
              </button>
            </div>
          </div>

          <button class="generate-btn" :disabled="!selectedType" @click="currentStep = 1">
            下一步
          </button>
        </div>

        <!-- Step 2: Fill Requirements -->
        <div v-if="currentStep === 1" class="wizard-panel">
          <h3 class="panel-title">填写海报需求</h3>
          <p class="panel-subtitle">{{ posterTypeInfo?.name }} - 请填写以下信息</p>

          <div class="form-grid">
            <div v-for="field in posterTypeInfo?.formFields" :key="field.key" class="form-group">
              <label class="form-label">
                {{ field.label }}
                <span v-if="field.required" class="required-mark">*</span>
              </label>

              <input
                v-if="field.type === 'text'"
                v-model="formData[field.key]"
                :placeholder="field.placeholder || '请输入'"
                class="form-input"
                :class="{ 'is-invalid': formErrors[field.key] }"
              />

              <textarea
                v-else-if="field.type === 'textarea'"
                v-model="formData[field.key]"
                :placeholder="field.placeholder || '请输入（每行一个）'"
                class="form-input"
                :class="{ 'is-invalid': formErrors[field.key] }"
                rows="3"
              />

              <input
                v-else-if="field.type === 'date'"
                v-model="formData[field.key]"
                type="date"
                class="form-input"
                :class="{ 'is-invalid': formErrors[field.key] }"
              />

              <input
                v-else-if="field.type === 'number'"
                v-model.number="formData[field.key]"
                type="number"
                :placeholder="field.placeholder"
                class="form-input"
                :class="{ 'is-invalid': formErrors[field.key] }"
              />

              <select
                v-else-if="field.type === 'select'"
                v-model="formData[field.key]"
                class="form-input"
                :class="{ 'is-invalid': formErrors[field.key] }"
              >
                <option value="">请选择</option>
                <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>

              <span v-if="formErrors[field.key]" class="error-text">{{ formErrors[field.key] }}</span>
            </div>
          </div>

          <div class="btn-row">
            <button class="secondary-btn" :disabled="loading" @click="currentStep = 0">上一步</button>
            <button class="generate-btn" :disabled="loading" @click="generatePrompt">生成提示词</button>
          </div>
        </div>

        <!-- Step 3: Confirm Prompt -->
        <div v-if="currentStep === 2" class="wizard-panel">
          <h3 class="panel-title">确认提示词</h3>
          <p class="panel-subtitle">AI 将根据以下结构化提示词生成海报方案</p>

          <!-- Output structure preview -->
          <div class="structure-preview" v-if="promptStructure">
            <div class="structure-section">
              <h4 class="structure-title">一、文案内容</h4>
              <div class="structure-items">
                <div
                  v-for="item in promptStructure.outputSections"
                  :key="item.key"
                  class="structure-item"
                >
                  <span class="item-label">{{ item.label }}</span>
                  <span class="item-desc">{{ item.desc }}</span>
                </div>
              </div>
            </div>

            <div class="structure-section">
              <h4 class="structure-title">二、设计建议</h4>
              <div class="structure-items">
                <div
                  v-for="item in promptStructure.designAdvice"
                  :key="item.key"
                  class="structure-item"
                >
                  <span class="item-label">{{ item.label }}</span>
                  <span class="item-desc">{{ item.desc }}</span>
                </div>
              </div>
            </div>

            <div class="structure-section">
              <h4 class="structure-title">三、图片建议</h4>
              <div class="structure-items">
                <div
                  v-for="item in promptStructure.imageAdvice"
                  :key="item.key"
                  class="structure-item"
                >
                  <span class="item-label">{{ item.label }}</span>
                  <span class="item-desc">{{ item.desc }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Full prompt text (collapsible) -->
          <details class="prompt-details">
            <summary class="prompt-summary">查看完整提示词</summary>
            <div class="prompt-box">
              <pre>{{ generatedPrompt }}</pre>
            </div>
          </details>

          <div class="prompt-meta" v-if="promptMeta">
            <span>类型：{{ promptMeta.posterTypeName }}</span>
            <span>行业：{{ promptMeta.industryName }}</span>
            <span>知识库：{{ promptMeta.kbFilesUsed?.length || 0 }} 文件</span>
            <span>模式：{{ promptMeta.retrievalMode === 'mapping_only' ? '映射检索' : '双通道检索' }}</span>
          </div>

          <div class="btn-row">
            <button class="secondary-btn" :disabled="loading" @click="currentStep = 1">修改需求</button>
            <button class="generate-btn" :disabled="loading" @click="generatePoster">生成海报方案</button>
          </div>
        </div>

        <!-- Step 4: Result -->
        <div v-if="currentStep === 3" class="wizard-panel">
          <h3 class="panel-title">海报方案</h3>
          <p class="panel-subtitle">{{ posterTypeName }} - 生成完成</p>

          <div class="result-tabs">
            <button
              class="result-tab"
              :class="{ active: activeTab === 'copywriting' }"
              @click="activeTab = 'copywriting'"
            >
              文案内容
            </button>
            <button
              class="result-tab"
              :class="{ active: activeTab === 'design' }"
              @click="activeTab = 'design'"
            >
              设计建议
            </button>
            <button
              class="result-tab"
              :class="{ active: activeTab === 'image' }"
              @click="activeTab = 'image'"
            >
              图片建议
            </button>
            <button
              class="result-tab"
              :class="{ active: activeTab === 'raw' }"
              @click="activeTab = 'raw'"
            >
              完整原文
            </button>
          </div>

          <!-- Copywriting tab -->
          <div v-if="activeTab === 'copywriting'" class="result-panel">
            <div v-if="parsedContent.copywriting.length > 0" class="copywriting-list">
              <div
                v-for="item in parsedContent.copywriting"
                :key="item.label"
                class="copy-item"
              >
                <div class="copy-label">{{ item.label }}</div>
                <div class="copy-value" :class="{ 'is-headline': item.key === 'headline' }">
                  {{ item.value }}
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>未解析到结构化文案，请查看"完整原文"标签</p>
            </div>
          </div>

          <!-- Design tab -->
          <div v-if="activeTab === 'design'" class="result-panel">
            <div v-if="parsedContent.design.length > 0" class="design-grid">
              <div v-for="item in parsedContent.design" :key="item.label" class="design-card">
                <h4 class="design-label">{{ item.label }}</h4>
                <pre class="design-value">{{ item.value }}</pre>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>未解析到设计建议，请查看"完整原文"标签</p>
            </div>
          </div>

          <!-- Image tab -->
          <div v-if="activeTab === 'image'" class="result-panel">
            <div v-if="parsedContent.image.length > 0" class="design-grid">
              <div v-for="item in parsedContent.image" :key="item.label" class="design-card">
                <h4 class="design-label">{{ item.label }}</h4>
                <pre class="design-value">{{ item.value }}</pre>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>未解析到图片建议，请查看"完整原文"标签</p>
            </div>
          </div>

          <!-- Raw tab -->
          <div v-if="activeTab === 'raw'" class="result-panel">
            <pre v-if="rawContent" class="raw-content">{{ rawContent }}</pre>
            <div v-else class="empty-state">
              <p>暂无原始内容</p>
            </div>
          </div>

          <div class="btn-row">
            <button class="secondary-btn" @click="resetForm">重新生成</button>
            <button class="generate-btn" @click="copyResult">{{ copyBtnText }}</button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ loadingMessage }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import request from '@/api/request'

const steps = ['选择类型', '填写需求', '确认提示词', '生成方案']
const currentStep = ref(0)
const selectedType = ref('')
const industry = ref('catering')
const formData = reactive({})
const formErrors = reactive({})
const posterTypes = ref([])
const loading = ref(false)
const loadingMessage = ref('')
const initError = ref('')
const copyBtnText = ref('复制方案')

const generatedPrompt = ref('')
const promptMeta = ref(null)
const promptStructure = ref(null)
const rawContent = ref('')
const posterTypeName = ref('')
const activeTab = ref('copywriting')
const parsedContent = reactive({
  copywriting: [],
  design: [],
  image: []
})

const industries = [
  { key: 'catering', label: '餐饮' },
  { key: 'beauty', label: '美业' },
  { key: 'education', label: '教培' },
  { key: 'service', label: '服务' }
]

const posterTypeInfo = computed(() => {
  return posterTypes.value.find(t => t.code === selectedType.value)
})

onMounted(async () => {
  try {
    const res = await request.get('/generate/poster/types')
    if (res.success && Array.isArray(res.data)) {
      posterTypes.value = res.data
    } else {
      initError.value = '获取海报类型数据异常'
    }
  } catch (err) {
    console.error('获取海报类型失败:', err)
    initError.value = '加载海报类型失败，请刷新页面重试'
  }
})

function goToStep(step) {
  currentStep.value = step
}

function selectType(code) {
  if (selectedType.value !== code) {
    selectedType.value = code
    for (const key in formData) delete formData[key]
    for (const key in formErrors) delete formErrors[key]
  }
}

async function generatePrompt() {
  const fields = posterTypeInfo.value?.formFields || []

  // Clear previous errors
  for (const key in formErrors) delete formErrors[key]

  // Validate required fields
  for (const field of fields) {
    if (field.required && !formData[field.key]) {
      formErrors[field.key] = `${field.label}为必填项`
      return
    }
  }

  loading.value = true
  loadingMessage.value = '正在生成提示词...'

  try {
    const res = await request.post('/generate/poster/prompt', {
      type: selectedType.value,
      industry: industry.value,
      formData: { ...formData }
    })

    if (!res.success || !res.data) {
      throw new Error('生成提示词结果异常')
    }

    generatedPrompt.value = res.data.prompt
    promptMeta.value = res.data.promptMeta
    promptStructure.value = res.data.promptStructure
    currentStep.value = 2
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message || '生成提示词失败'
    if (err.response?.status === 403) {
      alert(`${errorMsg}，请升级会员后使用`)
    } else {
      alert(errorMsg)
    }
  } finally {
    loading.value = false
  }
}

async function generatePoster() {
  loading.value = true
  loadingMessage.value = '正在生成海报方案，预计需要 10-30 秒...'

  try {
    const res = await request.post('/generate/poster/generate', {
      type: selectedType.value,
      industry: industry.value,
      formData: { ...formData },
      prompt: generatedPrompt.value
    })

    if (!res.success || !res.data) {
      throw new Error('生成结果异常')
    }

    const { content, posterTypeName: typeName } = res.data

    if (!content) {
      throw new Error('生成内容为空，请重试')
    }

    rawContent.value = content
    posterTypeName.value = typeName || posterTypeInfo.value?.name || '海报方案'

    parsedContent.copywriting = []
    parsedContent.design = []
    parsedContent.image = []

    const structure = promptStructure.value || res.data.promptStructure
    if (structure && typeof content === 'string') {
      parseStructuredContent(content, structure)
    } else if (typeof content === 'object' && content !== null) {
      for (const key in content) {
        const section = findSectionByKey(key)
        if (section) {
          section.push({ key, label: key, value: content[key] })
        }
      }
    }

    activeTab.value = 'copywriting'
    currentStep.value = 3
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message || '生成海报方案失败'
    if (err.response?.status === 403) {
      alert(`${errorMsg}，请升级会员后使用`)
    } else {
      alert(errorMsg)
    }
  } finally {
    loading.value = false
  }
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseStructuredContent(content, structure) {
  // Parse copywriting sections
  for (const section of structure.outputSections) {
    const escapedLabel = escapeRegExp(section.label)
    const patterns = [
      new RegExp(`${escapedLabel}[：:]\s*([^\n#]+)`, 'i'),
      new RegExp(`\\*\\*${escapedLabel}\\*\\*[：:]?\s*([^\n#]+)`, 'i'),
      new RegExp(`-\s*${escapedLabel}[：:]?\s*([^\n#]+)`, 'i')
    ]

    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match) {
        parsedContent.copywriting.push({
          key: section.key,
          label: section.label,
          value: match[1].trim()
        })
        break
      }
    }
  }

  // Parse design sections
  const designSection = content.match(/二、设计建议[：:]?\s*\n([\s\S]*?)(?=三、图片建议|$)/i)
  if (designSection && structure.designAdvice) {
    for (const item of structure.designAdvice) {
      const escapedLabel = escapeRegExp(item.label)
      const pattern = new RegExp(`${escapedLabel}[：:]\s*([^\n-]+)`, 'i')
      const match = designSection[1].match(pattern)
      if (match) {
        parsedContent.design.push({
          key: item.key,
          label: item.label,
          value: match[1].trim()
        })
      }
    }
  }

  // Parse image sections
  const imageSection = content.match(/三、图片建议[：:]?\s*\n([\s\S]*?)$/i)
  if (imageSection && structure.imageAdvice) {
    for (const item of structure.imageAdvice) {
      const escapedLabel = escapeRegExp(item.label)
      const pattern = new RegExp(`${escapedLabel}[：:]\s*([^\n-]+)`, 'i')
      const match = imageSection[1].match(pattern)
      if (match) {
        parsedContent.image.push({
          key: item.key,
          label: item.label,
          value: match[1].trim()
        })
      }
    }
  }
}

function findSectionByKey(key) {
  if (!promptStructure.value) return null

  const sections = promptStructure.value
  if (sections.outputSections) {
    for (const item of sections.outputSections) {
      if (item.key === key) return parsedContent.copywriting
    }
  }
  if (sections.designAdvice) {
    for (const item of sections.designAdvice) {
      if (item.key === key) return parsedContent.design
    }
  }
  if (sections.imageAdvice) {
    for (const item of sections.imageAdvice) {
      if (item.key === key) return parsedContent.image
    }
  }
  return null
}

function resetForm() {
  selectedType.value = ''
  industry.value = 'catering'
  for (const key in formData) delete formData[key]
  for (const key in formErrors) delete formErrors[key]
  generatedPrompt.value = ''
  promptMeta.value = null
  promptStructure.value = null
  rawContent.value = ''
  posterTypeName.value = ''
  activeTab.value = 'copywriting'
  parsedContent.copywriting = []
  parsedContent.design = []
  parsedContent.image = []
  copyBtnText.value = '复制方案'
  currentStep.value = 0
}

function copyResult() {
  const text = rawContent.value || JSON.stringify(parsedContent, null, 2)
  navigator.clipboard.writeText(text).then(() => {
    copyBtnText.value = '已复制'
    setTimeout(() => { copyBtnText.value = '复制方案' }, 2000)
  }).catch(() => {
    alert('复制失败，请手动选择复制')
  })
}
</script>

<style scoped>
.agent-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24px 0;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
}

.agent-header {
  margin-bottom: 24px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.back-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #334155;
}

.back-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.agent-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px;
}

.agent-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.steps-bar {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
  padding: 12px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  overflow-x: auto;
}

@media (max-width: 600px) {
  .steps-bar {
    justify-content: flex-start;
  }
  .step-label {
    display: none;
  }
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  color: #94a3b8;
  cursor: default;
  transition: all 0.2s;
}

.step-item.active {
  background: #eff6ff;
  color: #3b82f6;
  font-weight: 600;
}

.step-item.done {
  color: #22c55e;
  cursor: pointer;
}

.step-item.done:hover {
  background: #f0fdf4;
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.step-item.active .step-num {
  background: #3b82f6;
  color: #fff;
}

.step-item.done .step-num {
  background: #22c55e;
  color: #fff;
}

.wizard-panel {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px;
}

.panel-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 24px;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.type-card {
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.type-card:hover {
  border-color: #93c5fd;
  background: #f8fafc;
}

.type-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.type-icon {
  font-size: 28px;
  display: block;
  margin-bottom: 8px;
}

.type-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px;
}

.type-desc {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.required-mark {
  color: #ef4444;
  margin-left: 2px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.is-invalid {
  border-color: #ef4444;
}

.error-text {
  display: block;
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
}

.industry-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.industry-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.industry-btn:hover {
  border-color: #93c5fd;
}

.industry-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #3b82f6;
  font-weight: 500;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.btn-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
}

.secondary-btn {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.generate-btn {
  padding: 10px 24px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn:hover:not(:disabled) {
  background: #2563eb;
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.structure-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.structure-section {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}

.structure-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 12px;
}

.structure-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.structure-item {
  padding: 8px;
  background: #fff;
  border-radius: 6px;
}

.item-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.item-desc {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.prompt-details {
  margin-bottom: 16px;
}

.prompt-summary {
  font-size: 14px;
  color: #3b82f6;
  cursor: pointer;
  font-weight: 500;
}

.prompt-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.prompt-box pre {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #374151;
}

.prompt-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
}

.result-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.result-tab {
  padding: 10px 16px;
  border: none;
  background: none;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.result-tab:hover {
  color: #3b82f6;
}

.result-tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  font-weight: 500;
}

.result-panel {
  min-height: 200px;
}

.copywriting-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.copy-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.copy-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.copy-value {
  font-size: 15px;
  color: #1e293b;
  line-height: 1.6;
}

.copy-value.is-headline {
  font-size: 20px;
  font-weight: 700;
  color: #3b82f6;
}

.design-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.design-card {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.design-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 8px;
}

.design-value {
  font-size: 14px;
  color: #374151;
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}

.raw-content {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #374151;
  max-height: 600px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.loading-state {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  margin-top: 16px;
  font-size: 14px;
  color: #64748b;
}

.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #ef4444;
}

.error-state p {
  margin-bottom: 16px;
  font-size: 16px;
}
</style>
