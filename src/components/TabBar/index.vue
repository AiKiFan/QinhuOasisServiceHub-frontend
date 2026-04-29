<!--
  底部自定义 TabBar 组件
  用法：<TabBar active="rank" /> 或 <TabBar active="profile" />
  @author AiKiFan
-->
<script setup>
import { computed } from 'vue'
import { t } from '@/utils/i18n'

/** 当前激活的 tab key */
defineProps({
  active: {
    type: String,
    required: true,
  },
})

/** Tab 配置列表（key 不变，label 使用翻译） */
const TABS = computed(() => [
  { key: 'rank', label: t('tab.rank'), icon: '🏆', path: '/pages/rank/index' },
  { key: 'profile', label: t('tab.profile'), icon: '👤', path: '/pages/profile/index' },
])

/**
 * 切换 Tab（使用 reLaunch 避免页面栈堆积）
 * @param {{ key:string, path:string }} tab
 */
function switchTab(tab) {
  uni.reLaunch({ url: tab.path })
}
</script>

<template>
  <view class="tab-bar">
    <view
      v-for="tab in TABS"
      :key="tab.key"
      class="tab-bar__item"
      :class="{ 'tab-bar__item--active': active === tab.key }"
      @tap="switchTab(tab)"
    >
      <text class="tab-bar__icon">{{ tab.icon }}</text>
      <text class="tab-bar__label">{{ tab.label }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: $color-bg-card;
  display: flex;
  border-top: 2rpx solid $color-divider;
  padding-bottom: env(safe-area-inset-bottom);

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4rpx;
  }

  &__icon {
    font-size: 36rpx;
    line-height: 1;
    filter: grayscale(60%);
  }

  &__label {
    font-size: 20rpx;
    color: $color-text-hint;
  }

  &__item--active &__icon {
    filter: none;
  }

  &__item--active &__label {
    color: $color-primary;
    font-weight: 600;
  }
}
</style>
