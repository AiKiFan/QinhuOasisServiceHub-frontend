<!-- 攻略管理页 -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  adminDeleteGuide,
  adminListGuides,
  adminPublishGuide,
  adminTakeDownGuide,
  getReviewEnabled,
  setReviewEnabled,
} from '@/api/guide'
import { getUser } from '@/utils/auth'
import { getLanguage, t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

const status = ref(undefined)
const type = ref(undefined)
const list = ref([])
const loading = ref(true)
const reviewEnabled = ref(true)
const showDeleteConfirm = ref(false)
const currentLang = ref(getLanguage())
const deletingId = ref(null)
const statusFilters = computed(() => {
  currentLang.value
  return [
    { value: undefined, label: t('guide.admin.status.all') },
    { value: 2, label: t('guide.admin.status.reviewing') },
    { value: 1, label: t('guide.admin.status.published') },
    { value: 3, label: t('guide.admin.status.takenDown') },
  ]
})
const typeFilters = computed(() => {
  currentLang.value
  return [
    { value: undefined, label: t('guide.admin.type.all') },
    { value: 1, label: t('guide.admin.type.official') },
    { value: 2, label: t('guide.admin.type.tourist') },
  ]
})

function refreshLanguage() {
  currentLang.value = getLanguage()
  uni.setNavigationBarTitle({ title: t('guide.admin.title') })
}

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
  return ({
    0: t('guide.admin.status.draft'),
    1: t('guide.admin.status.published'),
    2: t('guide.admin.status.reviewing'),
    3: t('guide.admin.status.takenDown'),
  })[value] || t('guide.admin.status.unknown')
}

function statusClass(value) {
  return `status--${value}`
}

async function publish(item) {
  await adminPublishGuide(item.id)
  item.status = 1
  uni.showToast({ title: t('guide.admin.publishSuccess'), icon: 'success' })
}

async function takeDown(item) {
  await adminTakeDownGuide(item.id)
  item.status = 3
  uni.showToast({ title: t('guide.admin.takeDownSuccess'), icon: 'success' })
}

function remove(item) {
  deletingId.value = item.id
  showDeleteConfirm.value = true
}

async function handleDelete() {
  try {
    await adminDeleteGuide(deletingId.value)
    list.value = list.value.filter(value => value.id !== deletingId.value)
    uni.showToast({ title: t('guide.admin.deleteSuccess'), icon: 'success' })
  } finally {
    showDeleteConfirm.value = false
    deletingId.value = null
  }
}

