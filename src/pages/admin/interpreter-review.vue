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
import { previewImage } from '@/utils/image'

/** 状态筛选（移除暂停状态） */
const STATUS_FILTER = computed(() => [
  { value: undefined, label: t('common.all') },
  { value: 0, label: t('admin.review.status.pending') },
  { value: 1, label: t('admin.review.status.approved') },
  { value: 2, label: t('admin.review.status.rejected') },
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
/** 通过确认弹窗 */
const showApproveModal = ref(false)
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
 */
function switchStatus(status) {
  selectedStatus.value = status
  loadList()
}

/**
 * 打开拒绝弹窗
 */
function openRejectModal(id) {
  reviewingId.value = id
  rejectReason.value = ''
  showRejectModal.value = true
}

/**
 * 打开通过确认弹窗
 */
function openApproveModal(id) {
  reviewingId.value = id
  showApproveModal.value = true
}

/**
 * 确认通过
 */
async function confirmApprove() {
  try {
    await reviewInterpreterProfile(reviewingId.value, true)
    uni.showToast({ title: t('admin.review.approveSuccess'), icon: 'success' })
    showApproveModal.value = false
    loadList()
  } catch {
    // 错误已在 request.js 中处理
  }
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
 * 跳转到编辑页面
 */
function goToEdit(id) {
  uni.navigateTo({ url: `/pages/admin/interpreter-edit?id=${id}` })
}

/**
 * 预览证书
 */
function previewCert(url) {
  const certUrls = (url || '').split(',').filter(Boolean)
  if (certUrls.length > 0) {
    previewImage({ urls: certUrls, current: url })
  }
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.interpreterReview.title') })
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
            }"
          >
            <text class="status-badge__text">
              {{ item.status === 0 ? t('admin.review.status.pending') : item.status === 1 ? t('admin.review.status.approved') : t('admin.review.status.rejected') }}
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
        <view v-if="(item.certUrl || '').split(',').filter(Boolean).length" class="cert-section">
          <text class="cert-section__title">{{ t('interpreter.apply.cert') }}</text>
          <view class="cert-grid">
            <view
              v-for="(url, index) in (item.certUrl || '').split(',').filter(Boolean)"
              :key="index"
              class="cert-grid__item"
              @tap="previewCert(url)"
            >
              <SafeImage
                class="cert-grid__img"
                :src="url"
                mode="aspectFill"
                :previewable="true"
              />
            </view>
          </view>
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

        <!-- 操作按钮 -->
        <view class="actions">
          <button v-if="item.status === 1" class="action-btn action-btn--edit" @tap="goToEdit(item.id)">
            {{ t('admin.review.editBtn') }}
          </button>
          <button v-if="item.status === 0" class="action-btn action-btn--reject" @tap="openRejectModal(item.id)">
            {{ t('admin.review.rejectBtn') }}
          </button>
          <button v-if="item.status === 0" class="action-btn action-btn--approve" @tap="openApproveModal(item.id)">
            {{ t('admin.review.approveBtn') }}
          </button>
        </view>
      </view>
    </view>

    <!-- 通过确认弹窗 -->
    <view v-if="showApproveModal" class="confirm-mask" @tap.self="showApproveModal = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('admin.review.approveConfirm') }}</text>
        <text class="confirm-dialog__content">{{ t('admin.review.approveContent') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--cancel" @tap="showApproveModal = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="confirm-dialog__btn confirm-dialog__btn--confirm" @tap="confirmApprove">
            <text>{{ t('admin.review.approveBtn') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 拒绝理由弹窗 -->
    <view v-if="showRejectModal" class="confirm-mask" @tap.self="showRejectModal = false">
      <view class="reject-dialog">
        <text class="reject-dialog__title">{{ t('admin.review.rejectTitle') }}</text>
        <textarea
          class="reject-dialog__input"
          v-model="rejectReason"
          :placeholder="t('admin.review.rejectPlaceholder')"
          maxlength="200"
        />
        <view class="reject-dialog__actions">
          <view class="reject-dialog__btn reject-dialog__btn--cancel" @tap="showRejectModal = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="reject-dialog__btn reject-dialog__btn--confirm" @tap="handleReject">
            <text>{{ t('admin.review.confirmReject') }}</text>
          </view>
        </view>
      </view>
    </view>
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

    .filter-item__text {
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

.cert-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  &__item {
    width: 160rpx;
    height: 160rpx;
    border-radius: 8rpx;
    overflow: hidden;
  }

  &__img {
    width: 100%;
    height: 100%;
    border-radius: 8rpx;
  }
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
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 120rpx;
  height: 80rpx;
  border-radius: 40rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 80rpx;

  &--edit {
    background-color: #4A90D9;
    color: #ffffff;
  }

  &--reject {
    background-color: #E05252;
    color: #ffffff;
  }

  &--approve {
    background-color: #4CAF50;
    color: #ffffff;
  }
}

/* ── 弹窗 ── */
.confirm-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.confirm-dialog {
  width: 560rpx;
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

  &__content {
    display: block;
    text-align: center;
    font-size: 26rpx;
    color: $color-text-secondary;
    padding: 0 40rpx 48rpx;
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    border-top: 2rpx solid $color-divider;
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
