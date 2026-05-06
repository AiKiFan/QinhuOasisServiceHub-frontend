<!--
  用户登录页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { login } from '@/api/auth'
import { saveToken, saveUser } from '@/utils/auth'
import { t } from '@/utils/i18n'

/** 表单字段 */
const username = ref('')
const password = ref('')
/** 提交中状态（防重复点击） */
const submitting = ref(false)

/** 表单校验常量 */
const USERNAME_MIN_LEN = 3
const PASSWORD_MIN_LEN = 6

/**
 * 提交登录
 */
async function handleLogin() {
  if (username.value.trim().length < USERNAME_MIN_LEN) {
    uni.showToast({ title: `用户名至少 ${USERNAME_MIN_LEN} 位`, icon: 'none' })
    return
  }
  if (password.value.length < PASSWORD_MIN_LEN) {
    uni.showToast({ title: `密码至少 ${PASSWORD_MIN_LEN} 位`, icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const res = await login(username.value.trim(), password.value)
    saveToken(res.token)
    saveUser({
      userId: res.userId,
      username: res.username,
      nickname: res.nickname,
      role: res.role,
      avatar: res.avatar,
    })
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/profile/index' }), 800)
  } catch (err) {
    // 错误已在 request.js 中统一提示，无需重复处理
  } finally {
    submitting.value = false
  }
}

/** 跳转注册页 */
function goRegister() {
  uni.navigateTo({ url: '/pages/register/index' })
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.login.title') })
})
</script>

<template>
  <view class="login-page">
    <!-- 品牌区 -->
    <view class="login-brand">
      <text class="login-brand__logo">🏯</text>
      <text class="login-brand__title">沁湖驿站</text>
      <text class="login-brand__sub">智慧旅游云服务平台</text>
    </view>

    <!-- 表单卡片 -->
    <view class="login-card">
      <view class="login-field">
        <text class="login-field__label">{{ t('auth.username') }}</text>
        <input
          v-model="username"
          class="login-field__input"
          :placeholder="t('auth.usernamePlaceholder')"
          placeholder-style="color:#B0A090"
          maxlength="32"
        />
      </view>

      <view class="login-field">
        <text class="login-field__label">{{ t('auth.password') }}</text>
        <input
          v-model="password"
          class="login-field__input"
          :placeholder="t('auth.passwordPlaceholder')"
          placeholder-style="color:#B0A090"
          password
          maxlength="64"
        />
      </view>

      <button
        class="login-btn"
        :disabled="submitting"
        @tap="handleLogin"
      >
        {{ submitting ? t('auth.loggingIn') : t('auth.loginBtn') }}
      </button>

      <view class="login-footer">
        <text class="login-footer__text">{{ t('auth.noAccount') }}</text>
        <text class="login-footer__link" @tap="goRegister">{{ t('auth.registerBtn') }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.login-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 48rpx;
}

/* ── 品牌区 ── */
.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  margin-bottom: 64rpx;

  &__logo {
    font-size: 96rpx;
    line-height: 1;
    margin-bottom: 16rpx;
  }

  &__title {
    font-size: 48rpx;
    font-weight: 700;
    color: $color-text-primary;
    letter-spacing: 4rpx;
  }

  &__sub {
    margin-top: 12rpx;
    font-size: 24rpx;
    color: $color-text-hint;
  }
}

/* ── 表单卡片 ── */
.login-card {
  width: 100%;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(232, 149, 109, 0.12);
}

/* ── 字段 ── */
.login-field {
  margin-bottom: 32rpx;

  &__label {
    display: block;
    font-size: 24rpx;
    color: $color-text-secondary;
    margin-bottom: 12rpx;
  }

  &__input {
    width: 100%;
    height: 88rpx;
    background-color: $color-bg-page;
    border-radius: 12rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    color: $color-text-primary;
    border: 2rpx solid $color-divider;
    box-sizing: border-box;
  }
}

/* ── 登录按钮 ── */
.login-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  margin-top: 16rpx;
  letter-spacing: 4rpx;

  &[disabled] {
    opacity: 0.6;
  }
}

/* ── 底部注册链接 ── */
.login-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 32rpx;

  &__text {
    font-size: 26rpx;
    color: $color-text-hint;
  }

  &__link {
    font-size: 26rpx;
    color: $color-primary;
    font-weight: 600;
  }
}
</style>
