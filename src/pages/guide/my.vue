<!-- 我的攻略页 -->
<script setup>
import { onMounted, ref } from 'vue'
import { deleteMyGuide, getMyGuides, setGuidePrivate } from '@/api/guide'
import { requireLogin } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

const list = ref([])
const loading = ref(true)

async function loadList() {
  loading.value = true
  try {
    const result = await getMyGuides(1, 50)
    list.value = result?.list || []
  } finally {
    loading.value = false
  }
}

function statusText(status) {
  return ({ 0: '草稿', 1: '已发布', 2: '审核中', 3: '已下架' })[status] || '未知状态'
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/guide/detail?id=${id}` })
}

function edit(id) {
  uni.navigateTo({ url: `/pages/guide/publish?id=${id}` })
}

async function togglePrivate(item) {
  const next = Number(item.isPrivate) !== 1
  await setGuidePrivate(item.id, next)
  item.isPrivate = next ? 1 : 0
  uni.showToast({ title: next ? '已设为私密' : '已设为公开', icon: 'success' })
}

function remove(item) {
  uni.showModal({
    title: '删除攻略',
    content: '删除后将无法恢复，确定要删除吗？',
    success: async result => {
      if (!result.confirm) return
      await deleteMyGuide(item.id)
      list.value = list.value.filter(value => value.id !== item.id)
      uni.showToast({ title: '删除成功', icon: 'success' })
    },
  })
}

function goPublish() {
  uni.navigateTo({ url: '/pages/guide/publish' })
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: '我的攻略' })
  if (requireLogin()) loadList()
})
</script>

<template>
  <view class="my-page">
    <view v-if="loading" class="state">{{ t('common.loading') }}</view>
    <view v-else-if="list.length === 0" class="state">
      <text class="state__icon">📝</text>
      <text>你还没有发布攻略</text>
      <button class="go-btn" @tap="goPublish">发布第一篇</button>
    </view>
    <view v-else class="my-list">
      <view v-for="item in list" :key="item.id" class="my-card" @tap="goDetail(item.id)">
        <SafeImage class="my-card__cover" :src="item.coverImg" mode="aspectFill" />
        <view class="my-card__body">
          <view class="line"><text class="title">{{ item.displayTitle || item.title }}</text><text class="status">{{ statusText(item.status) }}</text></view>
          <text class="summary">{{ item.summary || '记录一段难忘的沁湖旅程' }}</text>
          <view class="line bottom"><text class="private">{{ Number(item.isPrivate) === 1 ? '🔒 私密' : '🌐 公开' }}</text><text class="date">{{ (item.createTime || '').slice(0, 10) }}</text></view>
          <view class="actions" @tap.stop>
            <button v-if="item.status !== 1" @tap="edit(item.id)">编辑</button>
            <button @tap="togglePrivate(item)">{{ Number(item.isPrivate) === 1 ? '设为公开' : '设为私密' }}</button>
            <button class="danger" @tap="remove(item)">删除</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';
.my-page { min-height: 100vh; padding: 24rpx; background: $color-bg-page; }.my-card { display: flex; min-height: 190rpx; margin-bottom: 20rpx; overflow: hidden; background: #fff; border-radius: 20rpx; box-shadow: 0 5rpx 18rpx rgba(108,71,49,.07); }.my-card__cover { flex: 0 0 190rpx; width: 190rpx; height: 190rpx; }.my-card__body { flex: 1; min-width: 0; padding: 20rpx; }.line { display: flex; align-items: center; justify-content: space-between; gap: 10rpx; }.title { flex: 1; overflow: hidden; color: $color-text-primary; font-size: 28rpx; font-weight: 650; white-space: nowrap; text-overflow: ellipsis; }.status { flex-shrink: 0; color: $color-primary; font-size: 21rpx; }.summary { display: block; margin-top: 12rpx; overflow: hidden; color: $color-text-secondary; font-size: 23rpx; white-space: nowrap; text-overflow: ellipsis; }.bottom { margin-top: 18rpx; color: $color-text-hint; font-size: 21rpx; }.actions { display: flex; gap: 8rpx; margin-top: 16rpx; }.actions button { flex: 1; height: 52rpx; margin: 0; padding: 0 4rpx; line-height: 52rpx; border-radius: 10rpx; color: $color-text-secondary; background: #fff7f1; font-size: 20rpx; }.actions button.danger { color: #d65c4c; }.state { display: flex; flex-direction: column; align-items: center; padding-top: 180rpx; color: $color-text-secondary; font-size: 28rpx; }.state__icon { margin-bottom: 18rpx; font-size: 70rpx; }.go-btn { height: 72rpx; margin-top: 26rpx; line-height: 72rpx; border-radius: 36rpx; color: #fff; background: $color-primary; font-size: 25rpx; }
</style>
