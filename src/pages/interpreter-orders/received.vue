<!--
  译员端：收到的订单列表页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { getReceivedOrders, acceptInterpreterOrder, rejectInterpreterOrder, completeInterpreterOrder } from '@/api/interpreter-order'
import { isLoggedIn, getUser } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

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
/** 当前用户 */
const currentUser = ref(getUser())
/** 当前选中的状态筛选 */
const activeStatusFilter = ref('')

/** 拒绝弹窗 */
const showRejectDialog = ref(false)
const rejectReason = ref('')
const rejectingOrderId = ref(null)

/** 取消弹窗 */
const showCancelDialog = ref(false)
const cancelReason = ref('')
const cancellingOrderId = ref(null)

/**
 * 加载订单列表
 * @param {boolean} refresh - 是否刷新
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
    const params = { page: currentPage.value, size: pageSize }
    if (activeStatusFilter.value !== '') {
      params.status = parseInt(activeStatusFilter.value, 10)
    }
    const result = await getReceivedOrders(params)
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
 * 切换状态筛选
 */
function switchStatusFilter(status) {
  activeStatusFilter.value = status
  loadList(true)
}

/**
 * 接单
 */
function handleAccept(orderId) {
  uni.showModal({
    title: t('common.confirm'),
    content: '确认接单吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await acceptInterpreterOrder(orderId)
        uni.showToast({ title: '接单成功', icon: 'success' })
        loadList(true)
      } catch {
        // 错误已在 request.js 中处理
      }
    },
  })
}

/**
 * 打开拒绝弹窗
 */
function openRejectDialog(orderId) {
  rejectingOrderId.value = orderId
  rejectReason.value = ''
  showRejectDialog.value = true
}

/**
 * 确认拒绝订单
 */
async function handleConfirmReject() {
  try {
    await rejectInterpreterOrder(rejectingOrderId.value, rejectReason.value.trim() || undefined)
    uni.showToast({ title: '已拒绝', icon: 'success' })
    showRejectDialog.value = false
    loadList(true)
  } catch {
    // 错误已在 request.js 中处理
  }
}

/**
 * 完成服务
 */
function handleComplete(orderId) {
  uni.showModal({
    title: t('common.confirm'),
    content: '确认服务已完成吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await completeInterpreterOrder(orderId)
        uni.showToast({ title: '服务已完成', icon: 'success' })
        loadList(true)
      } catch {
        // 错误已在 request.js 中处理
      }
    },
  })
}

/**
 * 跳转订单详情
 */
function goToDetail(orderId) {
  uni.navigateTo({ url: `/pages/interpreter-orders/detail?id=${orderId}` })
}

/** 下拉刷新 */
function onPullDownRefresh() {
  loadList(true).finally(() => uni.stopPullDownRefresh())
}

/** 格式化日期时间 */
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

/** 格式化结束时间（跨日期显示完整日期，同一天仅显示时分） */
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

