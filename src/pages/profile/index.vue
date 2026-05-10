<!--
  个人中心页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import TabBar from '@/components/TabBar/index.vue'
import { isLoggedIn, getUser, saveUser, logout, isAdmin as checkIsAdmin } from '@/utils/auth'
import { getMyProfile } from '@/api/user'
import { getMyProfile as getInterpreterProfile } from '@/api/interpreter'
import { getLanguage, toggleLanguage as toggleLang, t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

/** 是否已登录 */
const loggedIn = ref(false)
/** 用户信息 */
const userInfo = ref(null)
/** 当前语言 */
const currentLang = ref('zh-CN')
/** 是否管理员 */
const isAdmin = ref(false)
/** 是否显示退出确认弹窗 */
const showLogoutConfirm = ref(false)

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
  showLogoutConfirm.value = true
}

/** 确认退出 */
function confirmLogout() {
  logout()
  loggedIn.value = false
  userInfo.value = null
  isAdmin.value = false
  showLogoutConfirm.value = false
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

/** 跳转译员申请页（Bug #12: 不同身份不同弹窗） */
async function goApplyInterpreter() {
  const user = getUser()
  if (!user) {
    uni.navigateTo({ url: '/pages/interpreter/apply' })
    return
  }
  // 管理员
  if (user.role === 2) {
    showIdentityDialog.value = 'admin'
    return
  }
  // 检查是否已有译员档案
  try {
    const profile = await getInterpreterProfile()
    if (profile) {
      if (profile.status === 1) {
        // 已通过
        showIdentityDialog.value = 'already'
        return
      } else {
        // 有申请（待审核/已拒绝），跳转到申请状态页
        uni.navigateTo({ url: '/pages/interpreter/my-application' })
        return
      }
    }
  } catch {
    // 忽略错误，直接跳转申请页
  }
  // 游客，正常进入申请页
  uni.navigateTo({ url: '/pages/interpreter/apply' })
}

/** 身份弹窗 */
const showIdentityDialog = ref('')

function closeIdentityDialog() {
  showIdentityDialog.value = ''
}

/** 跳转我的翻译订单 */
function goMyOrders() {
  uni.navigateTo({ url: '/pages/interpreter-orders/list' })
}

/** 跳转投诉建议提交页 */
function goFeedback() {
  uni.navigateTo({ url: '/pages/feedback/submit' })
}

/** 跳转我的投诉建议 */
function goMyFeedback() {
  uni.navigateTo({ url: '/pages/feedback/my-feedback' })
}

/** 跳转我的收藏 */
function goFavorites() {
  uni.navigateTo({ url: '/pages/favorites/index' })
}

/** 跳转景区导览 */
function goScenicList() {
  uni.navigateTo({ url: '/pages/scenic/list' })
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

/** 跳转管理端：餐厅管理 */
function goAdminRestaurant() {
  uni.navigateTo({ url: '/pages/admin/restaurant-list' })
}

/** 跳转编辑资料页 */
function goEditProfile() {
  uni.navigateTo({ url: '/pages/profile/edit' })
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.profile.title') })
  init()
})
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

        <!-- 景区导览 -->
        <view class="menu-item" @tap="goScenicList">
          <text class="menu-item__icon">🏔️</text>
          <text class="menu-item__text">{{ t('scenic.title') }}</text>
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
          <text class="menu-item__text">{{ t('page.ordersReceived.title') }}</text>
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

        <!-- 我的投诉建议 -->
        <view class="menu-item" @tap="goMyFeedback">
          <text class="menu-item__icon">📋</text>
          <text class="menu-item__text">{{ t('feedback.view.title') }}</text>
          <text class="menu-item__arrow">›</text>
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

        <view class="menu-item" @tap="goAdminRestaurant">
          <view class="menu-item__icon-img">
            <image src="/static/icons/restaurant.svg" mode="aspectFit" class="menu-item__svg-icon" />
          </view>
          <text class="menu-item__text">{{ t('profile.adminRestaurant') }}</text>
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

    <!-- 自定义退出确认弹窗 -->
    <view v-if="showLogoutConfirm" class="confirm-mask" @tap.self="showLogoutConfirm = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('profile.logoutConfirmTitle') }}</text>
        <text class="confirm-dialog__content">{{ t('profile.logoutConfirmContent') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--cancel" @tap="showLogoutConfirm = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="confirm-dialog__btn confirm-dialog__btn--confirm" @tap="confirmLogout">
            <text>{{ t('profile.logout') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 身份弹窗（申请译员时） -->
    <view v-if="showIdentityDialog" class="confirm-mask" @tap.self="closeIdentityDialog">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('profile.applyInterpreter') }}</text>
        <text class="confirm-dialog__content">
          {{ showIdentityDialog === 'admin' ? t('interpreter.identity.adminMessage') : t('interpreter.identity.alreadyMessage') }}
        </text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--confirm" @tap="closeIdentityDialog" style="flex:1">
            <text>{{ t('common.confirm') }}</text>
          </view>
        </view>
      </view>
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
    display: inline-flex;
    align-items: center;
  }

  &__icon-img {
    width: 44rpx;
    height: 44rpx;
    margin-right: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__svg-icon {
    width: 36rpx;
    height: 36rpx;
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

/* ── 自定义确认弹窗 ── */
.confirm-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.confirm-dialog {
  width: 560rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  overflow: hidden;

  &__title {
    display: block;
    text-align: center;
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
    padding: 48rpx 40rpx 16rpx;
  }

  &__content {
    display: block;
    text-align: center;
    font-size: 26rpx;
    color: $color-text-secondary;
    padding: 0 40rpx 48rpx;
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    border-top: 2rpx solid $color-divider;
  }

  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 96rpx;
    font-size: 30rpx;

    &--cancel {
      color: $color-text-secondary;
      border-right: 2rpx solid $color-divider;
    }

    &--confirm {
      color: #E05252;
      font-weight: 600;
    }
  }
}
</style>
