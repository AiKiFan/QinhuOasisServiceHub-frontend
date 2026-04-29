<!--
  个人中心页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import TabBar from '@/components/TabBar/index.vue'
import { isLoggedIn, getUser, saveUser, logout } from '@/utils/auth'
import { getMyProfile } from '@/api/user'

/** 是否已登录 */
const loggedIn = ref(false)
/** 用户信息 */
const userInfo = ref(null)

/** 角色名称映射 */
const ROLE_LABELS = {
  0: '游客',
  1: '学生讲解员',
  2: '管理员',
}

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
  loggedIn.value = isLoggedIn()
  if (!loggedIn.value) return
  userInfo.value = getUser()
  try {
    const fresh = await getMyProfile()
    userInfo.value = fresh
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
    title: '确认登出',
    content: '确定要退出登录吗？',
    success(res) {
      if (!res.confirm) return
      logout()
      loggedIn.value = false
      userInfo.value = null
    },
  })
}

onMounted(init)
</script>

<template>
  <view class="profile-page">
    <!-- ── 未登录视图 ── -->
    <view v-if="!loggedIn" class="profile-guest">
      <text class="profile-guest__icon">👤</text>
      <text class="profile-guest__tip">登录后享受完整服务</text>
      <button class="profile-guest__login-btn" @tap="goLogin">立即登录</button>
      <button class="profile-guest__register-btn" @tap="goRegister">免费注册</button>
    </view>

    <!-- ── 已登录视图 ── -->
    <view v-else class="profile-user">
      <!-- 头部信息卡 -->
      <view class="profile-hero">
        <view class="profile-hero__avatar-wrap">
          <image
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
            {{ ROLE_LABELS[userInfo.role] ?? '游客' }}
          </text>
        </view>
      </view>

      <!-- 信息列表 -->
      <view class="profile-info-card">
        <view class="profile-info-item">
          <text class="profile-info-item__label">用户名</text>
          <text class="profile-info-item__value">{{ userInfo ? userInfo.username : '' }}</text>
        </view>
        <view class="profile-info-item profile-info-item--last">
          <text class="profile-info-item__label">用户 ID</text>
          <text class="profile-info-item__value">{{ userInfo ? userInfo.userId : '' }}</text>
        </view>
      </view>

      <!-- 登出按钮 -->
      <button class="profile-logout-btn" @tap="handleLogout">退出登录</button>
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

/* 信息列表卡 */
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

/* 登出按钮 */
.profile-logout-btn {
  width: 100%;
  height: 88rpx;
  background-color: $color-bg-card;
  color: #E05252;
  font-size: 30rpx;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}
</style>
