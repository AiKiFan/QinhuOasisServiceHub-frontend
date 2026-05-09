<!--
  译员订单详情页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { getInterpreterOrderDetail, cancelInterpreterOrder } from '@/api/interpreter-order'
import { postComment, COMMENT_TARGET_TYPE } from '@/api/comment'
import { isLoggedIn } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

/** 页面参数（订单 ID） */
const pageOptions = ref(uni.getStorageSync('pageOptions') || {})

/** 订单详情数据 */
const detail = ref(null)
/** 加载状态 */
const loading = ref(false)
/** 是否加载失败 */
const hasError = ref(false)

/** 评价弹窗状态 */
const reviewDialog = ref({
  visible: false,
  rating: 5,
  content: '',
  submitting: false,
})

/** 订单状态映射 */
const getOrderStatus = () => ({
  0: { label: t('orders.status.pending'), color: '#FFB22C' },
  1: { label: t('orders.status.accepted'), color: '#2196F3' },
  2: { label: t('orders.status.inService'), color: '#4CAF50' },
  3: { label: t('orders.status.completed'), color: '#9BA3AF' },
  4: { label: t('orders.status.cancelled'), color: '#E05252' },
})

/** 服务类型映射 */
const getServiceTypeLabel = () => ({
  1: t('interpreter.booking.personal'),
  2: t('interpreter.booking.team'),
})

/**
 * 加载订单详情
 */
