<!--
  用户注册页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { register } from '@/api/auth'
import { t, toggleLanguage } from '@/utils/i18n'

/** 语言切换并刷新页面 */
function switchLang() {
  toggleLanguage()
  uni.reLaunch({ url: '/pages/register/index' })
}

/** 表单字段 */
const username = ref('')
const nickname = ref('')
const password = ref('')
const confirmPwd = ref('')
/** 提交中状态 */
const submitting = ref(false)
/** 错误弹窗状态 */
const showErrorHint = ref(false)
const errorMessage = ref('')

/** 显示错误弹窗 */
function showErrorDialog(msg) {
  errorMessage.value = msg
  showErrorHint.value = true
}

/** 校验常量 */
const USERNAME_MIN_LEN = 3
const PASSWORD_MIN_LEN = 6

/**
 * 提交注册
 */
async function handleRegister() {
  if (username.value.trim().length < USERNAME_MIN_LEN) {
    showErrorDialog(t('auth.usernameTooShort', { n: USERNAME_MIN_LEN }))
    return
  }
  if (password.value.length < PASSWORD_MIN_LEN) {
    showErrorDialog(t('auth.passwordTooShort', { n: PASSWORD_MIN_LEN }))
    return
  }
  if (password.value !== confirmPwd.value) {
    showErrorDialog(t('auth.passwordMismatch'))
    return
  }
  submitting.value = true
  try {
    await register(username.value.trim(), password.value, nickname.value.trim(), { silent: true })
    uni.showToast({ title: t('auth.registerSuccess'), icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch (e) {
    showErrorDialog(e.message || t('auth.registerFailed'))
    password.value = ''
    confirmPwd.value = ''
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.register.title') })
})
</script>

<template>
  <view class="register-page">
    <view class="register-brand">
      <text class="register-brand__logo">🏯</text>
      <text class="register-brand__title">{{ t('auth.registerTitle') }}</text>
      <text class="register-brand__sub">{{ t('auth.registerSub') }}</text>
    </view>

    <view class="register-card">
      <view class="register-field">
        <text class="register-field__label">
          {{ t('auth.username') }} <text class="register-field__required">*</text>
        </text>
        <input
          v-model="username"
          class="register-field__input"
          :placeholder="t('auth.usernamePlaceholder')"
          placeholder-style="color:#B0A090"
          maxlength="32"
        />
      </view>

      <view class="register-field">
        <text class="register-field__label">{{ t('auth.nickname') }} {{ t('common.optional') }}</text>
        <input
          v-model="nickname"
          class="register-field__input"
          :placeholder="t('auth.nicknameDefault')"
          placeholder-style="color:#B0A090"
          maxlength="20"
        />
      </view>

      <view class="register-field">
        <text class="register-field__label">
          {{ t('auth.password') }} <text class="register-field__required">*</text>
        </text>
        <input
          v-model="password"
          class="register-field__input"
          :placeholder="t('auth.passwordPlaceholder')"
          placeholder-style="color:#B0A090"
          password
          maxlength="64"
        />
      </view>

      <view class="register-field">
        <text class="register-field__label">
          {{ t('auth.confirmPassword') }} <text class="register-field__required">*</text>
        </text>
        <input
          v-model="confirmPwd"
          class="register-field__input"
          :placeholder="t('auth.confirmPasswordPlaceholder')"
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
        {{ submitting ? t('auth.registering') : t('auth.registerBtn') }}
      </button>

      <view class="lang-switch-btn" @tap="switchLang">
        <text class="lang-switch-btn__text">🌐 {{ t('profile.switchLang') }}</text>
      </view>
    </view>
  </view>

  <!-- 错误提示弹窗 -->
  <view v-if="showErrorHint" class="error-overlay" @tap.self="showErrorHint = false">
    <view class="error-dialog" @tap.stop>
      <view class="error-dialog__icon">!</view>
      <text class="error-dialog__title">{{ t('common.tip') }}</text>
      <text class="error-dialog__msg">{{ errorMessage }}</text>
      <view class="error-dialog__btn" @tap="showErrorHint = false">{{ t('common.confirm') }}</view>
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

.lang-switch-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  margin-top: 24rpx;

  &__text {
    letter-spacing: 2rpx;
  }
}

/* ── 错误提示弹窗 ── */
.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 32rpx;
}

.error-dialog {
  width: 100%;
  max-width: 600rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  padding: 60rpx 32rpx 48rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  text-align: center;

  &__icon {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%);
    color: #fff;
    font-size: 48rpx;
    font-weight: 700;
    line-height: 100rpx;
    text-align: center;
    margin: 0 auto 24rpx;
  }

  &__title {
    display: block;
    font-size: 34rpx;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: 12rpx;
  }

  &__msg {
    display: block;
    font-size: 26rpx;
    color: $color-text-secondary;
    line-height: 1.5;
    margin-bottom: 36rpx;
  }

  &__btn {
    display: block;
    width: 100%;
    height: 80rpx;
    border-radius: 40rpx;
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 600;
    line-height: 80rpx;
    text-align: center;
    border: none;
  }
}
</style>
