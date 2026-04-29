<!--
  申请成为译员页
  @author AiKiFan
-->
<script setup>
import { ref, computed } from 'vue'
import { applyInterpreter, uploadInterpreterCert } from '@/api/interpreter'
import { isLoggedIn } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

/** 英语等级选项（支持国际化） */
const ENGLISH_LEVELS = computed(() => [
  { value: 0, label: t('interpreter.level.cet4') },
  { value: 1, label: t('interpreter.level.cet6') },
  { value: 2, label: t('interpreter.level.tem4') },
  { value: 3, label: t('interpreter.level.tem8') },
  { value: 4, label: t('interpreter.level.other') },
])

/** 服务类型选项（支持国际化） */
const SERVICE_TYPES = computed(() => [
  { value: 1, label: t('interpreter.type.personalTag') },
  { value: 2, label: t('interpreter.type.teamTag') },
])

/** 表单数据 */
const form = ref({
  realName: '',
  studentId: '',
  school: '',
  englishLevel: 1,
  certUrl: '',
  introduction: '',
  introductionEn: '',
  serviceTypes: 3,
  hourlyRate: 50,
})

/** 提交中状态 */
const submitting = ref(false)

/** 选择英语等级 */
function chooseEnglishLevel() {
  const options = ENGLISH_LEVELS.value.map(el => el.label)
  uni.showActionSheet({
    itemList: options,
    success: (res) => {
      if (res.tapIndex !== undefined) {
        form.value.englishLevel = ENGLISH_LEVELS.value[res.tapIndex].value
      }
    },
  })
}

/** 选择服务类型（多选） */
function toggleServiceType(value) {
  form.value.serviceTypes ^= value
}

/** 选择证书图片 */
function chooseCertImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => {
      const filePath = res.tempFilePaths[0]
  uni.showLoading({ title: t('common.uploading') })
      uploadInterpreterCert(filePath)
        .then(result => {
          form.value.certUrl = result.url
          uni.hideLoading()
          uni.showToast({ title: t('common.uploadSuccess'), icon: 'success' })
        })
        .catch(err => {
          uni.hideLoading()
          uni.showToast({ title: t('common.uploadFailed'), icon: 'none' })
        })
    },
  })
}

/**
 * 预览证书
 */
function previewCert() {
  if (form.value.certUrl) {
    uni.previewImage({ urls: [form.value.certUrl], current: form.value.certUrl })
  }
}

/**
 * 提交申请
 */
