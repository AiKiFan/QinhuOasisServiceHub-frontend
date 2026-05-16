<!--
  投诉建议详情页（管理员专用）
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminFeedbackDetail, replyFeedback } from '@/api/admin'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

const detail = ref(null)
const loading = ref(true)

/** 回复弹窗 */
const showReplyModal = ref(false)
const replyContent = ref('')
const replyStatus = ref(2)
const submitting = ref(false)

/** 状态映射 */
const statusMap = computed(() => ({
  0: { label: t('admin.feedback.status.pending'), color: '#FFB22C' },
  1: { label: t('admin.feedback.status.processing'), color: '#2196F3' },
  2: { label: t('admin.feedback.status.resolved'), color: '#4CAF50' },
  3: { label: t('admin.feedback.status.closed'), color: '#9BA3AF' },
}))

/** 类型映射 */
const typeMap = computed(() => ({
  1: { label: t('admin.feedback.type.complaint'), color: '#E05252' },
  2: { label: t('admin.feedback.type.suggestion'), color: '#4CAF50' },
  3: { label: t('admin.feedback.type.consult'), color: '#2196F3' },
  4: { label: t('admin.feedback.type.other'), color: '#9BA3AF' },
}))

/** 解析 images（兼容后端返回的数组或 JSON 字符串） */
function parseImages(images) {
  if (!images) return []
  if (Array.isArray(images)) return images
  try {
    return JSON.parse(images)
  } catch {
    return []
  }
}

/** 预览图片 */
function previewImages(imageList) {
  if (!imageList || imageList.length === 0) return
  uni.previewImage({ urls: imageList, current: imageList[0] })
}

