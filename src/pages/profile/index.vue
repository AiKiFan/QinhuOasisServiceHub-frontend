<!--
  个人中心页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import TabBar from '@/components/TabBar/index.vue'
import { isLoggedIn, getUser, saveUser, logout, isAdmin as checkIsAdmin } from '@/utils/auth'
import { getMyProfile } from '@/api/user'
import { getLanguage, toggleLanguage as toggleLang, t } from '@/utils/i18n'
import { getTheme, toggleTheme as toggleMode } from '@/utils/theme'
import SafeImage from '@/components/SafeImage/index.vue'

/** 是否已登录 */
const loggedIn = ref(false)
/** 用户信息 */
const userInfo = ref(null)
/** 当前语言 */
const currentLang = ref('zh-CN')
/** 是否管理员 */
const isAdmin = ref(false)
/** 当前主题 */
const currentTheme = ref('light')

/** 角色名称映射（支持国际化） */
const getRoleLabels = () => ({
  0: t('profile.role.guest'),
  1: t('profile.role.interpreter'),
  2: t('profile.role.admin'),
})

/** 角色标签背景色映射 */
const ROLE_COLORS = {
  0: '#9BA3AF',
  1: '#E8956D',
  2: '#FFB22C',
}

/**
 * 初始化：读缓存 → 已登录则静默刷新远端数据
 */
async function init() {
  currentLang.value = getLanguage()
  loggedIn.value = isLoggedIn()
  if (!loggedIn.value) return
  userInfo.value = getUser()
  // 兼容数字 role（后端返回 2）与字符串 role（'admin'）
  isAdmin.value = checkIsAdmin()
  try {
    const fresh = await getMyProfile()
    userInfo.value = fresh
    isAdmin.value = fresh.role === 2 || fresh.role === 'admin'
    saveUser(fresh)
  } catch {
    // 网络失败时降级使用缓存，不弹错误
  }
}

/** 跳转登录页 */
function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}

/** 跳转注册页 */
function goRegister() {
  uni.navigateTo({ url: '/pages/register/index' })
}

/** 执行登出 */
function handleLogout() {
  uni.showModal({
    title: t('profile.logoutConfirmTitle'),
    content: t('profile.logoutConfirmContent'),
    success(res) {
      if (!res.confirm) return
      logout()
      loggedIn.value = false
      userInfo.value = null
      isAdmin.value = false
    },
  })
}

/** 切换语言 */
function handleToggleLanguage() {
  const next = toggleLang()
  currentLang.value = next
  uni.showToast({
    title: next === 'en-US' ? 'English mode enabled' : '已切换为中文',
    icon: 'success',
  })
}

/** 切换主题 */
function handleToggleTheme() {
  const next = toggleMode()
  currentTheme.value = next
}

/** 跳转译员申请页 */
function goApplyInterpreter() {
  uni.navigateTo({ url: '/pages/interpreter/apply' })
}

/** 跳转我的翻译订单 */
function goMyOrders() {
  uni.navigateTo({ url: '/pages/interpreter-orders/list' })
}

/** 跳转投诉建议提交页 */
function goFeedback() {
  uni.navigateTo({ url: '/pages/feedback/submit' })
}

/** 跳转我的收藏 */
function goFavorites() {
  uni.navigateTo({ url: '/pages/favorites/index' })
}

/** 跳转接单管理（译员端） */
function goReceivedOrders() {
  uni.navigateTo({ url: '/pages/interpreter-orders/received' })
}

/** 跳转管理端：译员审核 */
function goAdminReview() {
  uni.navigateTo({ url: '/pages/admin/interpreter-review' })
}

/** 跳转管理端：投诉建议 */
function goAdminFeedback() {
  uni.navigateTo({ url: '/pages/admin/feedback-list' })
}

/** 跳转编辑资料页 */
function goEditProfile() {
  uni.navigateTo({ url: '/pages/profile/edit' })
}

onMounted(init)
</script>

