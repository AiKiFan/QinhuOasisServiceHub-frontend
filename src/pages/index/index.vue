<!--
  首页 - 沁湖驿站 · 明月山景区
  包含：轮播图、天气、快捷入口
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { t } from '@/utils/i18n'
import { isLoggedIn, getUser } from '@/utils/auth'
import TabBar from '@/components/TabBar/index.vue'
import HomeSwiper from '@/components/HomeSwiper/index.vue'
import WeatherCard from '@/components/WeatherCard/index.vue'

/** 用户信息 */
const loggedIn = ref(false)
const nickname = ref('')

/** 快捷入口配置 */
const QUICK_LINKS = [
  { icon: '🏆', label: '餐厅排行', path: '/pages/rank/index', color: '#E8956D' },
  { icon: '🍽️', label: '餐厅列表', path: '/pages/restaurant/list', color: '#FF7043' },
  { icon: '🌍', label: '译员服务', path: '/pages/interpreter/list', color: '#5C6BC0' },
  { icon: '🚗', label: '停车场', path: '/pages/parking/list', color: '#FFB74D' },
  { icon: '📣', label: '投诉建议', path: '/pages/feedback/submit', color: '#F48FB1' },
  { icon: '👤', label: '个人中心', path: '/pages/profile/index', color: '#78909C' },
]

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
  loggedIn.value = isLoggedIn()
  if (loggedIn.value) {
    const u = getUser()
    nickname.value = u?.nickname || u?.username || ''
  }
})
</script>

<template>
  <view class="home-page">
    <!-- 顶部欢迎语 -->
    <view class="home-header">
      <view class="home-header__left">
        <text class="home-header__greeting">
          {{ loggedIn ? `👋 ${t('common.hello')}，${nickname}` : '👋 欢迎来到' }}
        </text>
        <text class="home-header__title">🏔️ 明月山 · 沁湖驿站</text>
      </view>
      <view class="home-header__right">
        <text class="home-header__slogan">畅游明月</text>
      </view>
    </view>

    <!-- 轮播图 -->
    <HomeSwiper />

    <!-- 景区天气 -->
    <WeatherCard />

    <!-- 快捷入口 -->
    <view class="quick-section">
      <text class="section-title">⚡ 快捷服务</text>
      <view class="quick-grid">
        <view
          v-for="link in QUICK_LINKS"
          :key="link.label"
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
  padding-bottom: 120rpx;
}

/* ── 头部 ── */
.home-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 32rpx 32rpx 16rpx;

  &__left {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__greeting {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__title {
    font-size: 40rpx;
    font-weight: 700;
    color: $color-text-primary;
  }

  &__right {
    padding-top: 8rpx;
  }

  &__slogan {
    font-size: 24rpx;
    color: $color-primary;
    background-color: $color-primary-light;
    padding: 8rpx 20rpx;
    border-radius: 24rpx;
    font-weight: 500;
  }
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
  }
}
</style>
