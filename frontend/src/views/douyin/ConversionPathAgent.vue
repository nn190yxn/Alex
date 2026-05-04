<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🔗 转化链路优化</h1>
      <p class="agent-desc">团购/私信/企微 SOP 检查表</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">转化场景</label>
            <select v-model="form.scenario" class="form-input">
              <option value="group-buy">团购转化（到店核销）</option>
              <option value="private-msg">私信留资（加微信）</option>
              <option value="wechat">企微导流（私域运营）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">行业</label>
            <select v-model="form.industry" class="form-input">
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" style="width:100%; margin-top:20px;">
          生成 SOP 检查表
        </button>

        <div v-if="result" class="result-state">
          <div class="funnel-overview">
            <h3>转化链路全貌</h3>
            <div class="funnel-flow">
              <div v-for="(step, i) in result.funnel" :key="i" class="funnel-node">
                <div class="node-num">{{ i + 1 }}</div>
                <div class="node-label">{{ step.label }}</div>
                <div class="node-desc">{{ step.desc }}</div>
              </div>
            </div>
          </div>

          <div class="checklist">
            <h3>SOP 检查清单</h3>
            <div v-for="(item, i) in result.checklist" :key="i" class="check-item" @click="item.done = !item.done">
              <span class="check-box" :class="{ checked: item.done }">{{ item.done ? '✓' : '' }}</span>
              <span class="check-text">{{ item.text }}</span>
            </div>
          </div>

          <div class="warning-box">
            <h3>⚠️ 2026 合规提醒</h3>
            <ul>
              <li>严禁在视频中直接展示微信号/手机号</li>
              <li>必须通过官方组件（团购/私信/企业号）收集客资</li>
              <li>私信自动回复需符合平台规范，不得诱导违规留资</li>
              <li>留资表单需包含隐私协议勾选</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const result = ref(null)
const form = reactive({ scenario: 'group-buy', industry: 'restaurant' })

const generate = () => {
  let funnel, checklist

  if (form.scenario === 'group-buy') {
    funnel = [
      { label: '视频种草', desc: '内容激发兴趣，挂载团购组件' },
      { label: '点击组件', desc: '用户点击左下角/评论区团购链接' },
      { label: '浏览详情', desc: '查看套餐内容、评价、门店信息' },
      { label: '下单购买', desc: '完成支付，获得核销码' },
      { label: '到店核销', desc: '顾客到店消费，完成核销' }
    ]
    checklist = [
      { text: '团购套餐标题是否包含核心卖点？（如"招牌""必点"）', done: false },
      { text: '套餐图片是否高清、诱人、突出主菜？', done: false },
      { text: '是否设置了原价对比（划掉价 vs 现价）？', done: false },
      { text: '团购详情页是否包含门店地址、营业时间、预约方式？', done: false },
      { text: '视频结尾是否有明确的行动引导？（"左下角抢购"）', done: false },
      { text: '是否设置了限量/限时增加紧迫感？', done: false },
      { text: '评论区是否置顶了团购引导评论？', done: false },
      { text: '私信自动回复是否包含团购链接？', done: false },
      { text: '核销率是否 > 70%？低于此值需优化体验', done: false },
      { text: '是否有顾客评价管理（好评回复/差评处理）？', done: false }
    ]
  } else if (form.scenario === 'private-msg') {
    funnel = [
      { label: '内容种草', desc: '视频/直播激发需求' },
      { label: '进入主页', desc: '点击头像进入主页查看简介' },
      { label: '发送私信', desc: '通过私信咨询详情' },
      { label: '自动回复', desc: '系统自动发送留资引导' },
      { label: '留资成功', desc: '用户提交电话/微信号' },
      { label: '跟进转化', desc: '销售团队跟进完成转化' }
    ]
    checklist = [
      { text: '主页简介是否包含"私信领取 XX"引导语？', done: false },
      { text: '私信自动回复是否设置（2 小时内响应）？', done: false },
      { text: '自动回复话术是否自然、不生硬？', done: false },
      { text: '是否使用官方留资组件而非直接留微信号？', done: false },
      { text: '私信关键词回复是否覆盖高频问题？', done: false },
      { text: '是否有专人负责私信回复（非纯机器）？', done: false },
      { text: '留资表单是否简洁（不超过 3 个字段）？', done: false },
      { text: '留资后是否有确认短信/微信添加提醒？', done: false },
      { text: '线索跟进 SOP 是否明确（24 小时内首次联系）？', done: false },
      { text: '是否记录线索来源（哪个视频/直播带来的）？', done: false }
    ]
  } else {
    funnel = [
      { label: '内容触达', desc: '视频/直播引导添加企微' },
      { label: '扫码添加', desc: '通过官方组件或私信发送企微二维码' },
      { label: '通过验证', desc: '企微自动通过并发送欢迎语' },
      { label: '标签管理', desc: '根据来源自动打标签分类' },
      { label: '社群运营', desc: '拉入对应社群持续培育' },
      { label: '复购转化', desc: '定期活动/推送促进复购' }
    ]
    checklist = [
      { text: '企微欢迎语是否个性化（包含用户称呼）？', done: false },
      { text: '是否设置了自动标签规则（来源/行业/意向）？', done: false },
      { text: '社群是否有明确的群规与价值输出？', done: false },
      { text: '是否定期推送有价值的内容（非纯广告）？', done: false },
      { text: '是否有会员等级/积分体系？', done: false },
      { text: '社群活动频率是否合理（每周 1-2 次）？', done: false },
      { text: '是否有专属客服一对一跟进高意向客户？', done: false },
      { text: '是否设置了流失预警（30 天未互动）？', done: false },
      { text: '企微朋友圈是否定期更新（每日 1-2 条）？', done: false },
      { text: '是否追踪从企微到成交的全链路数据？', done: false }
    ]
  }

  result.value = { funnel, checklist }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.result-state { margin-top: 24px; }
.funnel-overview h3, .checklist h3, .warning-box h3 { font-size: var(--text-body-lg); margin-bottom: 12px; }
.funnel-flow { display: flex; gap: 8px; margin-bottom: 24px; overflow-x: auto; }
.funnel-node { flex: 1; min-width: 120px; padding: 16px; background: var(--bg-subtle); border-radius: 8px; text-align: center; position: relative; }
.node-num { width: 28px; height: 28px; background: var(--brand-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-bold); margin: 0 auto 8px; font-size: var(--text-caption); }
.node-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: 4px; }
.node-desc { font-size: var(--text-caption); color: var(--text-muted); }
.check-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--bg-subtle); border-radius: 8px; margin-bottom: 8px; cursor: pointer; }
.check-box { width: 24px; height: 24px; border: 2px solid var(--border); border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: var(--font-weight-bold); color: var(--brand-primary); }
.check-box.checked { background: var(--brand-primary); border-color: var(--brand-primary); color: white; }
.check-text { font-size: var(--text-body-sm); }
.warning-box { padding: 16px; background: #fef3c7; border-radius: 8px; margin-top: 20px; }
.warning-box ul { margin: 0; padding-left: 20px; }
.warning-box li { margin-bottom: 6px; font-size: var(--text-body-sm); color: #92400e; }
</style>
