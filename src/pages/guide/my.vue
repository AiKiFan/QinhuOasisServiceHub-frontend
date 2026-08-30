<!-- 我的攻略页 -->
<script setup>
import { onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { deleteMyGuide, getMyGuides, setGuidePrivate } from '@/api/guide'
import { requireLogin } from '@/utils/auth'
import { getLanguage, t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

const list = ref([])
const loading = ref(true)
const showDeleteConfirm = ref(false)
const currentLang = ref(getLanguage())
const deletingId = ref(null)

function refreshLanguage() {
  currentLang.value = getLanguage()
  uni.setNavigationBarTitle({ title: t('guide.my.title') })
}

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
  return ({
    0: t('guide.my.status.draft'),
    1: t('guide.my.status.published'),
    2: t('guide.my.status.reviewing'),
    3: t('guide.my.status.takenDown'),
  })[status] || t('guide.my.status.unknown')
}


function privacyText(item) {
  return Number(item.isPrivate) === 1 ? `🔒 ${t('guide.my.private')}` : `🌐 ${t('guide.my.public')}`
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
  uni.showToast({ title: next ? t('guide.my.privateSuccessPrivate') : t('guide.my.privateSuccessPublic'), icon: 'success' })
}

function openDeleteConfirm(item) {
  deletingId.value = item.id
  showDeleteConfirm.value = true
}

async function handleDelete() {
  try {
    await deleteMyGuide(deletingId.value)
    list.value = list.value.filter(value => value.id !== deletingId.value)
    uni.showToast({ title: t('guide.my.deleteSuccess'), icon: 'success' })
  } finally {
    showDeleteConfirm.value = false
    deletingId.value = null
  }
}

function goPublish() {
  uni.navigateTo({ url: '/pages/guide/publish' })
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('guide.my.title') })
  if (requireLogin()) loadList()
})

onShow(() => {
  refreshLanguage()
})
</script>

<template>
  <view class="my-page" :data-lang="currentLang">
    <view v-if="loading" class="state">{{ t('common.loading') }}</view>
    <view v-else-if="list.length === 0" class="state">
      <text class="state__icon">📝</text>
      <text>{{ t('guide.my.emptyTitle') }}</text>
      <button class="go-btn" @tap="goPublish">{{ t('guide.my.publishFirst') }}</button>
    </view>
    <view v-else class="my-list">
      <view v-for="item in list" :key="item.id" class="my-card" @tap="goDetail(item.id)">
        <SafeImage class="my-card__cover" :src="item.coverImg" mode="aspectFill" />
        <view class="my-card__body">
          <view class="line"><text class="title">{{ item.displayTitle || item.title }}</text><text class="status">{{ statusText(item.status) }}</text></view>
          <text class="summary">{{ item.summary || t('guide.my.summaryFallback') }}</text>
          <view class="line bottom"><text class="private">{{ privacyText(item) }}</text><text class="date">{{ (item.createTime || '').slice(0, 10) }}</text></view>
          <view class="actions" @tap.stop>
            <button @tap="edit(item.id)">{{ t('guide.my.edit') }}</button>
            <button @tap="togglePrivate(item)">{{ Number(item.isPrivate) === 1 ? t('guide.my.setPublic') : t('guide.my.setPrivate') }}</button>
            <button class="danger" @tap="openDeleteConfirm(item)">{{ t('guide.my.delete') }}</button>
          </view>
        </view>
      </view>
    </view>

    <!-- 删除确认 -->
    <view v-if="showDeleteConfirm" class="confirm-mask" @tap.self="showDeleteConfirm = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('guide.my.deleteTitle') }}</text>
        <text class="confirm-dialog__content">{{ t('guide.my.deleteContent') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--cancel" @tap="showDeleteConfirm = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="confirm-dialog__btn confirm-dialog__btn--confirm" @tap="handleDelete">
            <text>{{ t('guide.my.delete') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';
.my-page { min-height: 100vh; padding: 24rpx; background: $color-bg-page; }.my-card { display: flex; min-height: 190rpx; margin-bottom: 20rpx; overflow: hidden; background: #fff; border-radius: 20rpx; box-shadow: 0 5rpx 18rpx rgba(108,71,49,.07); }.my-card__cover { flex: 0 0 190rpx; width: 190rpx; height: 190rpx; }.my-card__body { flex: 1; min-width: 0; padding: 20rpx; }.line { display: flex; align-items: center; justify-content: space-between; gap: 10rpx; }.title { flex: 1; overflow: hidden; color: $color-text-primary; font-size: 28rpx; font-weight: 650; white-space: nowrap; text-overflow: ellipsis; }.status { flex-shrink: 0; color: $color-primary; font-size: 21rpx; }.summary { display: block; margin-top: 12rpx; overflow: hidden; color: $color-text-secondary; font-size: 23rpx; white-space: nowrap; text-overflow: ellipsis; }.bottom { margin-top: 18rpx; color: $color-text-hint; font-size: 21rpx; }.actions { display: flex; gap: 8rpx; margin-top: 16rpx; }.actions button { flex: 1; height: 52rpx; margin: 0; padding: 0 4rpx; line-height: 52rpx; border-radius: 10rpx; color: $color-text-secondary; background: #fff7f1; font-size: 20rpx; }.actions button.danger { color: #d65c4c; }.state { display: flex; flex-direction: column; align-items: center; padding-top: 180rpx; color: $color-text-secondary; font-size: 28rpx; }.state__icon { margin-bottom: 18rpx; font-size: 70rpx; }.go-btn { height: 72rpx; margin-top: 26rpx; line-height: 72rpx; border-radius: 36rpx; color: #fff; background: $color-primary; font-size: 25rpx; }

.confirm-mask { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.5); }
.confirm-dialog { width: 560rpx; padding: 40rpx 32rpx; overflow: hidden; background-color: $color-bg-card; border-radius: 24rpx; }
.confirm-dialog__title { display: block; margin-bottom: 16rpx; color: $color-text-primary; font-size: 32rpx; font-weight: 600; text-align: center; }
.confirm-dialog__content { display: block; margin-bottom: 32rpx; color: $color-text-secondary; font-size: 28rpx; line-height: 1.5; text-align: center; }
.confirm-dialog__actions { display: flex; gap: 16rpx; }
.confirm-dialog__btn { flex: 1; display: flex; align-items: center; justify-content: center; height: 80rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: 500; }
.confirm-dialog__btn--cancel { color: $color-text-secondary; background-color: $color-bg-page; border: 2rpx solid $color-divider; }
.confirm-dialog__btn--confirm { color: #ffffff; background-color: $uni-color-error; }
</style>
