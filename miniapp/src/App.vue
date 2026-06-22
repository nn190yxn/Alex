<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { setLogoutHandler, initNetworkListener } from '@/utils/request'
import { useUserStore } from '@/store/user'

let globalRef = ''

onLaunch((options) => {
  const ref = options?.query?.ref || ''
  if (ref) {
    globalRef = ref
    uni.setStorageSync('ref_code', ref)
  }

  setLogoutHandler(() => {
    useUserStore().logout()
  })

  initNetworkListener()
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
