<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

// 存储分享参数，供注册页读取
let globalRef = ''

onLaunch((options) => {
  // 处理扫码进入或分享链接进入
  const ref = options?.query?.ref || ''
  if (ref) {
    globalRef = ref
    uni.setStorageSync('ref_code', ref)
  }
})

onShow((options) => {
  // 冷启动或热启动都可能带参数
  const ref = options?.query?.ref || ''
  if (ref) {
    globalRef = ref
    uni.setStorageSync('ref_code', ref)
  }
})

onHide(() => {
  // 页面隐藏，保持 ref 不清理
})
</script>

<style>
page {
  background-color: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
