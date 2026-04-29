<!--
  译员审核页（管理员专用）
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminInterpreterProfiles, reviewInterpreterProfile } from '@/api/admin'
import { getUser } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

/** 状态筛选（支持国际化） */
const STATUS_FILTER = computed(() => [
  { value: undefined, label: t('common.all') },
  { value: 0, label: t('admin.review.status.pending') },
  { value: 1, label: t('admin.review.status.approved') },
  { value: 2, label: t('admin.review.status.rejected') },
  { value: 3, label: t('admin.review.status.suspended') },
])

/** 英语等级映射（支持国际化） */
const getEnglishLevelMap = () => ({
  0: { label: t('interpreter.level.cet4'), color: '#9BA3AF' },
  1: { label: t('interpreter.level.cet6'), color: '#E8956D' },
  2: { label: t('interpreter.level.tem4'), color: '#FFB22C' },
  3: { label: t('interpreter.level.tem8'), color: '#C87941' },
  4: { label: t('interpreter.level.other'), color: '#7A6055' },
})

/** 当前选中的状态筛选 */
const selectedStatus = ref(undefined)

/** 列表数据 */
const list = ref([])
/** 总数 */
const total = ref(0)
/** 加载状态 */
const loading = ref(false)

/** 拒绝理由弹窗 */
const showRejectModal = ref(false)
/** 正在审核的 ID */
const reviewingId = ref(null)
/** 拒绝理由输入 */
const rejectReason = ref('')

/**
 * 加载列表
 */
async function loadList() {
  loading.value = true
  try {
    const params = selectedStatus.value !== undefined ? { status: selectedStatus.value } : {}
    const result = await getAdminInterpreterProfiles(params)
    total.value = result.total
    list.value = result.list
  } finally {
    loading.value = false
  }
}

/**
 * 切换状态筛选
 * @param {number} status
 */
function switchStatus(status) {
  selectedStatus.value = status
  loadList()
}

/**
 * 打开拒绝弹窗
 * @param {number} id
 */
function openRejectModal(id) {
  reviewingId.value = id
  rejectReason.value = ''
  showRejectModal.value = true
}

/**
 * 通过申请
 * @param {number} id
 */
async function handleApprove(id) {
  uni.showModal({
    title: t('admin.review.approveConfirm'),
    content: t('admin.review.approveContent'),
    success: async (res) => {
      if (!res.confirm) return
      try {
        await reviewInterpreterProfile(id, true)
        uni.showToast({ title: t('admin.review.approveSuccess'), icon: 'success' })
        loadList()
      } catch {
        // 错误已在 request.js 中处理
      }
    },
  })
}

/**
 * 确认拒绝
 */
async function handleReject() {
  if (!rejectReason.value.trim()) {
    uni.showToast({ title: t('admin.review.rejectReasonRequired'), icon: 'none' })
    return
  }
  try {
    await reviewInterpreterProfile(reviewingId.value, false, rejectReason.value)
    uni.showToast({ title: t('admin.review.rejectSuccess'), icon: 'success' })
    showRejectModal.value = false
    loadList()
  } catch {
    // 错误已在 request.js 中处理
  }
}

/**
 * 预览证书
 * @param {string} url
 */
function previewCert(url) {
  uni.previewImage({ urls: [url], current: url })
}

onMounted(() => {
  // 权限检查：非管理员则跳转回首页
  const user = getUser()
  if (!user || user.role !== 2) {
    uni.showToast({ title: t('admin.feedback.noPermission'), icon: 'none' })
    uni.reLaunch({ url: '/pages/rank/index' })
    return
  }
  loadList()
})
</script>

