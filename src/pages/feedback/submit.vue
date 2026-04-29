<!--
  投诉建议提交页（用户端）
  @author AiKiFan
-->
<script setup>
import { ref, computed } from 'vue'
import { submitFeedback, uploadFeedbackImage } from '@/api/feedback'
import { isLoggedIn } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

/** 反馈类型选项（支持国际化） */
const FEEDBACK_TYPES = computed(() => [
  { value: 1, label: t('feedback.type.complaint'), icon: '⚠️', color: '#E05252' },
  { value: 2, label: t('feedback.type.suggestion'), icon: '💡', color: '#4CAF50' },
  { value: 3, label: t('feedback.type.consult'), icon: '❓', color: '#2196F3' },
  { value: 4, label: t('feedback.type.other'), icon: '📝', color: '#9BA3AF' },
])

/** 反馈表单 */
const form = ref({
  feedbackType: 1,
  title: '',
  content: '',
  contact: '',
})

/** 已上传的图片 URL 列表 */
const uploadedImages = ref([])

/** 提交中状态 */
const submitting = ref(false)

/** 选中的类型信息 */
const selectedType = computed(() => FEEDBACK_TYPES.find(t => t.value === form.value.feedbackType))

/**
 * 选择反馈类型
 * @param {number} type
 */
function selectType(type) {
  form.value.feedbackType = type
}

/**
 * 选择图片
 */
function chooseImage() {
  uni.chooseImage({
    count: 9 - uploadedImages.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      for (const filePath of res.tempFilePaths) {
        try {
          uni.showLoading({ title: t('common.uploading'), mask: true })
          const result = await uploadFeedbackImage(filePath)
          uploadedImages.value.push(result.url)
          uni.hideLoading()
        } catch (e) {
          uni.hideLoading()
          uni.showToast({ title: t('common.uploadFailed'), icon: 'none' })
        }
      }
    },
  })
}

/**
 * 删除已上传图片
 * @param {number} index
 */
function removeImage(index) {
  uploadedImages.value.splice(index, 1)
}

/**
 * 提交反馈
 */
