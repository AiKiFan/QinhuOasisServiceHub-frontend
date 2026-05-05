<!--
  个人信息编辑页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { getMyProfile, updateMyProfile } from '@/api/user'
import { getUser, saveUser } from '@/utils/auth'
import { t } from '@/utils/i18n'
import { saveImageCache } from '@/utils/image-cache'
import SafeImage from '@/components/SafeImage/index.vue'

/** 用户信息 */
const user = ref(getUser() || {})
/** 表单数据 */
const form = ref({
  nickname: '',
  email: '',
  avatar: '',
})
/** 加载状态 */
const loading = ref(false)
/** 提交状态 */
const submitting = ref(false)

/**
 * 加载用户信息
 */
async function loadUser() {
  loading.value = true
  try {
    const data = await getMyProfile()
    user.value = data
    form.value = {
      nickname: data.nickname || '',
      email: data.email || '',
      avatar: data.avatar || '',
    }
  } catch {
    // 错误已在 request.js 中统一提示
  } finally {
    loading.value = false
  }
}

/**
 * 选择头像
 */
function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success(res) {
      const tempFilePath = res.tempFilePaths[0]
      uploadAvatar(tempFilePath)
    },
  })
}

/**
 * 上传头像
 * @param {string} filePath
 */
async function uploadAvatar(filePath) {
  uni.showLoading({ title: t('profile.edit.uploading'), mask: true })
  try {
    const uploadRes = await new Promise((resolve, reject) => {
      uni.uploadFile({
        url: '/api/files/upload',
        filePath,
        name: 'file',
        header: {
          Authorization: `Bearer ${uni.getStorageSync('token')}`,
        },
        success(res) {
          try {
            const data = JSON.parse(res.data)
            if (data.code === 200) {
              resolve(data.data)
            } else {
              reject(new Error(data.message || t('profile.edit.uploadFailed')))
            }
          } catch (e) {
            reject(new Error(t('profile.edit.uploadFailed')))
          }
        },
        fail() {
          reject(new Error(t('profile.edit.uploadFailed')))
        },
      })
    })
    // 保存 MinIO URL
    form.value.avatar = uploadRes.url

    // 同时保存到本地缓存（MinIO 关闭后仍可显示）
    await saveImageCache(uploadRes.url, filePath)
  } catch (e) {
    uni.showToast({ title: e.message || t('profile.edit.uploadFailed'), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

/**
 * 预览头像
 */
function previewAvatar() {
  if (!form.value.avatar) return
  // 阻止触发父元素的 chooseAvatar
  uni.previewImage({ urls: [form.value.avatar], current: form.value.avatar })
}

/**
 * 提交保存
 */
async function handleSubmit() {
  if (!form.value.nickname.trim()) {
    uni.showToast({ title: t('profile.edit.nicknameRequired'), icon: 'none' })
    return
  }
  if (!form.value.email.trim()) {
    uni.showToast({ title: t('profile.edit.emailRequired'), icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await updateMyProfile({
      nickname: form.value.nickname.trim(),
      email: form.value.email.trim(),
      avatar: form.value.avatar,
    })
    uni.showToast({ title: t('profile.edit.saveSuccess'), icon: 'success' })
    // 更新本地用户信息
    const updatedUser = { ...user.value, ...form.value }
    saveUser(updatedUser)
    // 返回上一页
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch {
    /* error handled by request.js */
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadUser()
})
</script>

<template>
  <view class="profile-edit-page">
    <!-- 头部导航 -->
    <view class="nav-bar">
      <view class="nav-bar__back" @tap="() => uni.navigateBack()">
        <text class="nav-bar__back-icon">←</text>
      </view>
      <text class="nav-bar__title">{{ t('profile.edit.title') }}</text>
      <view class="nav-bar__placeholder"></view>
    </view>

    <!-- 加载中状态 -->
    <view v-if="loading" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 编辑表单 -->
    <view v-else class="edit-form">
      <!-- 头像编辑 -->
      <view class="avatar-section" @tap="chooseAvatar">
        <view class="avatar-container">
          <SafeImage
            v-if="form.avatar"
            class="avatar"
            :src="form.avatar"
            mode="aspectFill"
            :previewable="false"
            @tap.stop="previewAvatar"
          />
          <view v-else class="avatar-placeholder">
            <text class="avatar-placeholder__icon">📷</text>
            <text class="avatar-placeholder__text">{{ t('profile.edit.uploadAvatar') }}</text>
          </view>
        </view>
        <text class="avatar-section__nickname">{{ form.nickname || user.nickname || t('profile.edit.nickname') }}</text>
        <text class="avatar-section__arrow">›</text>
      </view>

      <!-- 用户名（只读） -->
      <view class="form-item">
        <text class="form-item__label">{{ t('profile.username') }}</text>
        <text class="form-item__value form-item__value--readonly">{{ user.username || '-' }}</text>
      </view>

      <!-- 昵称编辑 -->
      <view class="form-item">
        <text class="form-item__label">{{ t('profile.edit.nickname') }}</text>
        <input
          class="form-item__input"
          v-model="form.nickname"
          :placeholder="t('profile.edit.nicknamePlaceholder')"
          maxlength="20"
        />
      </view>

      <!-- 邮箱编辑 -->
      <view class="form-item">
        <text class="form-item__label">{{ t('profile.email') }}</text>
        <input
          class="form-item__input"
          v-model="form.email"
          :placeholder="t('profile.edit.emailPlaceholder')"
          type="email"
          maxlength="50"
        />
      </view>

      <!-- 用户 ID（只读） -->
      <view class="form-item">
        <text class="form-item__label">{{ t('profile.userId') }}</text>
        <text class="form-item__value form-item__value--readonly">{{ user.userId || '-' }}</text>
      </view>

      <!-- 保存按钮 -->
      <button
        class="save-btn"
        :class="{ 'save-btn--disabled': submitting }"
        :disabled="submitting"
        @tap="handleSubmit"
      >
        {{ submitting ? t('common.submitting') : t('profile.edit.save') }}
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.profile-edit-page {
  min-height: 100vh;
  background-color: $color-bg-page;
}

/* ── 头部导航 ── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: $color-bg-card;
  border-bottom: 2rpx solid $color-divider;

  &__back {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__back-icon {
    font-size: 48rpx;
    color: $color-text-primary;
    font-weight: 600;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
  }

  &__placeholder {
    width: 64rpx;
  }
}

.status {
  display: flex;
  justify-content: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}

.edit-form {
  padding: 32rpx 24rpx;
}

/* ── 头像编辑 ── */
.avatar-section {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  cursor: pointer;
  transition: background-color 0.2s;

  &:active {
    background-color: $color-bg-page;
  }

  &__nickname {
    flex: 1;
    margin-left: 24rpx;
    font-size: 28rpx;
    color: $color-text-primary;
    font-weight: 500;
  }

  &__arrow {
    margin-left: 12rpx;
    font-size: 80rpx;
    color: $color-text-hint;
    font-weight: 300;
    line-height: 1;
  }
}

.avatar-container {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 2rpx solid $color-divider;
  background-color: $color-bg-page;
  flex-shrink: 0;
}

.avatar {
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;

  &__icon {
    font-size: 40rpx;
  }

  &__text {
    font-size: 20rpx;
    color: $color-text-hint;
  }
}

/* ── 表单项 ── */
.form-item {
  display: flex;
  align-items: center;
  min-height: 100rpx;
  padding: 0 24rpx;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;

  &__label {
    width: 160rpx;
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__input {
    flex: 1;
    font-size: 28rpx;
    color: $color-text-primary;
  }

  &__value {
    flex: 1;
    font-size: 28rpx;
    color: $color-text-primary;

    &--readonly {
      color: $color-text-hint;
    }
  }
}

/* ── 保存按钮 ── */
.save-btn {
  width: 100%;
  height: 88rpx;
  margin-top: 32rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  line-height: 88rpx;

  &--disabled {
    opacity: 0.6;
  }
}
</style>