async function handleSubmit() {
  if (!isLoggedIn()) {
    uni.showModal({
      title: t('common.tip'),
      content: t('interpreter.apply.loginRequired'),
      confirmText: t('interpreter.goLogin'),
      success(res) {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' })
        }
      },
    })
    return
  }
  if (!form.value.realName) {
    uni.showToast({ title: t('interpreter.apply.realNameRequired'), icon: 'none' })
    return
  }
  if (!form.value.studentId) {
    uni.showToast({ title: t('interpreter.apply.studentIdRequired'), icon: 'none' })
    return
  }
  if (!form.value.school) {
    uni.showToast({ title: t('interpreter.apply.schoolRequired'), icon: 'none' })
    return
  }
  if (!form.value.certUrl) {
    uni.showToast({ title: t('interpreter.apply.certRequired'), icon: 'none' })
    return
  }
  if (!form.value.introduction || !form.value.introductionEn) {
    uni.showToast({ title: t('interpreter.apply.introRequired'), icon: 'none' })
    return
  }
  if (form.value.hourlyRate < 0) {
    uni.showToast({ title: t('interpreter.apply.hourlyRateInvalid'), icon: 'none' })
    return
  }
  if (form.value.serviceTypes === 0) {
    uni.showToast({ title: t('interpreter.apply.serviceTypeRequired'), icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await applyInterpreter({
      realName: form.value.realName,
      studentId: form.value.studentId,
      school: form.value.school,
      englishLevel: form.value.englishLevel,
      certUrl: form.value.certUrl,
      introduction: form.value.introduction,
      introductionEn: form.value.introductionEn,
      serviceTypes: form.value.serviceTypes,
      hourlyRate: Number(form.value.hourlyRate),
    })
    uni.showToast({ title: t('interpreter.apply.submitSuccess'), icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch {
    // 错误已在 request.js 中通过 Toast 展示
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="apply-page">
    <view class="form-card">
      <!-- 真实姓名 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.realName') }} *</text>
        <input
          class="form-input"
          v-model="form.realName"
          :placeholder="t('interpreter.apply.realNamePlaceholder')"
          placeholder-class="form-placeholder"
        />
      </view>

      <!-- 学号 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.studentId') }} *</text>
        <input
          class="form-input"
          v-model="form.studentId"
          :placeholder="t('interpreter.apply.studentIdPlaceholder')"
          placeholder-class="form-placeholder"
        />
      </view>

      <!-- 学校 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.school') }} *</text>
        <input
          class="form-input"
          v-model="form.school"
          :placeholder="t('interpreter.apply.schoolPlaceholder')"
          placeholder-class="form-placeholder"
        />
      </view>

      <!-- 英语等级 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.englishLevel') }} *</text>
        <view class="level-selector" @tap="chooseEnglishLevel">
          <text class="level-selector__label">
            {{ ENGLISH_LEVELS.value.find(el => el.value === form.englishLevel)?.label || t('common.select') }}
          </text>
          <text class="level-selector__arrow">›</text>
        </view>
      </view>

      <!-- 资质证书 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.cert') }} *</text>
        <view v-if="form.certUrl" class="cert-uploaded" @tap="previewCert">
          <SafeImage
            class="cert-preview"
            :src="form.certUrl"
            mode="aspectFill"
            :previewable="true"
          />
          <text class="cert-uploaded__hint">{{ t('interpreter.apply.reuploadHint') }}</text>
        </view>
        <view v-else class="cert-upload" @tap="chooseCertImage">
          <view class="cert-upload__icon">📷</view>
          <text class="cert-upload__text">{{ t('interpreter.apply.uploadCert') }}</text>
        </view>
      </view>

      <!-- 中文介绍 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.introZh') }} *</text>
        <textarea
          class="form-textarea"
          v-model="form.introduction"
          :placeholder="t('interpreter.apply.introPlaceholder')"
          placeholder-class="form-placeholder"
          maxlength="500"
        />
        <text class="char-count">{{ form.introduction.length }}/500</text>
      </view>

      <!-- 英文介绍 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.introEn') }} *</text>
        <textarea
          class="form-textarea"
          v-model="form.introductionEn"
          :placeholder="t('interpreter.apply.introEnPlaceholder')"
          placeholder-class="form-placeholder"
          maxlength="500"
        />
        <text class="char-count">{{ form.introductionEn.length }}/500</text>
      </view>

      <!-- 服务类型 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.serviceType') }} *</text>
        <view class="service-type-selector">
          <view
            v-for="st in SERVICE_TYPES"
            :key="st.value"
            class="service-type-option"
            :class="{ 'service-type-option--active': form.serviceTypes & st.value }"
            @tap="toggleServiceType(st.value)"
          >
            <text class="service-type-option__text">{{ st.label }}</text>
          </view>
        </view>
      </view>

      <!-- 时薪 -->
      <view class="form-section form-section--last">
        <text class="form-section__title">{{ t('interpreter.apply.hourlyRate') }} *</text>
        <input
          class="form-input"
          type="digit"
          v-model.number="form.hourlyRate"
          :placeholder="t('interpreter.apply.hourlyRatePlaceholder')"
          placeholder-class="form-placeholder"
        />
      </view>
    </view>

    <!-- 提交按钮 -->
    <button
      class="submit-btn"
      :class="{ 'submit-btn--disabled': submitting }"
      :disabled="submitting"
      @tap="handleSubmit"
    >
  {{ submitting ? t('common.submitting') : t('interpreter.apply.submitBtn') }}
    </button>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.apply-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding: 24rpx;
}

/* ── 表单卡片 ── */
.form-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 0 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.form-section {
  padding: 32rpx 0;
  border-bottom: 2rpx solid $color-divider;

  &--last {
    border-bottom: none;
  }

  &__title {
    display: block;
    font-size: 28rpx;
    color: $color-text-secondary;
    margin-bottom: 16rpx;
  }
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 16rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: $color-text-primary;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  height: 200rpx;
  padding: 16rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: $color-text-primary;
  line-height: 1.5;
  box-sizing: border-box;
}

.form-placeholder {
  color: $color-text-hint;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: $color-text-hint;
  margin-top: 8rpx;
}

/* ── 英语等级选择器 ── */
.level-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;

  &__label {
    font-size: 28rpx;
    color: $color-text-primary;
  }

  &__arrow {
    font-size: 32rpx;
    color: $color-text-hint;
  }
}

/* ── 证书上传 ── */
.cert-uploaded {
  padding: 20rpx;
  text-align: center;

  &__hint {
    display: block;
    font-size: 22rpx;
    color: $color-primary;
    margin-top: 12rpx;
  }
}

.cert-preview {
  width: 320rpx;
  height: 320rpx;
  border-radius: 12rpx;
  margin: 0 auto;
}

.cert-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200rpx;
  background-color: $color-bg-page;
  border: 2rpx dashed $color-divider;
  border-radius: 12rpx;

  &__icon {
    font-size: 64rpx;
    line-height: 1;
    margin-bottom: 12rpx;
  }

  &__text {
    font-size: 24rpx;
    color: $color-text-hint;
  }
}

/* ── 服务类型选择 ── */
.service-type-selector {
  display: flex;
  gap: 16rpx;
}

.service-type-option {
  flex: 1;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 2rpx solid $color-divider;
  text-align: center;

  &__text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;

    & .service-type-option__text {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

/* ── 提交按钮 ── */
.submit-btn {
  width: 100%;
  height: 88rpx;
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