async function handleSubmit() {
  if (!isLoggedIn()) {
    uni.showModal({
      title: t('common.tip'),
      content: t('feedback.loginRequired'),
      confirmText: t('feedback.goLogin'),
      success(res) {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' })
        }
      },
    })
    return
  }

  if (!form.value.title.trim()) {
    uni.showToast({ title: t('feedback.titleRequired'), icon: 'none' })
    return
  }

  if (!form.value.content.trim()) {
    uni.showToast({ title: t('feedback.contentRequired'), icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await submitFeedback({
      feedbackType: form.value.feedbackType,
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      contact: form.value.contact.trim() || undefined,
      images: uploadedImages.value.length > 0 ? uploadedImages.value : undefined,
    })
    uni.showToast({ title: t('feedback.success'), icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch {
    // 错误已在 request.js 中处理
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="feedback-submit-page">
    <!-- 反馈类型选择 -->
    <view class="section">
      <text class="section__title">{{ t('feedback.type.select') }}</text>
      <view class="type-grid">
        <view
          v-for="type in FEEDBACK_TYPES"
          :key="type.value"
          class="type-card"
          :class="{ 'type-card--active': form.feedbackType === type.value }"
          :style="{
            borderColor: form.feedbackType === type.value ? type.color : 'transparent',
            backgroundColor: form.feedbackType === type.value ? `${type.color}15` : '#ffffff',
          }"
          @tap="selectType(type.value)"
        >
          <text class="type-card__icon">{{ type.icon }}</text>
          <text
            class="type-card__label"
            :style="{ color: form.feedbackType === type.value ? type.color : '#333333' }"
          >
            {{ type.label }}
          </text>
        </view>
      </view>
    </view>

    <!-- 标题 -->
    <view class="section">
      <text class="section__title">{{ t('feedback.title') }}</text>
      <input
        class="input"
        v-model="form.title"
        :placeholder="t('feedback.title.placeholder')"
        placeholder-class="input-placeholder"
        maxlength="50"
      />
      <text class="char-count">{{ form.title.length }}/50</text>
    </view>

    <!-- 内容 -->
    <view class="section">
      <text class="section__title">{{ t('feedback.content') }}</text>
      <textarea
        class="textarea"
        v-model="form.content"
        :placeholder="t('feedback.content.placeholder')"
        placeholder-class="textarea-placeholder"
        maxlength="500"
      />
      <text class="char-count">{{ form.content.length }}/500</text>
    </view>

    <!-- 联系方式 -->
    <view class="section">
      <text class="section__title">{{ t('feedback.contact') }}</text>
      <input
        class="input"
        v-model="form.contact"
        :placeholder="t('feedback.contact.placeholder')"
        placeholder-class="input-placeholder"
        maxlength="100"
      />
    </view>

    <!-- 图片上传 -->
    <view class="section">
      <text class="section__title">{{ t('feedback.images') }}</text>
      <view class="image-grid">
        <view
          v-for="(img, idx) in uploadedImages"
          :key="idx"
          class="image-item"
        >
          <SafeImage
            class="image-item__img"
            :src="img"
            mode="aspectFill"
            :previewable="true"
          />
          <view class="image-item__delete" @tap="removeImage(idx)">
            <text class="image-item__delete-icon">×</text>
          </view>
        </view>
        <view v-if="uploadedImages.length < 9" class="image-add" @tap="chooseImage">
          <text class="image-add__icon">+</text>
          <text class="image-add__text">{{ t('feedback.images.add') }}</text>
        </view>
      </view>
      <text class="image-tip">{{ t('feedback.images.max') }}</text>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-area">
      <button
        class="submit-btn"
        :class="{ 'submit-btn--disabled': submitting }"
        :disabled="submitting"
        @tap="handleSubmit"
      >
        {{ submitting ? t('feedback.submitting') : t('feedback.submit') }}
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.feedback-submit-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding: 24rpx;
}

/* ── 表单区块 ── */
.section {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__title {
    display: block;
    font-size: 28rpx;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: 20rpx;
  }
}

/* ── 类型选择 ── */
.type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 12rpx;
  border-radius: 16rpx;
  border: 4rpx solid transparent;
  transition: all 0.2s;

  &__icon {
    font-size: 40rpx;
    line-height: 1;
  }

  &__label {
    font-size: 24rpx;
    font-weight: 600;
  }

  &--active {
    transform: scale(1.05);
  }
}

/* ── 输入框 ── */
.input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: $color-text-primary;
  box-sizing: border-box;
}

.input-placeholder {
  color: $color-text-hint;
}

/* ── 文本域 ── */
.textarea {
  width: 100%;
  height: 240rpx;
  padding: 24rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: $color-text-primary;
  line-height: 1.6;
  box-sizing: border-box;
}

.textarea-placeholder {
  color: $color-text-hint;
}

/* ── 字数统计 ── */
.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: $color-text-hint;
  margin-top: 12rpx;
}

/* ── 图片上传 ── */
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;

  &__img {
    width: 100%;
    height: 100%;
  }

  &__delete {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    width: 40rpx;
    height: 40rpx;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__delete-icon {
    font-size: 28rpx;
    color: #ffffff;
    font-weight: 700;
    line-height: 1;
  }
}

.image-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  aspect-ratio: 1;
  background-color: $color-bg-page;
  border: 2rpx dashed $color-divider;
  border-radius: 12rpx;

  &__icon {
    font-size: 48rpx;
    color: $color-primary;
    line-height: 1;
  }

  &__text {
    font-size: 22rpx;
    color: $color-text-hint;
  }
}

.image-tip {
  display: block;
  font-size: 22rpx;
  color: $color-text-hint;
  margin-top: 12rpx;
}

/* ── 提交按钮 ── */
.submit-area {
  padding: 16rpx 0 48rpx;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  line-height: 88rpx;

  &--disabled {
    opacity: 0.6;
  }
}
</style>
