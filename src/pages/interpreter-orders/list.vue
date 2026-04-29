<!--
  我的译员订单列表页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { getMyInterpreterOrders, cancelInterpreterOrder } from '@/api/interpreter-order'
import { postComment, COMMENT_TARGET_TYPE } from '@/api/comment'
import { isLoggedIn } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

/** 订单状态枚举及显示映射（支持国际化） */
const getOrderStatus = () => ({
  0: { label: t('orders.status.pending'), color: '#FFB22C' },
  1: { label: t('orders.status.accepted'), color: '#2196F3' },
  2: { label: t('orders.status.inService'), color: '#4CAF50' },
  3: { label: t('orders.status.completed'), color: '#9BA3AF' },
  4: { label: t('orders.status.cancelled'), color: '#E05252' },
})

/** 服务类型映射（支持国际化） */
const getServiceTypeLabel = () => ({
  1: t('interpreter.booking.personal'),
  2: t('interpreter.booking.team'),
})

/** 评价弹窗状态 */
const reviewDialog = ref({
  visible: false,
  orderId: null,
  interpreterId: null,
  rating: 5,
  content: '',
  submitting: false,
})

/** 已评价的订单 ID 集合（本地记录） */
const reviewedOrderIds = ref(new Set(
  JSON.parse(uni.getStorageSync('reviewed_orders') || '[]')
))

/** 订单列表数据 */
const orderList = ref([])
/** 总数 */
const total = ref(0)
/** 加载状态 */
const loading = ref(false)
/** 是否加载失败 */
const hasError = ref(false)
/** 当前页码 */
const currentPage = ref(1)
/** 每页条数 */
const pageSize = 10

/**
 * 加载订单列表
 * @param {boolean} refresh - 是否刷新（重置页码）
 */
async function loadList(refresh = false) {
  if (!isLoggedIn()) {
    hasError.value = true
    return
  }
  
  loading.value = true
  hasError.value = false
  try {
    if (refresh) {
      currentPage.value = 1
    }
    const result = await getMyInterpreterOrders(currentPage.value, pageSize)
    total.value = result.total
    if (refresh) {
      orderList.value = result.list
    } else {
      orderList.value = [...orderList.value, ...result.list]
    }
  } catch {
    hasError.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多
 */
function loadMore() {
  if (loading.value || orderList.value.length >= total.value) return
  currentPage.value++
  loadList()
}

/**
 * 取消订单
 * @param {number} orderId
 */
function handleCancelOrder(orderId) {
  uni.showModal({
    title: t('orders.cancelConfirmTitle'),
    content: t('orders.cancelConfirmContent'),
    success: async (res) => {
      if (!res.confirm) return
      try {
        await cancelInterpreterOrder(orderId)
        uni.showToast({ title: t('orders.cancelled'), icon: 'success' })
        loadList(true)
      } catch {
        // 错误已在 request.js 中处理
      }
    },
  })
}

/**
 * 查看订单详情
 * @param {number} orderId
 */
function goToDetail(orderId) {
  // 暂时跳转到译员详情页，后续可创建独立的订单详情页
  uni.showToast({ title: t('orders.detailComingSoon'), icon: 'none' })
}

/**
 * 跳转译员详情
 * @param {number} interpreterId
 */
function goToInterpreter(interpreterId) {
  uni.navigateTo({ url: `/pages/interpreter/detail?id=${interpreterId}` })
}

/**
 * 打开评价弹窗
 * @param {Object} order
 */
function openReviewDialog(order) {
  reviewDialog.value = {
    visible: true,
    orderId: order.id,
    interpreterId: order.interpreterId,
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
 * @param {number} rating
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
      targetId: reviewDialog.value.interpreterId,
      targetType: COMMENT_TARGET_TYPE.INTERPRETER_ORDER,
      orderId: reviewDialog.value.orderId,
      content: reviewDialog.value.content.trim(),
      rating: reviewDialog.value.rating,
    })
    uni.showToast({ title: t('interpreter.commentSuccess'), icon: 'success' })
    // 记录已评价
    reviewedOrderIds.value.add(reviewDialog.value.orderId)
    uni.setStorageSync('reviewed_orders', JSON.stringify([...reviewedOrderIds.value]))
    closeReviewDialog()
  } catch {
    /* error handled by request.js */
  } finally {
    reviewDialog.value.submitting = false
  }
}

/** 下拉刷新 */
function onPullDownRefresh() {
  loadList(true).finally(() => uni.stopPullDownRefresh())
}

onMounted(() => {
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
  loadList()
})
</script>

