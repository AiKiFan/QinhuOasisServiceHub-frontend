<!--
  餐厅人气排行榜页面
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { getRestaurantRank } from '@/api/restaurant'
import { t } from '@/utils/i18n'
import TabBar from '@/components/TabBar/index.vue'
import SafeImage from '@/components/SafeImage/index.vue'

/** 排行榜数据列表 */
const rankList = ref([])
/** 加载状态 */
const loading = ref(false)
/** 是否加载失败 */
const hasError = ref(false)

/** 前三名排名徽章颜色映射 */
const RANK_BADGE_COLORS = {
  1: '#FFB22C',
  2: '#9BA3AF',
  3: '#C87941',
}

/** 第四名及之后的默认徽章颜色 */
const RANK_BADGE_DEFAULT_COLOR = '#E8956D'

/**
 * 根据排名返回徽章背景色
 * @param {number} rank
 * @returns {string}
 */
function getRankBadgeColor(rank) {
  return RANK_BADGE_COLORS[rank] ?? RANK_BADGE_DEFAULT_COLOR
}

/**
 * 跳转餐厅详情页
 * @param {number} id
 */
function goToDetail(id) {
  uni.navigateTo({ url: `/pages/restaurant/detail?id=${id}` })
}

/**
 * 加载排行榜数据
 */
async function loadRankList() {
  loading.value = true
  hasError.value = false
  try {
    rankList.value = await getRestaurantRank()
  } catch {
    hasError.value = true
  } finally {
    loading.value = false
  }
}

/** 下拉刷新 */
function onPullDownRefresh() {
  loadRankList().finally(() => uni.stopPullDownRefresh())
}

onMounted(loadRankList)
</script>

<template>
  <view class="rank-page">
    <!-- 页面头部横幅 -->
    <view class="rank-header">
      <text class="rank-header__title">{{ t('rank.title') }}</text>
      <text class="rank-header__subtitle">{{ t('common.all') }}</text>
    </view>

    <!-- 加载中状态 -->
    <view v-if="loading" class="rank-status">
      <text class="rank-status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 加载失败状态 -->
    <view v-else-if="hasError" class="rank-status">
      <text class="rank-status__text">{{ t('common.loadFailed') }}</text>
      <button class="rank-status__retry-btn" @tap="loadRankList">{{ t('common.retry') }}</button>
    </view>

    <!-- 排行榜列表 -->
    <view v-else class="rank-list">
      <view
        v-for="item in rankList"
        :key="item.id"
        class="rank-card"
        :class="{ 'rank-card--top3': item.rank <= 3 }"
        @tap="goToDetail(item.id)"
      >
        <!-- 排名徽章 -->
        <view
          class="rank-card__badge"
          :style="{ backgroundColor: getRankBadgeColor(item.rank) }"
        >
          <text class="rank-card__badge-text">{{ item.rank }}</text>
        </view>

        <!-- 封面图 -->
        <SafeImage
          class="rank-card__cover"
          :src="item.coverImg"
          mode="aspectFill"
          :lazy-load="true"
        />

        <!-- 文字信息区 -->
        <view class="rank-card__info">
          <text class="rank-card__name">{{ item.displayName }}</text>

          <view class="rank-card__meta">
            <text class="rank-card__category">{{ item.category }}</text>
            <text class="rank-card__reviews">{{ item.reviewCount }} {{ t('rank.reviewCount') }}</text>
          </view>

          <view class="rank-card__bottom">
            <text class="rank-card__score">{{ item.sortScore.toFixed(1) }}</text>
            <view class="rank-card__rating">
              <text class="rank-card__star">★</text>
              <text class="rank-card__rating-val">{{ item.rating }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部 TabBar -->
    <TabBar active="rank" />
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.rank-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  /* 120rpx = TabBar 高度 + 安全区，避免卡片被遮挡 */
  padding-bottom: 120rpx;
}

/* ── 头部横幅 ── */
.rank-header {
  padding: 48rpx 32rpx 36rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);

  &__title {
    display: block;
    font-size: 48rpx;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 2rpx;
  }

  &__subtitle {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

/* ── 状态占位（加载中 / 失败） ── */
.rank-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }

  &__retry-btn {
    margin-top: 32rpx;
    padding: 16rpx 48rpx;
    background-color: $color-primary;
    color: #ffffff;
    font-size: 28rpx;
    border-radius: 40rpx;
    border: none;
    line-height: 1.5;
  }
}

/* ── 列表容器 ── */
.rank-list {
  padding: 24rpx 24rpx 0;
}

/* ── 排行卡片 ── */
.rank-card {
  display: flex;
  align-items: center;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.10);

  /* 前三名卡片加强阴影 */
  &--top3 {
    box-shadow: 0 4rpx 24rpx rgba(232, 149, 109, 0.22);
  }

  /* 排名徽章 */
  &__badge {
    flex-shrink: 0;
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
  }

  &__badge-text {
    font-size: 28rpx;
    font-weight: 700;
    color: #ffffff;
  }

  /* 封面图 */
  &__cover {
    flex-shrink: 0;
    width: 120rpx;
    height: 120rpx;
    border-radius: 12rpx;
    margin-right: 20rpx;
    background-color: $color-divider;
  }

  /* 文字信息区 */
  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 120rpx;
  }

  &__name {
    font-size: 30rpx;
    font-weight: 600;
    color: $color-text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__category {
    font-size: 22rpx;
    color: $color-primary;
    background-color: $color-primary-light;
    padding: 4rpx 12rpx;
    border-radius: 20rpx;
  }

  &__reviews {
    font-size: 22rpx;
    color: $color-text-hint;
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__score {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &__rating {
    display: flex;
    align-items: center;
    gap: 4rpx;
  }

  &__star {
    font-size: 24rpx;
    color: $color-rank-gold;
  }

  &__rating-val {
    font-size: 26rpx;
    font-weight: 600;
    color: $color-text-primary;
  }
}
</style>