async function toggleReview(event) {
  const enabled = event.detail.value
  await setReviewEnabled(enabled)
  reviewEnabled.value = enabled
  uni.showToast({ title: enabled ? t('guide.admin.reviewEnabled') : t('guide.admin.reviewDisabled'), icon: 'success' })
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/guide/detail?id=${id}` })
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('guide.admin.title') })
  const user = getUser()
  if (!user || (user.role !== 2 && user.role !== 'admin')) {
    uni.showToast({ title: t('guide.admin.onlyAdmin'), icon: 'none' })
    uni.reLaunch({ url: '/pages/index/index' })
    return
  }
  loadConfig()
  loadList()
})

onShow(() => {
  refreshLanguage()
})
</script>

<template>
  <view class="admin-page" :data-lang="currentLang">
    <view class="config-card">
      <view><text class="config-title">{{ t('guide.admin.reviewTitle') }}</text><text class="config-tip">{{ t('guide.admin.reviewTip') }}</text></view>
      <switch :checked="reviewEnabled" color="#E8956D" @change="toggleReview" />
    </view>
    <scroll-view class="filter-scroll" scroll-x enable-flex>
      <view v-for="item in statusFilters" :key="String(item.value)" class="filter-item" :class="{ active: status === item.value }" @tap="changeStatus(item.value)">{{ item.label }}</view>
    </scroll-view>
    <scroll-view class="filter-scroll type-scroll" scroll-x enable-flex>
      <view v-for="item in typeFilters" :key="String(item.value)" class="filter-item" :class="{ active: type === item.value }" @tap="changeType(item.value)">{{ item.label }}</view>
    </scroll-view>
    <view v-if="loading" class="state">{{ t('common.loading') }}</view>
    <view v-else-if="list.length === 0" class="state">{{ t('guide.admin.empty') }}</view>
    <view v-else class="list">
      <view v-for="item in list" :key="item.id" class="review-card">
        <SafeImage class="cover" :src="item.coverImg" mode="aspectFill" />
        <view class="body" @tap="goDetail(item.id)">
          <view class="title-row"><text class="title">{{ item.displayTitle || item.title }}</text><text class="status" :class="statusClass(item.status)">{{ statusText(item.status) }}</text></view>
          <text class="meta">{{ item.postType === 1 ? t('guide.admin.type.official') : t('guide.admin.type.tourist') }} · {{ item.authorNickname || t('guide.admin.authorFallback') }} · {{ (item.createTime || '').slice(0, 10) }}</text>
          <text class="summary">{{ item.summary || t('guide.admin.summaryFallback') }}</text>
        </view>
        <view class="actions"><button v-if="item.status === 2 || item.status === 3" class="action-btn action-btn--publish" @tap="publish(item)">{{ t('guide.admin.publish') }}</button><button v-if="item.status === 1" class="action-btn action-btn--takedown" @tap="takeDown(item)">{{ t('guide.admin.takeDown') }}</button><button class="action-btn action-btn--delete" @tap="remove(item)">{{ t('guide.admin.delete') }}</button></view>
      </view>
    </view>

    <!-- 删除确认 -->
    <view v-if="showDeleteConfirm" class="confirm-mask" @tap.self="showDeleteConfirm = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('guide.admin.deleteTitle') }}</text>
        <text class="confirm-dialog__content">{{ t('guide.admin.deleteContent') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--cancel" @tap="showDeleteConfirm = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="confirm-dialog__btn confirm-dialog__btn--confirm" @tap="handleDelete">
            <text>{{ t('guide.admin.delete') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';
.admin-page { min-height: 100vh; padding: 22rpx 24rpx; background: $color-bg-page; }.config-card { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; background: #fff; border-radius: 18rpx; box-shadow: 0 4rpx 14rpx rgba(108,71,49,.06); }.config-title, .config-tip { display: block; }.config-title { color: $color-text-primary; font-size: 28rpx; font-weight: 650; }.config-tip { margin-top: 8rpx; color: $color-text-hint; font-size: 22rpx; }.filter-scroll { white-space: nowrap; margin: 18rpx -8rpx 0; }.filter-item { display: inline-block; margin: 0 8rpx; padding: 13rpx 22rpx; border-radius: 28rpx; color: $color-text-secondary; background: #fff; font-size: 24rpx; }.filter-item.active { color: #fff; background: $color-primary; }.type-scroll { margin-top: 10rpx; }.list { margin-top: 20rpx; }.review-card { display: flex; flex-wrap: wrap; margin-bottom: 18rpx; padding: 18rpx; background: #fff; border-radius: 18rpx; box-shadow: 0 4rpx 14rpx rgba(108,71,49,.06); }.cover { flex: 0 0 150rpx; width: 150rpx; height: 150rpx; border-radius: 12rpx; }.body { flex: 1; min-width: 0; padding-left: 18rpx; }.title-row { display: flex; align-items: flex-start; gap: 8rpx; justify-content: space-between; }.title { flex: 1; overflow: hidden; color: $color-text-primary; font-size: 27rpx; font-weight: 650; white-space: nowrap; text-overflow: ellipsis; }.status { flex: 0 0 auto; padding: 6rpx 12rpx; border-radius: 8rpx; font-size: 20rpx; line-height: 1.35; }.status--0 { color: #526173; background: #edf1f5; }.status--1 { color: #237a55; background: #e5f5ec; }.status--2 { color: #9b6a28; background: #fff2d9; }.status--3 { color: #b24943; background: #fde9e7; }.meta, .summary { display: block; margin-top: 12rpx; overflow: hidden; color: $color-text-hint; font-size: 21rpx; white-space: nowrap; text-overflow: ellipsis; }.summary { color: $color-text-secondary; font-size: 23rpx; }.actions { display: flex; width: 100%; gap: 12rpx; margin-top: 16rpx; }.actions .action-btn { flex: 1; height: 58rpx; margin: 0; line-height: 58rpx; border: 0; border-radius: 10rpx; font-size: 22rpx; }.actions .action-btn--publish { color: #237a55; background: #e5f5ec; }.actions .action-btn--takedown { color: #9b6a28; background: #fff2d9; }.actions .action-btn--delete { color: #b24943; background: #fde9e7; }.state { padding: 180rpx 0; text-align: center; color: $color-text-secondary; font-size: 27rpx; }
.confirm-mask { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.5); }
.confirm-dialog { width: 560rpx; padding: 40rpx 32rpx; overflow: hidden; background-color: $color-bg-card; border-radius: 24rpx; }
.confirm-dialog__title { display: block; margin-bottom: 16rpx; color: $color-text-primary; font-size: 32rpx; font-weight: 600; text-align: center; }
.confirm-dialog__content { display: block; margin-bottom: 32rpx; color: $color-text-secondary; font-size: 28rpx; line-height: 1.5; text-align: center; }
.confirm-dialog__actions { display: flex; gap: 16rpx; }
.confirm-dialog__btn { flex: 1; display: flex; align-items: center; justify-content: center; height: 80rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: 500; }
.confirm-dialog__btn--cancel { color: $color-text-secondary; background-color: $color-bg-page; border: 2rpx solid $color-divider; }
.confirm-dialog__btn--confirm { color: #ffffff; background-color: $uni-color-error; }
</style>