<template>
  <view class="profile-page">
    <!-- ── 未登录视图 ── -->
    <view v-if="!loggedIn" class="profile-guest">
      <text class="profile-guest__icon">👤</text>
      <text class="profile-guest__tip">{{ t('profile.guestTip') }}</text>
      <button class="profile-guest__login-btn" @tap="goLogin">{{ t('auth.login') }}</button>
      <button class="profile-guest__register-btn" @tap="goRegister">{{ t('auth.register') }}</button>
    </view>

    <!-- ── 已登录视图 ── -->
    <view v-else class="profile-user">
      <!-- 头部信息卡 -->
      <view class="profile-hero">
        <view class="profile-hero__avatar-wrap">
          <SafeImage
            v-if="userInfo && userInfo.avatar"
            class="profile-hero__avatar"
            :src="userInfo.avatar"
            mode="aspectFill"
          />
          <view v-else class="profile-hero__avatar-placeholder">
            <text class="profile-hero__avatar-text">
              {{ userInfo ? (userInfo.nickname || userInfo.username || '?')[0].toUpperCase() : '?' }}
            </text>
          </view>
        </view>
        <text class="profile-hero__name">
          {{ userInfo ? (userInfo.nickname || userInfo.username) : '' }}
        </text>
        <view
          v-if="userInfo"
          class="profile-hero__role"
          :style="{ backgroundColor: ROLE_COLORS[userInfo.role] ?? ROLE_COLORS[0] }"
        >
          <text class="profile-hero__role-text">
            {{ getRoleLabels()[userInfo.role] ?? t('profile.role.guest') }}
          </text>
        </view>
      </view>

      <!-- 编辑资料按钮 -->
      <view class="edit-profile-btn-wrap">
        <view class="edit-profile-btn" @tap="goEditProfile">
          <text class="edit-profile-btn__icon">✏️</text>
          <text class="edit-profile-btn__text">{{ t('profile.edit.title') }}</text>
        </view>
      </view>

      <!-- 信息列表 -->
      <view class="profile-info-card">
        <view class="profile-info-item">
          <text class="profile-info-item__label">{{ t('profile.username') }}</text>
          <text class="profile-info-item__value">{{ userInfo ? userInfo.username : '' }}</text>
        </view>
        <view class="profile-info-item">
          <text class="profile-info-item__label">{{ t('profile.userId') }}</text>
          <text class="profile-info-item__value">{{ userInfo ? userInfo.userId : '' }}</text>
        </view>
        <view class="profile-info-item profile-info-item--last">
          <text class="profile-info-item__label">{{ t('profile.email') }}</text>
          <text class="profile-info-item__value">{{ userInfo ? (userInfo.email || '-') : '' }}</text>
        </view>
      </view>

      <!-- 功能菜单 -->
      <view class="profile-menu-card">
        <text class="menu-section-title">{{ t('profile.moreFeatures') }}</text>

        <!-- 我的收藏 -->
        <view class="menu-item" @tap="goFavorites">
          <text class="menu-item__icon">⭐</text>
          <text class="menu-item__text">{{ t('tab.favorites') }}</text>
          <text class="menu-item__arrow">›</text>
        </view>

        <!-- 我的订单 -->
        <view class="menu-item" @tap="goMyOrders">
          <text class="menu-item__icon">📋</text>
          <text class="menu-item__text">{{ t('profile.myOrders') }}</text>
          <text class="menu-item__arrow">›</text>
        </view>

        <!-- 接单管理（仅译员可见） -->
        <view v-if="userInfo && userInfo.role === 1" class="menu-item" @tap="goReceivedOrders">
          <text class="menu-item__icon">🎯</text>
          <text class="menu-item__text">接单管理</text>
          <text class="menu-item__arrow">›</text>
        </view>

        <!-- 申请成为译员 -->
        <view class="menu-item" @tap="goApplyInterpreter">
          <text class="menu-item__icon">📝</text>
          <text class="menu-item__text">{{ t('profile.applyInterpreter') }}</text>
          <text class="menu-item__arrow">›</text>
        </view>

        <!-- 投诉建议 -->
        <view class="menu-item" @tap="goFeedback">
          <text class="menu-item__icon">📣</text>
          <text class="menu-item__text">{{ t('feedback.submit.title') }}</text>
          <text class="menu-item__arrow">›</text>
        </view>

        <!-- 主题切换 -->
        <view class="menu-item" @tap="handleToggleTheme">
          <text class="menu-item__icon">{{ currentTheme === 'dark' ? '🌙' : '☀️' }}</text>
          <text class="menu-item__text">
            {{ currentTheme === 'dark' ? t('profile.themeDark') : t('profile.themeLight') }}
          </text>
          <text class="menu-item__arrow">{{ currentTheme === 'dark' ? '🌙' : '☀️' }}</text>
        </view>

        <!-- 语言切换（关键功能：英语全界面切换） -->
        <view class="menu-item menu-item--last" @tap="handleToggleLanguage">
          <text class="menu-item__icon">🌐</text>
          <text class="menu-item__text">
            {{ currentLang === 'zh-CN' ? t('profile.switchLang') : t('profile.switchLangBack') }}
          </text>
          <view class="language-badge">
            <text class="language-badge__text">{{ currentLang === 'zh-CN' ? 'EN' : '中' }}</text>
          </view>
        </view>
      </view>

      <!-- 管理端入口（仅管理员可见） -->
      <view v-if="isAdmin" class="profile-menu-card">
        <text class="menu-section-title">{{ t('profile.adminPanel') }}</text>

        <view class="menu-item" @tap="goAdminReview">
          <text class="menu-item__icon">📝</text>
          <text class="menu-item__text">{{ t('profile.adminReview') }}</text>
          <text class="menu-item__arrow">›</text>
        </view>

        <view class="menu-item menu-item--last" @tap="goAdminFeedback">
          <text class="menu-item__icon">💬</text>
          <text class="menu-item__text">{{ t('profile.adminFeedback') }}</text>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>

      <!-- 登出按钮 -->
      <button class="profile-logout-btn" @tap="handleLogout">{{ t('profile.logout') }}</button>
    </view>

    <!-- 底部 TabBar -->
    <TabBar active="profile" />
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.profile-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding-bottom: 120rpx;
}

