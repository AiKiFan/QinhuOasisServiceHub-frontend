<!--
  用户注册页
  @author AiKiFan
-->
<script setup>
import { ref } from 'vue'
import { register } from '@/api/auth'

/** 表单字段 */
const username = ref('')
const nickname = ref('')
const password = ref('')
const confirmPwd = ref('')
/** 提交中状态 */
const submitting = ref(false)

/** 校验常量 */
const USERNAME_MIN_LEN = 3
const PASSWORD_MIN_LEN = 6

/**
 * 提交注册
 */
async function handleRegister() {
  if (username.value.trim().length < USERNAME_MIN_LEN) {
    uni.showToast({ title: `用户名至少 ${USERNAME_MIN_LEN} 位`, icon: 'none' })
    return
  }
  if (password.value.length < PASSWORD_MIN_LEN) {
    uni.showToast({ title: `密码至少 ${PASSWORD_MIN_LEN} 位`, icon: 'none' })
    return
  }
  if (password.value !== confirmPwd.value) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await register(username.value.trim(), password.value, nickname.value.trim())
    uni.showToast({ title: '注册成功，请登录', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="register-page">
    <view class="register-brand">
      <text class="register-brand__logo">🏯</text>
      <text class="register-brand__title">创建账号</text>
      <text class="register-brand__sub">加入沁湖驿站云服务平台</text>
    </view>

    <view class="register-card">
      <view class="register-field">
        <text class="register-field__label">
          用户名 <text class="register-field__required">*</text>
        </text>
        <input
          v-model="username"
          class="register-field__input"
          placeholder="3-32 位字母/数字"
          placeholder-style="color:#B0A090"
          maxlength="32"
        />
      </view>

      <view class="register-field">
        <text class="register-field__label">昵称（可选）</text>
        <input
          v-model="nickname"
          class="register-field__input"
          placeholder="留空则默认使用用户名"
          placeholder-style="color:#B0A090"
          maxlength="20"
        />
      </view>

      <view class="register-field">
        <text class="register-field__label">
          密码 <text class="register-field__required">*</text>
        </text>
        <input
          v-model="password"
          class="register-field__input"
          placeholder="至少 6 位"
          placeholder-style="color:#B0A090"
          password
          maxlength="64"
        />
      </view>

      <view class="register-field">
        <text class="register-field__label">
          确认密码 <text class="register-field__required">*</text>
        </text>
        <input
          v-model="confirmPwd"
          class="register-field__input"
          placeholder="再次输入密码"
          placeholder-style="color:#B0A090"
          password
          maxlength="64"
        />
      </view>

      <button
        class="register-btn"
        :disabled="submitting"
        @tap="handleRegister"
      >
        {{ submitting ? '注册中...' : '注 册' }}
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.register-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 48rpx 80rpx;
}

.register-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 80rpx;
  margin-bottom: 48rpx;

  &__logo {
    font-size: 80rpx;
    line-height: 1;
    margin-bottom: 12rpx;
  }

  &__title {
    font-size: 44rpx;
    font-weight: 700;
    color: $color-text-primary;
  }

  &__sub {
    margin-top: 10rpx;
    font-size: 24rpx;
    color: $color-text-hint;
  }
}

.register-card {
  width: 100%;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(232, 149, 109, 0.12);
}

.register-field {
  margin-bottom: 28rpx;

  &__label {
    display: block;
    font-size: 24rpx;
    color: $color-text-secondary;
    margin-bottom: 10rpx;
  }

  &__required {
    color: #E05252;
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

.register-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  margin-top: 8rpx;
  letter-spacing: 4rpx;

  &[disabled] {
    opacity: 0.6;
  }
}
</style>