<template>
  <view class="orders-list-page">
    <!-- 未登录状态 -->
    <view v-if="hasError" class="status">
      <text class="status__text">{{ t('orders.loginRequired') }}</text>
      <button class="status__retry-btn" @tap="() => uni.navigateTo({ url: '/pages/login/index' })">
        {{ t('interpreter.goLogin') }}
      </button>
    </view>

    <!-- 加载中状态 -->
    <view v-else-if="loading && orderList.length === 0" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 订单列表 -->
    <view v-else>
      <view v-if="orderList.length === 0" class="empty">
        <text class="empty__text">{{ t('orders.noData') }}</text>
      </view>

      <view class="list">
        <view
          v-for="item in orderList"
          :key="item.id"
          class="order-card"
        >
          <!-- 头部：订单号 + 状态 -->
          <view class="card-header">
            <text class="order-no">{{ t('orders.orderNo') }}：{{ item.id }}</text>
            <view
              class="status-badge"
              :style="{ backgroundColor: getOrderStatus()[item.status]?.color || '#9BA3AF' }"
            >
              <text class="status-badge__text">
                {{ getOrderStatus()[item.status]?.label || t('common.unknown') }}
              </text>
            </view>
          </view>

          <!-- 译员信息 -->
          <view class="interpreter-info" @tap="goToInterpreter(item.interpreterId)">
            <SafeImage
              class="interpreter-avatar"
              :src="item.interpreterAvatar"
              mode="aspectFill"
            />
            <view class="interpreter-detail">
              <text class="interpreter-name">{{ item.interpreterName }}</text>
              <text class="service-type">{{ getServiceTypeLabel()[item.serviceType] }}</text>
            </view>
            <text class="card-arrow">›</text>
          </view>

          <!-- 订单信息 -->
          <view class="order-info">
            <view class="info-row">
              <text class="info-row__label">{{ t('orders.serviceTime') }}</text>
              <text class="info-row__value">
                {{ formatDateTime(item.startTime) }} - {{ formatEndTime(item.endTime) }}
              </text>
            </view>
            <view v-if="item.groupSize > 1" class="info-row">
              <text class="info-row__label">{{ t('interpreter.booking.teamCount') }}</text>
              <text class="info-row__value">{{ item.groupSize }} {{ t('common.person') }}</text>
            </view>
            <view class="info-row info-row--last">
              <text class="info-row__label">{{ t('interpreter.booking.totalCost') }}</text>
              <text class="info-row__value price">¥{{ item.totalFee?.toFixed(0) || 0 }}</text>
            </view>
            <view v-if="item.remark" class="remark-section">
              <text class="remark-label">{{ t('orders.remarkLabel') }}：</text>
              <text class="remark-text">{{ item.remark }}</text>
            </view>
          </view>

          <!-- 底部操作按钮 -->
          <view v-if="item.status === 0" class="card-actions">
            <button class="action-btn action-btn--cancel" @tap="handleCancelOrder(item.id)">
              {{ t('orders.cancelBtn') }}
            </button>
          </view>
          <view v-if="item.status === 3 && !reviewedOrderIds.has(item.id)" class="card-actions">
            <button class="action-btn action-btn--review" @tap="openReviewDialog(item)">
              {{ t('orders.reviewBtn') }}
            </button>
          </view>
          <view class="card-time">
            <text class="card-time__text">{{ t('orders.createTime') }}：{{ formatDateTime(item.createTime) }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="orderList.length < total && !loading" class="load-more" @tap="loadMore">
        <text class="load-more__text">{{ t('common.loadMore') }}</text>
      </view>
      <view v-if="loading && orderList.length > 0" class="loading-more">
        <text class="loading-more__text">{{ t('common.loading') }}</text>
      </view>
      <view v-if="orderList.length >= total && orderList.length > 0" class="no-more">
        <text class="no-more__text">{{ t('common.noMore') }}</text>
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

<script>
/**
 * 格式化日期时间
 * @param {string} isoString
 * @returns {string}
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
 * 格式化结束时间（仅显示时分）
 * @param {string} isoString
 * @returns {string}
 */
function formatEndTime(isoString) {
  if (!isoString) return '-'
  const date = new Date(isoString)
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.orders-list-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding: 24rpx;
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

.empty {
  display: flex;
  justify-content: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}

/* ── 列表容器 ── */
.list {
  padding-bottom: 24rpx;
}

/* ── 订单卡片 ── */
.order-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.order-no {
  font-size: 24rpx;
  color: $color-text-hint;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;

  &__text {
    font-size: 22rpx;
    color: #ffffff;
    font-weight: 600;
  }
}

/* ── 译员信息 ── */
.interpreter-info {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.interpreter-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.interpreter-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.interpreter-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $color-text-primary;
}

.service-type {
  font-size: 22rpx;
  color: $color-text-secondary;
}

.card-arrow {
  font-size: 32rpx;
  color: $color-text-hint;
}

/* ── 订单信息 ── */
.order-info {
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56rpx;

  &--last {
    margin-bottom: 12rpx;
  }

  &__label {
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &__value {
    font-size: 26rpx;
    color: $color-text-primary;

    &.price {
      font-size: 28rpx;
      font-weight: 600;
      color: $color-primary;
    }
  }
}

.remark-section {
  padding: 16rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.remark-label {
  font-size: 22rpx;
  color: $color-text-secondary;
  margin-bottom: 6rpx;
}

.remark-text {
  font-size: 26rpx;
  color: $color-text-primary;
  line-height: 1.6;
}

/* ── 操作按钮 ── */
.card-actions {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.action-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 36rpx;
  border: none;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 72rpx;

  &--cancel {
    background-color: #E05252;
    color: #ffffff;
  }

  &--review {
    background-color: $color-primary;
    color: #ffffff;
  }
}

.card-time {
  text-align: center;

  &__text {
    font-size: 22rpx;
    color: $color-text-hint;
  }
}

/* ── 加载更多 ── */
.load-more {
  text-align: center;
  padding: 32rpx 0;

  &__text {
    font-size: 26rpx;
    color: $color-primary;
  }
}

.loading-more {
  text-align: center;
  padding: 32rpx 0;

  &__text {
    font-size: 26rpx;
    color: $color-text-hint;
  }
}

.no-more {
  text-align: center;
  padding: 32rpx 0;

  &__text {
    font-size: 26rpx;
    color: $color-text-hint;
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

  &__icon {
    font-size: 40rpx;
    color: $color-divider;
  }

  &--active .star-option__icon {
    color: $color-rank-gold;
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