async function loadDetail() {
  const id = pageOptions.value.id
  if (!id) {
    hasError.value = true
    return
  }
  loading.value = true
  hasError.value = false
  try {
    detail.value = await getInterpreterOrderDetail(id)
  } catch {
    hasError.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 跳转译员详情
 */
function goToInterpreter() {
  if (!detail.value?.profileId) return
  uni.navigateTo({ url: `/pages/interpreter/detail?id=${detail.value.profileId}` })
}

/**
 * 取消订单
 */
function handleCancelOrder() {
  if (!detail.value?.id) return
  uni.showModal({
    title: t('orders.cancelConfirmTitle'),
    content: t('orders.cancelConfirmContent'),
    success: async (res) => {
      if (!res.confirm) return
      try {
        await cancelInterpreterOrder(detail.value.id)
        uni.showToast({ title: t('orders.cancelled'), icon: 'success' })
        loadDetail()
      } catch {
        // 错误已在 request.js 中处理
      }
    },
  })
}

/**
 * 打开评价弹窗
 */
function openReviewDialog() {
  reviewDialog.value = {
    visible: true,
    rating: 5,
    content: '',
    submitting: false,
  }
}

/**
 * 关闭评价弹窗
 */
function closeReviewDialog() {
  reviewDialog.value.visible = false
}

/**
 * 选择评分
 */
function selectRating(rating) {
  reviewDialog.value.rating = rating
}

/**
 * 提交评价
 */
async function submitReview() {
  if (!reviewDialog.value.content.trim()) {
    uni.showToast({ title: t('interpreter.commentPlaceholder'), icon: 'none' })
    return
  }
  reviewDialog.value.submitting = true
  try {
    await postComment({
      targetId: detail.value.interpreterId,
      targetType: COMMENT_TARGET_TYPE.INTERPRETER,
      orderId: detail.value.id,
      content: reviewDialog.value.content.trim(),
      rating: reviewDialog.value.rating,
    })
    uni.showToast({ title: t('interpreter.commentSuccess'), icon: 'success' })
    closeReviewDialog()
    loadDetail()
  } catch {
    // 错误已在 request.js 中处理
  } finally {
    reviewDialog.value.submitting = false
  }
}

/**
 * 格式化日期时间
 */
function formatDateTime(isoString) {
  if (!isoString) return '-'
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 格式化结束时间（跨日期显示完整日期，同一天仅显示时分）
 */
function formatEndTime(endIsoString, startIsoString) {
  if (!endIsoString) return '-'
  const endDate = new Date(endIsoString)
  const startDate = startIsoString ? new Date(startIsoString) : null

  // 如果有开始时间，判断是否跨日期
  if (startDate && endDate.toDateString() !== startDate.toDateString()) {
    // 跨日期：显示完整日期时间
    const year = endDate.getFullYear()
    const month = String(endDate.getMonth() + 1).padStart(2, '0')
    const day = String(endDate.getDate()).padStart(2, '0')
    const hour = String(endDate.getHours()).padStart(2, '0')
    const minute = String(endDate.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  }

  // 同一天：仅显示时分
  const hour = String(endDate.getHours()).padStart(2, '0')
  const minute = String(endDate.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

/**
 * 计算服务时长（小时）
 */
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const start = new Date(startTime)
  const end = new Date(endTime)
  const diff = (end - start) / 1000 / 60 / 60
  return diff.toFixed(1)
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.orderDetail.title') })
  if (!isLoggedIn()) {
    uni.showModal({
      title: t('common.tip'),
      content: t('orders.loginRequired'),
      confirmText: t('interpreter.goLogin'),
      success(res) {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' })
        } else {
          uni.navigateBack()
        }
      },
    })
    return
  }
  // 获取页面参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  pageOptions.value = options
  uni.setStorageSync('pageOptions', options)
  loadDetail()
})
</script>

<template>
  <view class="order-detail-page">
    <!-- 加载中状态 -->
    <view v-if="loading" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 加载失败状态 -->
    <view v-else-if="hasError" class="status">
      <text class="status__text">{{ t('common.loadFailed') }}</text>
      <button class="status__retry-btn" @tap="loadDetail">{{ t('common.retry') }}</button>
    </view>

    <!-- 详情内容 -->
    <view v-else-if="detail" class="detail-content">
      <!-- 状态卡片 -->
      <view class="status-card">
        <view
          class="status-badge-large"
          :style="{ backgroundColor: getOrderStatus()[detail.status]?.color || '#9BA3AF' }"
        >
          <text class="status-badge-large__text">
            {{ getOrderStatus()[detail.status]?.label || t('common.unknown') }}
          </text>
        </view>
        <text class="order-no">{{ t('orders.orderNo') }}：{{ detail.id }}</text>
      </view>

      <!-- 译员信息 -->
      <view class="card-section">
        <text class="section-title">{{ t('orders.goToInterpreter') }}</text>
        <view class="interpreter-card" @tap="goToInterpreter">
          <SafeImage
            class="interpreter-avatar"
            :src="detail.interpreterAvatar"
            mode="aspectFill"
          />
          <view class="interpreter-info">
            <text class="interpreter-name">{{ detail.interpreterName }}</text>
            <text class="service-type">{{ getServiceTypeLabel()[detail.serviceType] }}</text>
          </view>
          <text class="card-arrow">›</text>
        </view>
      </view>

      <!-- 服务信息 -->
      <view class="card-section">
        <text class="section-title">{{ t('interpreter.booking.timeLabel') }}</text>
        <view class="info-card">
          <view class="info-row">
            <text class="info-row__label">{{ t('interpreter.booking.startTime') }}</text>
            <text class="info-row__value">{{ formatDateTime(detail.startTime) }}</text>
          </view>
          <view class="info-row">
            <text class="info-row__label">{{ t('interpreter.booking.endTime') }}</text>
            <text class="info-row__value">{{ formatEndTime(detail.endTime, detail.startTime) }}</text>
          </view>
          <view class="info-row">
            <text class="info-row__label">{{ t('interpreter.booking.duration') }}</text>
            <text class="info-row__value">{{ calculateDuration(detail.startTime, detail.endTime) }} {{ t('interpreter.hour') }}</text>
          </view>
          <view v-if="detail.groupSize > 1" class="info-row">
            <text class="info-row__label">{{ t('interpreter.booking.teamCount') }}</text>
            <text class="info-row__value">{{ detail.groupSize }} {{ t('common.person') }}</text>
          </view>
        </view>
      </view>

      <!-- 费用信息 -->
      <view class="card-section">
        <text class="section-title">{{ t('interpreter.booking.costPreview') }}</text>
        <view class="info-card">
          <view class="info-row">
            <text class="info-row__label">{{ t('interpreter.booking.hourlyRate') }}</text>
            <text class="info-row__value price">¥{{ detail.hourlyRate?.toFixed(0) || 0 }}/{{ t('interpreter.hour') }}</text>
          </view>
          <view v-if="detail.groupSize > 1" class="info-row">
            <text class="info-row__label">{{ t('interpreter.booking.teamCount') }}</text>
            <text class="info-row__value">{{ detail.groupSize }} {{ t('common.person') }}</text>
          </view>
          <view class="info-row info-row--highlight">
            <text class="info-row__label">{{ t('interpreter.booking.totalCost') }}</text>
            <text class="info-row__value price price--large">¥{{ detail.totalFee?.toFixed(2) || '0.00' }}</text>
          </view>
        </view>
      </view>

      <!-- 备注信息 -->
      <view v-if="detail.remark || detail.orderPhone" class="card-section">
        <text class="section-title">{{ t('orders.remarkLabel') }}</text>
        <view class="remark-card">
          <text v-if="detail.orderPhone" class="remark-phone">📞 {{ detail.orderPhone }}</text>
          <text v-if="detail.remark" class="remark-text">{{ detail.remark }}</text>
        </view>
      </view>

      <!-- 取消/拒绝信息卡片 -->
      <view v-if="detail.status === 4" class="card-section">
        <text class="section-title">{{ t('orders.cancelInfo') }}</text>
        <view class="cancel-info-card">
          <!-- 取消方标识 -->
          <view class="cancel-header">
            <view
              class="cancel-badge"
              :style="{ backgroundColor: detail.cancelledBy === 'interpreter' ? '#E05252' : '#FFB22C' }"
            >
              <text class="cancel-badge__text">
                {{ detail.cancelledBy === 'interpreter' ? t('orders.cancelledByInterpreter') : t('orders.cancelledByUser') }}
              </text>
            </view>
          </view>
          <!-- 取消理由 -->
          <view v-if="detail.cancelReason" class="cancel-reason">
            <text class="cancel-reason__label">
              {{ detail.cancelledBy === 'interpreter' ? t('orders.rejectReasonLabel') : t('orders.cancelReasonLabel') }}：
            </text>
            <text class="cancel-reason__text">{{ detail.cancelReason }}</text>
          </view>
        </view>
      </view>

      <!-- 时间信息 -->
      <view class="card-section">
        <text class="section-title">{{ t('orders.createTime') }}</text>
        <view class="info-card">
          <view class="info-row info-row--last">
            <text class="info-row__label">{{ t('orders.createTime') }}</text>
            <text class="info-row__value">{{ formatDateTime(detail.createTime) }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-section">
        <!-- 待接单状态：可取消 -->
        <view v-if="detail.status === 0" class="action-row">
          <button class="action-btn action-btn--cancel" @tap="handleCancelOrder">
            {{ t('orders.cancelBtn') }}
          </button>
        </view>
        
        <!-- 已完成状态：可评价 -->
        <view v-if="detail.status === 3" class="action-row">
          <button class="action-btn action-btn--review" @tap="openReviewDialog">
            {{ t('orders.reviewBtn') }}
          </button>
        </view>
      </view>
    </view>

    <!-- 评价弹窗 -->
    <view v-if="reviewDialog.visible" class="review-overlay" @tap="closeReviewDialog">
      <view class="review-dialog" @tap.stop>
        <text class="review-dialog__title">{{ t('orders.reviewTitle') }}</text>

        <!-- 评分选择 -->
        <view class="rating-selector">
          <text class="rating-selector__label">{{ t('interpreter.commentRating') }}</text>
          <view class="rating-selector__stars">
            <view
              v-for="i in 5"
              :key="i"
              class="star-option"
              :class="{ 'star-option--active': reviewDialog.rating >= i }"
              @tap="selectRating(i)"
            >
              <text class="star-option__icon">★</text>
            </view>
          </view>
        </view>

        <!-- 评论输入 -->
        <textarea
          class="review-input"
          v-model="reviewDialog.content"
          :placeholder="t('interpreter.commentPlaceholder')"
          placeholder-class="review-placeholder"
          maxlength="500"
        />
        <text class="char-count">{{ reviewDialog.content.length }}/500</text>

        <!-- 按钮 -->
        <view class="review-actions">
          <button class="review-btn review-btn--cancel" @tap="closeReviewDialog">
            {{ t('common.cancel') }}
          </button>
          <button
            class="review-btn review-btn--submit"
            :class="{ 'review-btn--disabled': reviewDialog.submitting }"
            :disabled="reviewDialog.submitting"
            @tap="submitReview"
          >
            {{ reviewDialog.submitting ? t('common.submitting') : t('common.submit') }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.order-detail-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* ── 状态占位 ── */
.status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
    margin-bottom: 32rpx;
  }

  &__retry-btn {
    padding: 16rpx 48rpx;
    background-color: $color-primary;
    color: #ffffff;
    font-size: 28rpx;
    border-radius: 40rpx;
    border: none;
  }
}

/* ── 详情内容 ── */
.detail-content {
  padding-bottom: 24rpx;
}

/* ── 状态卡片 ── */
.status-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.status-badge-large {
  padding: 16rpx 48rpx;
  border-radius: 24rpx;
  margin-bottom: 16rpx;

  &__text {
    font-size: 32rpx;
    color: #ffffff;
    font-weight: 700;
  }
}

.order-no {
  font-size: 24rpx;
  color: $color-text-hint;
}

/* ── 卡片区块 ── */
.card-section {
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  font-size: 26rpx;
  color: $color-text-hint;
  margin-bottom: 12rpx;
  font-weight: 500;
}

/* ── 译员卡片 ── */
.interpreter-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.interpreter-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.interpreter-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.interpreter-name {
  font-size: 32rpx;
  font-weight: 600;
  color: $color-text-primary;
}

.service-type {
  font-size: 24rpx;
  color: $color-text-secondary;
}

.card-arrow {
  font-size: 36rpx;
  color: $color-text-hint;
}

/* ── 信息卡片 ── */
.info-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 0 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  border-bottom: 2rpx solid $color-divider;

  &--last {
    border-bottom: none;
  }

  &--highlight {
    background-color: rgba(232, 149, 109, 0.05);
    margin: 0 -32rpx;
    padding: 0 32rpx;
    border-radius: 0 0 20rpx 20rpx;
  }

  &__label {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__value {
    font-size: 28rpx;
    color: $color-text-primary;

    &.price {
      color: $color-primary;
      font-weight: 600;
    }

    &.price--large {
      font-size: 36rpx;
      font-weight: 700;
    }
  }
}

/* ── 备注卡片 ── */
.remark-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 24rpx 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.remark-text {
  font-size: 28rpx;
  color: $color-text-secondary;
  line-height: 1.6;
}

.remark-phone {
  display: block;
  font-size: 28rpx;
  color: $color-primary;
  margin-bottom: 12rpx;
}

/* ── 取消信息卡片 ── */
.cancel-info-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 24rpx 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.cancel-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.cancel-badge {
  padding: 8rpx 20rpx;
  border-radius: 24rpx;

  &__text {
    font-size: 26rpx;
    color: #ffffff;
    font-weight: 600;
  }
}

.cancel-reason {
  padding: 16rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;

  &__label {
    font-size: 26rpx;
    color: $color-text-secondary;
    margin-bottom: 8rpx;
    display: block;
  }

  &__text {
    font-size: 28rpx;
    color: $color-text-primary;
    line-height: 1.6;
  }
}

/* ── 操作按钮 ── */
.action-section {
  margin-top: 32rpx;
}

.action-row {
  margin-bottom: 16rpx;
}

.action-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  border: none;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 88rpx;

  &--cancel {
    background-color: #E05252;
    color: #ffffff;
  }

  &--review {
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
  }
}

/* ── 评价弹窗 ── */
.review-overlay {
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

.review-dialog {
  width: 100%;
  max-width: 600rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

.review-dialog__title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $color-text-primary;
  text-align: center;
  margin-bottom: 32rpx;
}

.rating-selector {
  margin-bottom: 24rpx;

  &__label {
    display: block;
    font-size: 26rpx;
    color: $color-text-secondary;
    margin-bottom: 12rpx;
  }

  &__stars {
    display: flex;
    gap: 12rpx;
    justify-content: center;
  }
}

.star-option {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;

  &__icon {
    font-size: 40rpx;
    color: $color-divider;
    transition: color 0.2s;
  }

  &--active {
    transform: scale(1.1);

    .star-option__icon {
      color: $color-rank-gold;
    }
  }
}

.review-input {
  width: 100%;
  height: 200rpx;
  padding: 16rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: $color-text-primary;
  line-height: 1.5;
  box-sizing: border-box;
  margin-bottom: 12rpx;
}

.review-placeholder {
  color: $color-text-hint;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: $color-text-hint;
  margin-bottom: 24rpx;
}

.review-actions {
  display: flex;
  gap: 16rpx;
}

.review-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 80rpx;

  &--cancel {
    background-color: $color-bg-page;
    color: $color-text-secondary;
  }

  &--submit {
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
  }

  &--disabled {
    opacity: 0.6;
  }
}
</style>
