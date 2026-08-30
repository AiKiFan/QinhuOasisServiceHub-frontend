<!-- 攻略列表页 -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getGuideList } from '@/api/guide'
import { isLoggedIn } from '@/utils/auth'
import { getLanguage, t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

const currentLang = ref(getLanguage())
const currentType = ref(undefined)
const list = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const total = ref(0)

const tabs = computed(() => {
  currentLang.value
  return [
    { key: undefined, label: t('guide.list.all') },
    { key: 1, label: t('guide.list.official') },
    { key: 2, label: t('guide.list.tourist') },
  ]
})

const hasMore = computed(() => list.value.length < total.value)

function refreshLanguage() {
  currentLang.value = getLanguage()
  uni.setNavigationBarTitle({ title: t('guide.listTitle') })
}

async function loadList(reset = true) {
  if (reset) {
    page.value = 1
    loading.value = true
  } else {
    if (loadingMore.value || !hasMore.value) {
      return
    }
    loadingMore.value = true
  }

  try {
    const result = await getGuideList(currentType.value, page.value, 10)
    const currentList = result?.list || []
    total.value = result?.total || 0
    list.value = reset ? currentList : list.value.concat(currentList)
    page.value = reset ? 2 : page.value + 1
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function switchType(type) {
  if (currentType.value === type) {
    return
  }
  currentType.value = type
  loadList(true)
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/guide/detail?id=${id}` })
}

function goPublish() {
  if (!isLoggedIn()) {
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }
  uni.navigateTo({ url: '/pages/guide/publish' })
}

function typeLabel(type) {
  return type === 1 ? t('guide.list.official') : t('guide.list.tourist')
}

onMounted(() => {
  refreshLanguage()
  loadList()
})

onShow(() => {
  refreshLanguage()
})

function onPullDownRefresh() {
  loadList().finally(() => uni.stopPullDownRefresh())
}
</script>

<template>
  <view class="guide-page">
    <view class="guide-header">
      <view>
        <text class="guide-header__title">{{ t('guide.listTitle') }}</text>
        <text class="guide-header__subtitle">{{ t('guide.list.subtitle') }}</text>
      </view>
      <view class="publish-btn" @tap="goPublish">＋ {{ t('guide.list.publish') }}</view>
    </view>

    <scroll-view class="tabs" scroll-x enable-flex>
      <view
        v-for="tab in tabs"
        :key="String(tab.key)"
        class="tab"
        :class="{ 'tab--active': currentType === tab.key }"
        @tap="switchType(tab.key)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </scroll-view>

    <view v-if="loading" class="state">
      <text>{{ t('common.loading') }}</text>
    </view>
    <view v-else-if="list.length === 0" class="state empty-state">
      <text class="empty-state__icon">📝</text>
      <text>{{ t('guide.list.emptyTitle') }}</text>
      <text class="empty-state__tip">{{ t('guide.list.emptyTip') }}</text>
    </view>
    <view v-else class="guide-list">
      <view v-for="item in list" :key="item.id" class="guide-card" @tap="goDetail(item.id)">
        <SafeImage class="guide-card__cover" :src="item.coverImg" mode="aspectFill" />
        <view class="guide-card__body">
          <view class="guide-card__topline">
            <text class="guide-card__type">{{ typeLabel(item.postType) }}</text>
            <text class="guide-card__date">{{ (item.createTime || '').slice(0, 10) }}</text>
          </view>
          <text class="guide-card__title">{{ item.displayTitle || item.title }}</text>
          <text class="guide-card__summary">{{ item.summary || t('guide.list.summaryFallback') }}</text>
          <view class="guide-card__footer">
            <text class="author">{{ item.authorNickname || t('guide.list.authorFallback') }}</text>
            <view class="metrics">
              <text>👁 {{ item.viewCount || 0 }}</text>
              <text>♥ {{ item.likeCount || 0 }}</text>
              <text>💬 {{ item.commentCount || 0 }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="load-more" @tap="loadList(false)">
        <text>{{ loadingMore ? t('common.loading') : (hasMore ? t('common.loadMore') : t('common.noMore')) }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.guide-page { min-height: 100vh; padding-bottom: 40rpx; background: $color-bg-page; }
.guide-header { display: flex; align-items: center; justify-content: space-between; padding: 38rpx 28rpx 30rpx; background: linear-gradient(135deg, #f2ae8e, #e8956d); color: #fff; }
.guide-header__title { display: block; font-size: 44rpx; font-weight: 700; }
.guide-header__subtitle { display: block; margin-top: 10rpx; font-size: 23rpx; opacity: .9; }
.publish-btn { padding: 14rpx 22rpx; border: 2rpx solid rgba(255,255,255,.8); border-radius: 30rpx; font-size: 25rpx; }
.tabs { white-space: nowrap; padding: 20rpx 22rpx 8rpx; box-sizing: border-box; }
.tab { display: inline-flex; padding: 14rpx 26rpx; margin-right: 12rpx; border-radius: 30rpx; color: $color-text-secondary; font-size: 27rpx; }
.tab--active { color: #fff; background: $color-primary; }
.guide-list { padding: 14rpx 24rpx; }
.guide-card { display: flex; min-height: 210rpx; margin-bottom: 20rpx; overflow: hidden; background: #fff; border-radius: 20rpx; box-shadow: 0 5rpx 18rpx rgba(108,71,49,.07); }
.guide-card__cover { flex: 0 0 210rpx; width: 210rpx; height: 210rpx; }
.guide-card__body { flex: 1; min-width: 0; padding: 22rpx 20rpx; }
.guide-card__topline, .guide-card__footer { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.guide-card__type { padding: 6rpx 12rpx; border-radius: 8rpx; color: $color-primary; background: $color-primary-light; font-size: 21rpx; }
.guide-card__date { color: $color-text-hint; font-size: 21rpx; }
.guide-card__title { display: block; margin-top: 18rpx; overflow: hidden; color: $color-text-primary; font-size: 29rpx; font-weight: 650; line-height: 1.4; white-space: nowrap; text-overflow: ellipsis; }
.guide-card__summary { display: -webkit-box; margin-top: 10rpx; overflow: hidden; color: $color-text-secondary; font-size: 24rpx; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.guide-card__footer { margin-top: 22rpx; color: $color-text-hint; font-size: 21rpx; }
.author { max-width: 150rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.metrics { display: flex; gap: 12rpx; }
.load-more { padding: 20rpx; text-align: center; color: $color-text-hint; font-size: 23rpx; }
.state { padding: 180rpx 0; text-align: center; color: $color-text-secondary; font-size: 27rpx; }
.empty-state { display: flex; flex-direction: column; align-items: center; }
.empty-state__icon { margin-bottom: 18rpx; font-size: 72rpx; }
.empty-state__tip { margin-top: 12rpx; color: $color-text-hint; font-size: 23rpx; }
</style>
