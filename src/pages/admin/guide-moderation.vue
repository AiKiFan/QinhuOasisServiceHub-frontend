<!-- 攻略管理页 -->
<script setup>
import { onMounted, ref } from 'vue'
import {
  adminDeleteGuide,
  adminListGuides,
  adminPublishGuide,
  adminTakeDownGuide,
  getReviewEnabled,
  setReviewEnabled,
} from '@/api/guide'
import { getUser } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

const status = ref(undefined)
const type = ref(undefined)
const list = ref([])
const loading = ref(true)
const reviewEnabled = ref(true)
const statusFilters = [
  { value: undefined, label: '全部状态' },
  { value: 2, label: '审核中' },
  { value: 1, label: '已发布' },
  { value: 3, label: '已下架' },
]
const typeFilters = [
  { value: undefined, label: '全部类型' },
  { value: 1, label: '官方攻略' },
  { value: 2, label: '游客攻略' },
]

async function loadList() {
  loading.value = true
  try {
    const result = await adminListGuides(type.value, status.value, 1, 50)
    list.value = result?.list || []
  } finally {
    loading.value = false
  }
}

async function loadConfig() {
  try {
    const result = await getReviewEnabled()
    reviewEnabled.value = Boolean(result?.enabled)
  } catch {
    // 请求失败时保留默认值，统一错误提示由 request.js 处理。
  }
}

function changeStatus(value) {
  status.value = value
  loadList()
}

function changeType(value) {
  type.value = value
  loadList()
}

function statusText(value) {
  return ({ 0: '草稿', 1: '已发布', 2: '审核中', 3: '已下架' })[value] || '未知状态'
}

async function publish(item) {
  await adminPublishGuide(item.id)
  item.status = 1
  uni.showToast({ title: '已发布', icon: 'success' })
}

async function takeDown(item) {
  await adminTakeDownGuide(item.id)
  item.status = 3
  uni.showToast({ title: '已下架', icon: 'success' })
}

function remove(item) {
  uni.showModal({
    title: '删除攻略',
    content: '删除后将无法恢复，确定要删除吗？',
    success: async result => {
      if (!result.confirm) return
      await adminDeleteGuide(item.id)
      list.value = list.value.filter(value => value.id !== item.id)
      uni.showToast({ title: '删除成功', icon: 'success' })
    },
  })
}

async function toggleReview(event) {
  const enabled = event.detail.value
  await setReviewEnabled(enabled)
  reviewEnabled.value = enabled
  uni.showToast({ title: enabled ? '已开启审核' : '已关闭审核', icon: 'success' })
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/guide/detail?id=${id}` })
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: '攻略管理' })
  const user = getUser()
  if (!user || (user.role !== 2 && user.role !== 'admin')) {
    uni.showToast({ title: '仅管理员可访问', icon: 'none' })
    uni.reLaunch({ url: '/pages/index/index' })
    return
  }
  loadConfig()
  loadList()
})
</script>

<template>
  <view class="admin-page">
    <view class="config-card">
      <view><text class="config-title">游客攻略审核</text><text class="config-tip">开启后，游客发布攻略需要管理员审核</text></view>
      <switch :checked="reviewEnabled" color="#E8956D" @change="toggleReview" />
    </view>
    <scroll-view class="filter-scroll" scroll-x enable-flex>
      <view v-for="item in statusFilters" :key="String(item.value)" class="filter-item" :class="{ active: status === item.value }" @tap="changeStatus(item.value)">{{ item.label }}</view>
    </scroll-view>
    <scroll-view class="filter-scroll type-scroll" scroll-x enable-flex>
      <view v-for="item in typeFilters" :key="String(item.value)" class="filter-item" :class="{ active: type === item.value }" @tap="changeType(item.value)">{{ item.label }}</view>
    </scroll-view>
    <view v-if="loading" class="state">{{ t('common.loading') }}</view>
    <view v-else-if="list.length === 0" class="state">暂无攻略记录</view>
    <view v-else class="list">
      <view v-for="item in list" :key="item.id" class="review-card">
        <SafeImage class="cover" :src="item.coverImg" mode="aspectFill" />
        <view class="body" @tap="goDetail(item.id)">
          <view class="title-row"><text class="title">{{ item.displayTitle || item.title }}</text><text class="status">{{ statusText(item.status) }}</text></view>
          <text class="meta">{{ item.postType === 1 ? '官方攻略' : '游客攻略' }} · {{ item.authorNickname || '游客' }} · {{ (item.createTime || '').slice(0, 10) }}</text>
          <text class="summary">{{ item.summary || '暂无摘要' }}</text>
        </view>
        <view class="actions"><button v-if="item.status === 2 || item.status === 3" @tap="publish(item)">发布</button><button v-if="item.status === 1" @tap="takeDown(item)">下架</button><button class="danger" @tap="remove(item)">删除</button></view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';
.admin-page { min-height: 100vh; padding: 22rpx 24rpx; background: $color-bg-page; }.config-card { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; background: #fff; border-radius: 18rpx; box-shadow: 0 4rpx 14rpx rgba(108,71,49,.06); }.config-title, .config-tip { display: block; }.config-title { color: $color-text-primary; font-size: 28rpx; font-weight: 650; }.config-tip { margin-top: 8rpx; color: $color-text-hint; font-size: 22rpx; }.filter-scroll { white-space: nowrap; margin: 18rpx -8rpx 0; }.filter-item { display: inline-block; margin: 0 8rpx; padding: 13rpx 22rpx; border-radius: 28rpx; color: $color-text-secondary; background: #fff; font-size: 24rpx; }.filter-item.active { color: #fff; background: $color-primary; }.type-scroll { margin-top: 10rpx; }.list { margin-top: 20rpx; }.review-card { display: flex; flex-wrap: wrap; margin-bottom: 18rpx; padding: 18rpx; background: #fff; border-radius: 18rpx; box-shadow: 0 4rpx 14rpx rgba(108,71,49,.06); }.cover { flex: 0 0 150rpx; width: 150rpx; height: 150rpx; border-radius: 12rpx; }.body { flex: 1; min-width: 0; padding-left: 18rpx; }.title-row { display: flex; gap: 8rpx; justify-content: space-between; }.title { flex: 1; overflow: hidden; color: $color-text-primary; font-size: 27rpx; font-weight: 650; white-space: nowrap; text-overflow: ellipsis; }.status { color: $color-primary; font-size: 21rpx; }.meta, .summary { display: block; margin-top: 12rpx; overflow: hidden; color: $color-text-hint; font-size: 21rpx; white-space: nowrap; text-overflow: ellipsis; }.summary { color: $color-text-secondary; font-size: 23rpx; }.actions { display: flex; width: 100%; gap: 12rpx; margin-top: 16rpx; }.actions button { flex: 1; height: 58rpx; margin: 0; line-height: 58rpx; border-radius: 10rpx; color: $color-primary; background: #fff5ed; font-size: 22rpx; }.actions button.danger { color: #d65c4c; }.state { padding: 180rpx 0; text-align: center; color: $color-text-secondary; font-size: 27rpx; }
</style>