/** 加载详情 */
async function loadDetail() {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const id = currentPage?.options?.id
  if (!id) {
    uni.showToast({ title: t('common.paramError'), icon: 'none' })
    uni.navigateBack()
    return
  }

  loading.value = true
  try {
    detail.value = await getAdminFeedbackDetail(id)
  } catch {
    uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

/** 打开回复弹窗 */
function openReplyModal() {
  replyContent.value = ''
  replyStatus.value = detail.value.status === 0 ? 1 : 2
  showReplyModal.value = true
}

/** 提交回复 */
async function handleReply() {
  if (!replyContent.value.trim()) {
    uni.showToast({ title: t('admin.feedback.replyRequired'), icon: 'none' })
    return
  }
  if (replyStatus.value === null) {
    uni.showToast({ title: t('admin.feedback.statusRequired'), icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await replyFeedback(detail.value.id, {
      replyContent: replyContent.value.trim(),
      status: replyStatus.value,
    })
    uni.showToast({ title: t('admin.feedback.replySuccess'), icon: 'success' })
    showReplyModal.value = false
    await loadDetail()
  } catch {
    // error handled by request.js
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <view class="feedback-detail-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">{{ t('common.loading') }}</text>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="!detail" class="empty-state">
      <text class="empty-text">{{ t('common.loadFailed') }}</text>
    </view>

    <!-- 详情内容 -->
    <view v-else class="detail-content">
      <!-- 状态 + 类型标签 -->
      <view class="badge-row">
        <view
          class="type-badge"
          :style="{ backgroundColor: typeMap[detail.feedbackType]?.color || '#9BA3AF' }"
        >
          <text class="type-badge__text">{{ typeMap[detail.feedbackType]?.label || '-' }}</text>
        </view>
        <view
          class="status-badge"
          :style="{ backgroundColor: statusMap[detail.status]?.color || '#9BA3AF' }"
        >
          <text class="status-badge__text">{{ statusMap[detail.status]?.label || '-' }}</text>
        </view>
      </view>

      <!-- 标题 -->
      <view class="card">
        <text class="card__title">{{ detail.title }}</text>
      </view>

      <!-- 基本信息 -->
      <view class="card">
        <view class="info-row">
          <text class="info-row__label">{{ t('admin.feedback.submitter') }}</text>
          <text class="info-row__value">{{ detail.userNickname || t('common.anonymous') }}</text>
        </view>
        <view v-if="detail.contact" class="info-row">
          <text class="info-row__label">{{ t('feedback.contact') }}</text>
          <text class="info-row__value">{{ detail.contact }}</text>
        </view>
        <view class="info-row">
          <text class="info-row__label">{{ t('feedback.view.replyTime').replace('回复时间', '提交时间') }}</text>
          <text class="info-row__value">{{ detail.createTime?.split('T')[0] || '-' }}</text>
        </view>
      </view>

      <!-- 正文内容 -->
      <view class="card">
        <text class="card__section-title">{{ t('feedback.content') }}</text>
        <text class="card__content">{{ detail.content }}</text>
      </view>

      <!-- 图片附件（网格展示） -->
      <view v-if="parseImages(detail.images).length > 0" class="card">
        <text class="card__section-title">{{ t('admin.feedback.attachment') }}（{{ parseImages(detail.images).length }}张）</text>
        <view class="image-grid">
          <view
            v-for="(img, idx) in parseImages(detail.images)"
            :key="idx"
            class="image-grid__item"
            @tap="previewImages(parseImages(detail.images))"
          >
            <SafeImage
              class="image-grid__img"
              :src="img"
              mode="aspectFill"
              :previewable="true"
            />
          </view>
        </view>
      </view>

      <!-- 管理员回复 -->
      <view v-if="detail.replyContent" class="card card--reply">
        <text class="card__section-title">{{ t('admin.feedback.adminReply') }}</text>
        <text class="card__reply-content">{{ detail.replyContent }}</text>
        <text v-if="detail.replyTime" class="card__reply-time">
          {{ detail.replyTime?.split('T')[0] || '-' }}
          <text v-if="detail.handlerNickname"> · {{ detail.handlerNickname }}</text>
        </text>
      </view>

      <!-- 回复按钮（未解决/未关闭时显示） -->
      <view v-if="detail.status !== 2 && detail.status !== 3" class="action-area">
        <button class="action-btn" @tap="openReplyModal">
          {{ t('admin.feedback.replyBtn') }}
        </button>
      </view>
    </view>

    <!-- 回复弹窗 -->
    <view v-if="showReplyModal" class="confirm-mask" @tap.self="showReplyModal = false">
      <view class="reply-dialog">
        <text class="reply-dialog__title">{{ t('admin.feedback.replyTitle') }}</text>
        <textarea
          class="reply-dialog__input"
          v-model="replyContent"
          :placeholder="t('admin.feedback.replyPlaceholder')"
          maxlength="500"
        />
        <view class="reply-dialog__status">
          <text class="reply-dialog__label">{{ t('admin.feedback.replyStatusLabel') }}</text>
          <view class="status-selector">
            <view
              v-for="st in [1, 2]"
              :key="st"
              class="status-option"
              :class="{ 'status-option--active': replyStatus === st }"
              @tap="replyStatus = st"
            >
              <text class="status-option__text">
                {{ st === 1 ? t('admin.feedback.status.processing') : t('admin.feedback.status.resolved') }}
              </text>
            </view>
          </view>
        </view>
        <view class="reply-dialog__actions">
          <view class="reply-dialog__btn reply-dialog__btn--cancel" @tap="showReplyModal = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="reply-dialog__btn reply-dialog__btn--confirm" @tap="handleReply">
            <text>{{ submitting ? t('common.submitting') : t('admin.feedback.submitReply') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.feedback-detail-page {
  min-height: 100vh;
  background-color: $color-bg-page;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}
.loading-text, .empty-text {
  font-size: 28rpx;
  color: $color-text-hint;
}

/* ── 标签行 ── */
.badge-row {
  display: flex;
  gap: 12rpx;
  padding: 24rpx 24rpx 0;
}

.type-badge, .status-badge {
  padding: 6rpx 20rpx;
  border-radius: 16rpx;
  &__text {
    font-size: 22rpx;
    color: #ffffff;
    font-weight: 600;
  }
}

/* ── 内容卡片 ── */
.detail-content {
  padding: 16rpx 24rpx 48rpx;
}

.card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-top: 16rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__section-title {
    display: block;
    font-size: 24rpx;
    color: $color-text-hint;
    margin-bottom: 16rpx;
  }

  &__title {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
    color: $color-text-primary;
    line-height: 1.4;
  }

  &__content {
    display: block;
    font-size: 28rpx;
    color: $color-text-primary;
    line-height: 1.8;
  }

  &--reply {
    background-color: #F0F9FF;
  }

  &__reply-content {
    display: block;
    font-size: 26rpx;
    color: $color-text-primary;
    line-height: 1.7;
    white-space: pre-wrap;
    margin-bottom: 12rpx;
  }

  &__reply-time {
    display: block;
    font-size: 22rpx;
    color: $color-text-hint;
  }
}

/* ── 信息行 ── */
.info-row {
  display: flex;
  align-items: flex-start;
  padding: 12rpx 0;
  border-bottom: 2rpx solid $color-divider;

  &:last-child {
    border-bottom: none;
  }

  &__label {
    font-size: 26rpx;
    color: $color-text-hint;
    width: 160rpx;
    flex-shrink: 0;
  }

  &__value {
    font-size: 26rpx;
    color: $color-text-primary;
    word-break: break-all;
  }
}

/* ── 图片网格 ── */
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;

  &__item {
    aspect-ratio: 1;
    border-radius: 12rpx;
    overflow: hidden;
  }

  &__img {
    width: 100%;
    height: 100%;
  }
}

/* ── 操作区 ── */
.action-area {
  margin-top: 24rpx;
}

.action-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  line-height: 88rpx;
}

/* ── 回复弹窗 ── */
.confirm-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.reply-dialog {
  width: 600rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  overflow: hidden;

  &__title {
    display: block;
    text-align: center;
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
    padding: 48rpx 40rpx 24rpx;
  }

  &__input {
    width: calc(100% - 80rpx);
    height: 200rpx;
    margin: 0 40rpx;
    padding: 16rpx;
    background-color: $color-bg-page;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: $color-text-primary;
    line-height: 1.5;
    box-sizing: border-box;
  }

  &__status {
    margin: 24rpx 40rpx;
  }

  &__label {
    display: block;
    font-size: 26rpx;
    color: $color-text-secondary;
    margin-bottom: 12rpx;
  }

  &__actions {
    display: flex;
    border-top: 2rpx solid $color-divider;
    margin-top: 32rpx;
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
      color: $color-primary;
      font-weight: 600;
    }
  }
}

.status-selector {
  display: flex;
  gap: 12rpx;
}

.status-option {
  flex: 1;
  padding: 16rpx;
  border-radius: 16rpx;
  border: 2rpx solid $color-divider;
  text-align: center;

  &__text {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;

    .status-option__text {
      color: $color-primary;
      font-weight: 600;
    }
  }
}
</style>
