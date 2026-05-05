<!--
  骨架屏组件
  加载中显示占位动画
  @author AiKiFan
-->
<script setup>
/** 骨架屏类型 */
defineProps({
  type: {
    type: String,
    default: 'card',
  },
})
</script>

<template>
  <!-- 卡片骨架屏 -->
  <view v-if="type === 'card'" class="skeleton-card">
    <view class="skeleton-card__cover skeleton-shimmer"></view>
    <view class="skeleton-card__info">
      <view class="skeleton-card__title skeleton-shimmer"></view>
      <view class="skeleton-card__meta skeleton-shimmer"></view>
    </view>
  </view>

  <!-- 列表骨架屏 -->
  <view v-else-if="type === 'list'" class="skeleton-list">
    <view v-for="n in 3" :key="n" class="skeleton-list__item">
      <view class="skeleton-list__avatar skeleton-shimmer"></view>
      <view class="skeleton-list__info">
        <view class="skeleton-list__name skeleton-shimmer"></view>
        <view class="skeleton-list__desc skeleton-shimmer"></view>
      </view>
    </view>
  </view>

  <!-- 详情骨架屏 -->
  <view v-else-if="type === 'detail'" class="skeleton-detail">
    <view class="skeleton-detail__header skeleton-shimmer"></view>
    <view class="skeleton-detail__row skeleton-shimmer"></view>
    <view class="skeleton-detail__row skeleton-shimmer"></view>
    <view class="skeleton-detail__text skeleton-shimmer"></view>
    <view class="skeleton-detail__text skeleton-shimmer"></view>
    <view class="skeleton-detail__text skeleton-shimmer short"></view>
  </view>

  <!-- 通用骨架屏 -->
  <view v-else class="skeleton-generic">
    <view class="skeleton-generic__block skeleton-shimmer"></view>
    <view class="skeleton-generic__block skeleton-shimmer"></view>
    <view class="skeleton-generic__block skeleton-shimmer short"></view>
  </view>
</template>

<style lang="scss" scoped>
/* 骨架屏骨架动画 */
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8rpx;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── 卡片骨架屏 ── */
.skeleton-card {
  display: flex;
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__cover {
    flex-shrink: 0;
    width: 140rpx;
    height: 100rpx;
    border-radius: 12rpx;
    margin-right: 16rpx;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    justify-content: center;
  }

  &__title {
    width: 70%;
    height: 32rpx;
  }

  &__meta {
    width: 40%;
    height: 24rpx;
  }
}

/* ── 列表骨架屏 ── */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  &__item {
    display: flex;
    background-color: #ffffff;
    border-radius: 20rpx;
    padding: 20rpx;
    box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
  }

  &__avatar {
    flex-shrink: 0;
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    margin-right: 16rpx;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    justify-content: center;
  }

  &__name {
    width: 50%;
    height: 28rpx;
  }

  &__desc {
    width: 30%;
    height: 22rpx;
  }
}

/* ── 详情骨架屏 ── */
.skeleton-detail {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  &__header {
    width: 100%;
    height: 300rpx;
    border-radius: 20rpx;
  }

  &__row {
    width: 100%;
    height: 48rpx;
    border-radius: 12rpx;
  }

  &__text {
    width: 100%;
    height: 24rpx;
    border-radius: 8rpx;

    &.short { width: 60%; }
  }
}

/* ── 通用骨架屏 ── */
.skeleton-generic {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  &__block {
    width: 100%;
    height: 120rpx;
    border-radius: 16rpx;

    &.short { width: 50%; }
  }
}
</style>