<template>
  <view class="interpreter-review-page">
    <!-- 状态筛选栏 -->
    <view class="filter-bar">
      <view
        v-for="st in STATUS_FILTER"
        :key="st.value !== undefined ? st.value : 'all'"
        class="filter-item"
        :class="{ 'filter-item--active': selectedStatus === st.value }"
        @tap="switchStatus(st.value)"
      >
        <text class="filter-item__text">{{ st.label }}</text>
      </view>
    </view>

    <!-- 加载中状态 -->
    <view v-if="loading" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 列表内容 -->
    <view v-else class="list">
      <view v-if="list.length === 0" class="empty">
        <text class="empty__text">{{ t('common.noData') }}</text>
      </view>

      <view
        v-for="item in list"
        :key="item.id"
        class="review-card"
      >
        <!-- 头部：姓名 + 状态标签 -->
        <view class="card-header">
          <text class="card-name">{{ item.realName }}</text>
          <view
            class="status-badge"
            :class="{
              'status-badge--pending': item.status === 0,
              'status-badge--approved': item.status === 1,
              'status-badge--rejected': item.status === 2,
              'status-badge--paused': item.status === 3,
            }"
          >
            <text class="status-badge__text">
              {{ item.status === 0 ? t('admin.review.status.pending') : item.status === 1 ? t('admin.review.status.approved') : item.status === 2 ? t('admin.review.status.rejected') : t('admin.review.status.suspended') }}
            </text>
          </view>
        </view>

        <!-- 基本信息 -->
        <view class="card-info">
          <view class="info-row">
            <text class="info-row__label">{{ t('interpreter.school') }}</text>
            <text class="info-row__value">{{ item.school }}</text>
          </view>
          <view class="info-row">
            <text class="info-row__label">{{ t('interpreter.studentId') }}</text>
            <text class="info-row__value">{{ item.studentId }}</text>
          </view>
          <view class="info-row">
            <text class="info-row__label">{{ t('interpreter.apply.englishLevel') }}</text>
            <view
              class="level-badge"
              :style="{ backgroundColor: getEnglishLevelMap()[item.englishLevel]?.color || '#9BA3AF' }"
            >
              <text class="level-badge__text">
                {{ getEnglishLevelMap()[item.englishLevel]?.label || t('common.unknown') }}
              </text>
            </view>
          </view>
          <view class="info-row">
            <text class="info-row__label">{{ t('interpreter.apply.serviceType') }}</text>
            <text class="info-row__value">
              {{ (item.serviceTypes & 1 ? t('interpreter.type.personalTag') + ' ' : '') + (item.serviceTypes & 2 ? t('interpreter.type.teamTag') : '') }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-row__label">{{ t('interpreter.apply.hourlyRate') }}</text>
            <text class="info-row__value">¥{{ item.hourlyRate }}{{ t('interpreter.priceUnit') }}</text>
          </view>
          <view class="info-row info-row--last">
            <text class="info-row__label">{{ t('admin.review.applyTime') }}</text>
            <text class="info-row__value">{{ item.createTime?.split('T')[0] || '-' }}</text>
          </view>
        </view>

        <!-- 证书展示 -->
        <view v-if="item.certUrl" class="cert-section">
          <text class="cert-section__title">{{ t('interpreter.apply.cert') }}</text>
          <SafeImage
            class="cert-image"
            :src="item.certUrl"
            mode="aspectFill"
            :previewable="true"
          />
        </view>

        <!-- 介绍 -->
        <view class="intro-section">
          <text class="intro-section__title">{{ t('interpreter.introduction') }}</text>
          <text class="intro-text">{{ item.introduction || t('interpreter.noIntroduction') }}</text>
        </view>

        <!-- 拒绝理由（已拒绝时显示） -->
        <view v-if="item.status === 2 && item.rejectReason" class="reject-reason">
          <text class="reject-reason__title">{{ t('admin.review.rejectReason') }}</text>
          <text class="reject-reason__text">{{ item.rejectReason }}</text>
        </view>

        <!-- 操作按钮（仅待审核状态显示） -->
        <view v-if="item.status === 0" class="actions">
          <button class="action-btn action-btn--reject" @tap="openRejectModal(item.id)">
            {{ t('admin.review.rejectBtn') }}
          </button>
          <button class="action-btn action-btn--approve" @tap="handleApprove(item.id)">
            {{ t('admin.review.approveBtn') }}
          </button>
        </view>
      </view>
    </view>

    <!-- 拒绝理由弹窗 -->
    <uni-popup v-model:show="showRejectModal" type="dialog">
      <view class="reject-modal">
        <text class="reject-modal__title">{{ t('admin.review.rejectTitle') }}</text>
        <textarea
          class="reject-modal__input"
          v-model="rejectReason"
          :placeholder="t('admin.review.rejectPlaceholder')"
          maxlength="200"
        />
        <view class="reject-modal__actions">
          <button class="reject-modal__btn reject-modal__btn--cancel" @tap="showRejectModal = false">
            {{ t('common.cancel') }}
          </button>
          <button class="reject-modal__btn reject-modal__btn--confirm" @tap="handleReject">
            {{ t('admin.review.confirmReject') }}
          </button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.interpreter-review-page {
  min-height: 100vh;
  background-color: $color-bg-page;
}

/* ── 筛选栏 ── */
.filter-bar {
  display: flex;
  background-color: $color-bg-card;
  padding: 24rpx 32rpx;
  gap: 16rpx;
  border-bottom: 2rpx solid $color-divider;
  position: sticky;
  top: 0;
  z-index: 10;
}

.filter-item {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  border: 2rpx solid $color-divider;

  &__text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;

    & .filter-item__text {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

/* ── 状态占位 ── */
.status {
  display: flex;
  justify-content: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
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
  padding: 24rpx;
}

/* ── 审核卡片 ── */
.review-card {
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

.card-name {
  font-size: 36rpx;
  font-weight: 700;
  color: $color-text-primary;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;

  &__text {
    font-size: 22rpx;
    color: #ffffff;
    font-weight: 600;
  }

  &--pending {
    background-color: #FFB22C;
  }

  &--approved {
    background-color: #4CAF50;
  }

  &--rejected {
    background-color: #E05252;
  }

  &--paused {
    background-color: #9BA3AF;
  }
}

.card-info {
  margin-bottom: 24rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 2rpx solid $color-divider;

  &--last {
    border-bottom: none;
  }

  &__label {
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &__value {
    font-size: 26rpx;
    color: $color-text-primary;
  }
}

.level-badge {
  padding: 4rpx 12rpx;
  border-radius: 16rpx;

  &__text {
    font-size: 20rpx;
    color: #ffffff;
    font-weight: 500;
  }
}

/* ── 证书展示 ── */
.cert-section {
  margin-bottom: 24rpx;
}

.cert-section__title {
  display: block;
  font-size: 26rpx;
  color: $color-text-secondary;
  margin-bottom: 12rpx;
}

.cert-image {
  width: 240rpx;
  height: 240rpx;
  border-radius: 12rpx;
  background-color: $color-divider;
}

/* ── 介绍 ── */
.intro-section {
  margin-bottom: 24rpx;
}

.intro-section__title {
  display: block;
   font-size: 26rpx;
  color: $color-text-secondary;
  margin-bottom: 12rpx;
}

.intro-text {
  font-size: 26rpx;
  color: $color-text-primary;
  line-height: 1.6;
}

/* ── 拒绝理由 ── */
.reject-reason {
  padding: 24rpx;
  background-color: #FEF0F0;
  border-radius: 12rpx;
  margin-bottom: 24rpx;

  &__title {
    display: block;
    font-size: 26rpx;
    color: #E05252;
    font-weight: 600;
    margin-bottom: 8rpx;
  }

  &__text {
    font-size: 26rpx;
    color: $color-text-primary;
    line-height: 1.6;
  }
}

/* ── 操作按钮 ── */
.actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 80rpx;

  &--reject {
    background-color: #E05252;
    color: #ffffff;
  }

  &--approve {
    background-color: #4CAF50;
    color: #ffffff;
  }
}

/* ── 拒绝理由弹窗 ── */
.reject-modal {
  width: 600rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
}

.reject-modal__title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 24rpx;
  text-align: center;
}

.reject-modal__input {
  width: 100%;
  height: 200rpx;
  padding: 16rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: $color-text-primary;
  box-sizing: border-box;
  margin-bottom: 24rpx;
}

.reject-modal__actions {
  display: flex;
  gap: 16rpx;
}

.reject-modal__btn {
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

  &--confirm {
    background-color: #E05252;
    color: #ffffff;
  }
}
</style>