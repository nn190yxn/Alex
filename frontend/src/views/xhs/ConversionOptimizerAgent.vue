<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🔗 🔗 转化链路优化</h1>
      <p class="agent-desc">合规 SOP 检查，安全引流</p>
    </div>
    <div class="agent-content container">
      <div class="coming-soon">
        <div class="coming-soon-icon">🚧</div>
        <h2>智能体开发中</h2>
        <p>此模块正在进行深度开发与知识库对接，敬请期待。</p>
        <button class="btn-back" @click="$router.push('/xhs')">返回智能体矩阵</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
</script>
<style scoped>
@import '../agent-common.css';
.coming-soon { text-align: center; padding: 60px 20px; }
.coming-soon-icon { font-size: 64px; margin-bottom: 20px; }
.btn-back { padding: 12px 32px; background: #ff2442; color: white; border: none; border-radius: 8px; margin-top: 20px; cursor: pointer; }
</style>