/* ── 未登录 ── */
.profile-guest {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;

  &__icon {
    font-size: 120rpx;
    line-height: 1;
    margin-bottom: 32rpx;
  }

  &__tip {
    font-size: 28rpx;
    color: $color-text-hint;
    margin-bottom: 48rpx;
  }

  &__login-btn {
    width: 480rpx;
    height: 88rpx;
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
    font-size: 32rpx;
    font-weight: 600;
    border-radius: 44rpx;
    border: none;
    margin-bottom: 24rpx;
  }

  &__register-btn {
    width: 480rpx;
    height: 88rpx;
    background-color: $color-bg-card;
    color: $color-primary;
    font-size: 32rpx;
    font-weight: 600;
    border-radius: 44rpx;
    border: 2rpx solid $color-primary;
  }
}

/* ── 已登录 ── */
.profile-user {
  padding: 0 32rpx;
}

.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 0 48rpx;

  &__avatar-wrap {
    width: 144rpx;
    height: 144rpx;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 24rpx;
    border: 4rpx solid $color-primary-light;
  }

  &__avatar {
    width: 100%;
    height: 100%;
  }

  &__avatar-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__avatar-text {
    font-size: 56rpx;
    font-weight: 700;
    color: #ffffff;
  }

  &__name {
    font-size: 40rpx;
    font-weight: 700;
    color: $color-text-primary;
    margin-bottom: 16rpx;
  }

  &__role {
    padding: 6rpx 20rpx;
    border-radius: 20rpx;
  }

  &__role-text {
    font-size: 22rpx;
    color: #ffffff;
    font-weight: 500;
  }
}

/* ── 编辑资料按钮 ── */
.edit-profile-btn-wrap {
  margin-bottom: 24rpx;
}

.edit-profile-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx 0;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__icon {
    font-size: 32rpx;
  }

  &__text {
    font-size: 28rpx;
    color: $color-primary;
    font-weight: 500;
  }
}

/* ── 信息列表卡 ── */
.profile-info-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 0 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
  margin-bottom: 32rpx;
}

.profile-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 96rpx;
  border-bottom: 2rpx solid $color-divider;

  &--last {
    border-bottom: none;
  }

  &__label {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__value {
    font-size: 28rpx;
    color: $color-text-primary;
  }
}

/* ── 功能菜单 ── */
.profile-menu-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 0 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
  margin-bottom: 32rpx;
}

.menu-section-title {
  display: block;
  font-size: 24rpx;
  color: $color-text-hint;
  padding: 24rpx 0 16rpx;
  font-weight: 500;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 2rpx solid $color-divider;

  &--last {
    border-bottom: none;
  }

  &__icon {
    font-size: 36rpx;
    margin-right: 20rpx;
    line-height: 1;
  }

  &__text {
    flex: 1;
    font-size: 28rpx;
    color: $color-text-primary;
  }

  &__arrow {
    font-size: 32rpx;
    color: $color-text-hint;
  }
}

.language-badge {
  padding: 4rpx 12rpx;
  background-color: $color-primary;
  border-radius: 16rpx;
  margin-right: 12rpx;

  &__text {
    font-size: 20rpx;
    color: #ffffff;
    font-weight: 600;
  }
}

/* ── 订单统计卡片 ── */
.order-stats-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 32rpx 0;
  margin: 24rpx -32rpx;
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
  border-radius: 16rpx;
}

.order-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;

  &__value {
    font-size: 40rpx;
    font-weight: 700;
    color: $color-primary;
  }

  &__label {
    font-size: 22rpx;
    color: $color-text-secondary;
  }
}

.order-stat-divider {
  width: 2rpx;
  height: 60rpx;
  background-color: $color-divider;
}

/* ── 登出按钮 ── */
.profile-logout-btn {
  width: 100%;
  height: 88rpx;
  background-color: $color-bg-card;
  color: #E05252;
  font-size: 30rpx;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
  margin-bottom: 32rpx;
}
</style>
