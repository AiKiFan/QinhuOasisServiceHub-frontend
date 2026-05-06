<!--
  首页 - 沁湖驿站 · 明月山景区
  包含：轮播图、天气、快捷入口
  @author AiKiFan
-->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { t } from '@/utils/i18n'
import TabBar from '@/components/TabBar/index.vue'
import HomeSwiper from '@/components/HomeSwiper/index.vue'
import WeatherCard from '@/components/WeatherCard/index.vue'

/** 快捷入口配置 */
const QUICK_LINKS = computed(() => [
  { icon: '🏆', label: t('home.rankings'), path: '/pages/rank/index', color: '#E8956D' },
  { icon: '🍽️', label: t('home.restaurantList'), path: '/pages/restaurant/list', color: '#FF7043' },
  { icon: '🌍', label: t('home.interpreters'), path: '/pages/interpreter/list', color: '#5C6BC0' },
  { icon: '🏔️', label: t('home.scenicSpots'), path: '/pages/scenic/list', color: '#66BB6A' },
  { icon: '🚗', label: t('home.parking'), path: '/pages/parking/list', color: '#FFB74D' },
  { icon: '📣', label: t('home.feedback'), path: '/pages/feedback/submit', color: '#F48FB1' },
  { icon: '👤', label: t('home.profile'), path: '/pages/profile/index', color: '#78909C' },
])

/** 快捷入口跳转 */
function goTo(path) {
  // 项目使用自定义 TabBar 组件（非原生 tabBar），pages.json 中没有 tabBar 配置
  // 因此不能使用 uni.switchTab()，否则会静默失败
  // TabBar 页面使用 reLaunch（清空页面栈，防止堆积），与 TabBar 组件内部的 reLaunch 逻辑保持一致
  const tabBarPaths = ['/pages/index/index', '/pages/search/index', '/pages/favorites/index', '/pages/profile/index']
  if (tabBarPaths.includes(path)) {
    uni.reLaunch({ url: path })
  } else {
    uni.navigateTo({ url: path })
  }
}

onMounted(() => {
  // 动态设置导航栏标题
  uni.setNavigationBarTitle({ title: t('page.index.title') })
})
</script>

<template>
  <view class="home-page">
    <!-- 轮播图 -->
    <HomeSwiper />

    <!-- 景区天气 -->
    <WeatherCard />

    <!-- 快捷入口 -->
    <view class="quick-section">
      <text class="section-title">⚡ {{ t('home.quickServices') }}</text>
      <view class="quick-grid">
        <view
          v-for="link in QUICK_LINKS"
          :key="link.path"
          class="quick-item"
          @tap="goTo(link.path)"
        >
          <view
            class="quick-item__icon-wrap"
            :style="{ backgroundColor: link.color + '20' }"
          >
            <text class="quick-item__icon">{{ link.icon }}</text>
          </view>
          <text class="quick-item__label">{{ link.label }}</text>
        </view>
      </view>
    </view>

    <!-- 底部 TabBar -->
    <TabBar active="home" />
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.home-page {
  min-height: 100vh;
  background-color: $color-bg-page;
}

/* ── 区域标题 ── */
.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 20rpx;
}

/* ── 快捷入口 ── */
.quick-section {
  margin: 32rpx 24rpx 0;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 0;
  background-color: $color-bg-card;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(232, 149, 109, 0.06);

  &__icon-wrap {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__icon {
    font-size: 40rpx;
  }

  &__label {
    font-size: 24rpx;
    color: $color-text-primary;
    font-weight: 500;
    text-align: center;
    word-break: break-word;
    line-height: 1.3;
    max-width: 100%;
  }
}
</style>