/** 状态筛选选项 */
const statusFilters = computed(() => [
  { value: '', label: t('common.all') },
  { value: '0', label: t('orders.status.pending') },
  { value: '1', label: t('orders.status.accepted') },
  { value: '2', label: t('orders.status.inService') },
  { value: '3', label: t('orders.status.completed') },
  { value: '4', label: t('orders.status.cancelled') },
])

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.ordersReceived.title') })
  if (!isLoggedIn()) {
    uni.showModal({
      title: t('common.tip'),
      content: '请先登录',
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
  // 检查是否是译员
  if (currentUser.value?.role !== 1) {
    uni.showToast({ title: '仅译员可访问', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  loadList()
})
</script>

<template>
  <view class="received-orders-page">
    <!-- 状态筛选栏 -->
    <view class="status-filter">
      <scroll-view class="status-filter__scroll" scroll-x>
        <view class="status-filter__inner">
          <view
            v-for="filter in statusFilters"
            :key="filter.value"
            class="status-filter__tag"
            :class="{ 'status-filter__tag--active': activeStatusFilter === filter.value }"
            @tap="switchStatusFilter(filter.value)"
          >
            {{ filter.label }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 未登录或无权限状态 -->
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
          @tap="goToDetail(item.id)"
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

          <!-- 用户信息 -->
          <view class="user-info">
            <SafeImage
              class="user-avatar"
              :src="item.userAvatar"
              mode="aspectFill"
            />
            <view class="user-detail">
              <text class="user-name">{{ item.userNickname }}</text>
              <text class="user-contact">{{ item.userPhone || item.userEmail || t('common.noContact') }}</text>
            </view>
          </view>

          <!-- 订单信息 -->
          <view class="order-info">
            <view class="info-row">
              <text class="info-row__label">{{ t('orders.serviceTime') }}</text>
              <text class="info-row__value">
                {{ formatDateTime(item.startTime) }} - {{ formatEndTime(item.endTime, item.startTime) }}
              </text>
            </view>
            <view v-if="item.groupSize > 1" class="info-row">
              <text class="info-row__label">{{ t('interpreter.booking.teamCount') }}</text>
              <text class="info-row__value">{{ item.groupSize }} {{ t('common.person') }}</text>
            </view>
            <view class="info-row info-row--last">
              <text class="info-row__label">{{ t('interpreter.booking.expectedEarning') }}</text>
              <text class="info-row__value price">¥{{ item.totalAmount?.toFixed(2) || '0.00' }}</text>
            </view>
            <view v-if="item.remark" class="remark-section">
              <text class="remark-label">{{ t('orders.remarkLabel') }}：</text>
              <text class="remark-text">{{ item.remark.length > 30 ? item.remark.substring(0, 30) + '...' : item.remark }}</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="card-actions">
            <!-- 待接单状态 -->
            <view v-if="item.status === 0" class="action-row">
              <button class="action-btn action-btn--reject" @tap.stop="openRejectDialog(item.id)">
                拒单
              </button>
              <button class="action-btn action-btn--accept" @tap.stop="handleAccept(item.id)">
                接单
              </button>
            </view>
            <!-- 服务中状态 -->
            <view v-if="item.status === 2" class="action-row">
              <button class="action-btn action-btn--complete" @tap.stop="handleComplete(item.id)">
                完成服务
              </button>
            </view>
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

    <!-- 拒绝弹窗 -->
    <view v-if="showRejectDialog" class="confirm-mask" @tap.self="showRejectDialog = false">
      <view class="reject-dialog">
        <text class="reject-dialog__title">拒单</text>
        <text class="reject-dialog__hint">请填写拒绝理由（可选）</text>
        <textarea
          class="reject-dialog__input"
          v-model="rejectReason"
          placeholder="请输入拒绝理由..."
          maxlength="200"
        />
        <view class="reject-dialog__actions">
          <view class="reject-dialog__btn reject-dialog__btn--cancel" @tap="showRejectDialog = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="reject-dialog__btn reject-dialog__btn--confirm" @tap="handleConfirmReject">
            <text>{{ t('common.confirm') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.received-orders-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding-bottom: 24rpx;
}

/* ── 状态筛选栏 ── */
.status-filter {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: $color-bg-card;
  border-bottom: 2rpx solid $color-divider;

  &__scroll {
    white-space: nowrap;
  }

  &__inner {
    display: inline-flex;
    padding: 16rpx 24rpx;
    gap: 16rpx;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    height: 56rpx;
    padding: 0 28rpx;
    border-radius: 28rpx;
    background-color: $color-bg-page;
    font-size: 26rpx;
    color: $color-text-secondary;
    white-space: nowrap;
    transition: all 0.2s;

    &--active {
      background-color: $color-primary;
      color: #ffffff;
      font-weight: 600;
    }
  }
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
  padding: 20rpx 24rpx 0;
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

/* ── 用户信息 ── */
.user-info {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.user-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.user-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $color-text-primary;
}

.user-contact {
  font-size: 24rpx;
  color: $color-text-secondary;
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
  margin-bottom: 16rpx;
}

.action-row {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 36rpx;
  border: none;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 72rpx;

  &--accept {
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
  }

  &--reject {
    background-color: #E05252;
    color: #ffffff;
  }

  &--complete {
    background: linear-gradient(135deg, #4CAF50 0%, #45A049 100%);
    color: #ffffff;
  }
}

/* ── 查看详情 ── */
.view-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  margin-bottom: 16rpx;
  gap: 8rpx;

  &__text {
    font-size: 24rpx;
    color: $color-primary;
  }

  &__arrow {
    font-size: 28rpx;
    color: $color-primary;
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

/* ── 拒绝弹窗 ── */
.confirm-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.reject-dialog {
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
    padding: 48rpx 40rpx 16rpx;
  }

  &__hint {
    display: block;
    text-align: center;
    font-size: 24rpx;
    color: $color-text-hint;
    padding: 0 40rpx 24rpx;
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
    box-sizing: border-box;
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
      color: #E05252;
      font-weight: 600;
    }
  }
}
</style>