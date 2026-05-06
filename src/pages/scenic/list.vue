<!--
  景点列表页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { t } from '@/utils/i18n'
import { getScenicSpotList } from '@/api/scenic'
import TabBar from '@/components/TabBar/index.vue'
import SafeImage from '@/components/SafeImage/index.vue'

/** 景点列表 */
const spotList = ref([])
/** 加载状态 */
const loading = ref(false)
/** 加载更多状态 */
const loadingMore = ref(false)
/** 是否有更多数据 */
const hasMore = ref(true)
/** 当前页码 */
const page = ref(1)
/** 每页数量 */
const PAGE_SIZE = 10

/**
 * 加载景点列表
 */
async function loadSpots(refresh = true) {
  if (refresh) {
    page.value = 1
    spotList.value = []
    hasMore.value = true
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const res = await getScenicSpotList(page.value, PAGE_SIZE)
    const newList = res.data || []
    spotList.value = refresh ? newList : [...spotList.value, ...newList]
    hasMore.value = newList.length >= PAGE_SIZE
    page.value++
  } catch {
    /* error handled by request.js */
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

/**
 * 下拉刷新
 */
function onPullDownRefresh() {
  loadSpots(true).finally(() => uni.stopPullDownRefresh())
}

/**
 * 上拉加载更多
 */
function onReachBottom() {
  if (!hasMore.value || loadingMore.value) return
  loadSpots(false)
}

/**
 * 跳转景点详情
 */
function goToDetail(id) {
  uni.navigateTo({ url: `/pages/scenic/detail?id=${id}` })
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.scenicList.title') })
  loadSpots()
})
</script>

<template>
  <view class="scenic-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 景点列表 -->
    <view v-else-if="spotList.length > 0" class="scenic-list">
      <view
        v-for="spot in spotList"
        :key="spot.id"
        class="scenic-card"
        @tap="goToDetail(spot.id)"
      >
        <SafeImage
          class="scenic-card__cover"
          :src="spot.coverImg"
          mode="aspectFill"
        />
        <view class="scenic-card__info">
          <text class="scenic-card__name">{{ spot.displayName }}</text>
          <view class="scenic-card__meta">
            <text class="scenic-card__rating">⭐ {{ spot.rating }}</text>
            <text class="scenic-card__price">
              {{ spot.ticketPrice > 0 ? '¥' + spot.ticketPrice : t('scenic.free') }}
            </text>
          </view>
          <text class="scenic-card__hours">{{ spot.openingHours }}</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="load-more">
        <text class="load-more__text">{{ t('common.loadMore') }}</text>
      </view>
      <view v-else-if="!hasMore" class="load-more">
        <text class="load-more__text">{{ t('common.noMore') }}</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty">
      <text class="empty__icon">🏔️</text>
      <text class="empty__text">{{ t('scenic.empty') }}</text>
    </view>

    <!-- 底部 TabBar -->
    <TabBar active="home" />
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.scenic-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding-bottom: 120rpx;
}

.status {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}

.scenic-list {
  padding: 20rpx 24rpx;
}

.scenic-card {
  display: flex;
  background-color: $color-bg-card;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);

  &__cover {
    width: 200rpx;
    height: 160rpx;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    padding: 20rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  &__name {
    font-size: 30rpx;
    font-weight: 600;
    color: $color-text-primary;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__rating {
    font-size: 24rpx;
    color: $color-primary;
  }

  &__price {
    font-size: 26rpx;
    color: $color-primary;
    font-weight: 500;
  }

  &__hours {
    font-size: 22rpx;
    color: $color-text-hint;
  }
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 30rpx 0;

  &__text {
    font-size: 24rpx;
    color: $color-text-hint;
  }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;

  &__icon {
    font-size: 100rpx;
    margin-bottom: 20rpx;
  }

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}
</style>