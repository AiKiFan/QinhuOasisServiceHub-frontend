<!--
  投诉建议列表页（管理员专用）
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAdminFeedbackList, replyFeedback } from '@/api/admin'
import { getUser } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

/** 状态筛选（支持国际化） */
const STATUS_FILTER = computed(() => [
  { value: undefined, label: t('common.all') },
  { value: 0, label: t('admin.feedback.status.pending') },
  { value: 1, label: t('admin.feedback.status.processing') },
  { value: 2, label: t('admin.feedback.status.resolved') },
  { value: 3, label: t('admin.feedback.status.closed') },
])

/** 类型筛选（支持国际化） */
const TYPE_FILTER = computed(() => [
  { value: undefined, label: t('common.all') },
  { value: 1, label: t('admin.feedback.type.complaint') },
  { value: 2, label: t('admin.feedback.type.suggestion') },
  { value: 3, label: t('admin.feedback.type.consult') },
  { value: 4, label: t('admin.feedback.type.other') },
])

/** 当前选中的状态筛选 */
const selectedStatus = ref(undefined)
/** 当前选中的类型筛选 */
const selectedType = ref(undefined)

/** 列表数据 */
const list = ref([])
/** 总数 */
const total = ref(0)
/** 加载状态 */
const loading = ref(false)

/** 回复弹窗 */
const showReplyModal = ref(false)
/** 正在回复的 ID */
const replyingId = ref(null)
/** 回复内容输入 */
const replyContent = ref('')
/** 回复时选择的状态 */
const replyStatus = ref(2)

/**
 * 加载列表
 */
async function loadList() {
  loading.value = true
  try {
    const params = {}
    if (selectedStatus.value !== undefined) params.status = selectedStatus.value
    if (selectedType.value !== undefined) params.feedbackType = selectedType.value
    const result = await getAdminFeedbackList(params)
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
 * 切换类型筛选
 * @param {number} type
 */
function switchType(type) {
  selectedType.value = type
  loadList()
}

/**
 * 打开回复弹窗
 * @param {number} id
 */
function openReplyModal(id) {
  replyingId.value = id
  replyContent.value = ''
  replyStatus.value = null // 不设置默认状态，让管理员自己选择
  showReplyModal.value = true
}

/**
 * 提交回复
 */
async function handleReply() {
  if (!replyContent.value.trim()) {
    uni.showToast({ title: t('admin.feedback.replyRequired'), icon: 'none' })
    return
  }
  if (replyStatus.value === null) {
    uni.showToast({ title: t('admin.feedback.statusRequired'), icon: 'none' })
    return
  }
  try {
    await replyFeedback(replyingId.value, {
      replyContent: replyContent.value,
      status: replyStatus.value,
    })
    uni.showToast({ title: t('admin.feedback.replySuccess'), icon: 'success' })
    showReplyModal.value = false
    loadList()
  } catch {
    // 错误已在 request.js 中处理
  }
}

/**
 * 预览反馈图片
 * @param {string[]} images
 */
function previewImages(images) {
  if (!images || images.length === 0) return
  const imageUrls = JSON.parse(images)
  uni.previewImage({ urls: imageUrls, current: imageUrls[0] })
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.feedbackList.title') })
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
  <view class="feedback-list-page">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-group">
        <text class="filter-group__label">状态</text>
        <view class="filter-tabs">
          <view
            v-for="st in STATUS_FILTER"
            :key="st.value !== undefined ? st.value : 'all'"
            class="filter-tab"
            :class="{ 'filter-tab--active': selectedStatus === st.value }"
            @tap="switchStatus(st.value)"
          >
            <text class="filter-tab__text">{{ st.label }}</text>
          </view>
        </view>
      </view>
      <view class="filter-group">
        <text class="filter-group__label">类型</text>
        <view class="filter-tabs">
          <view
            v-for="ty in TYPE_FILTER"
            :key="ty.value !== undefined ? ty.value : 'all'"
            class="filter-tab"
            :class="{ 'filter-tab--active': selectedType === ty.value }"
            @tap="switchType(ty.value)"
          >
            <text class="filter-tab__text">{{ ty.label }}</text>
          </view>
        </view>
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
        class="feedback-card"
      >
        <!-- 头部：类型 + 状态 + 时间 -->
        <view class="card-header">
          <view
            class="type-badge"
            :class="{
              'type-badge--complaint': item.feedbackType === 1,
              'type-badge--suggestion': item.feedbackType === 2,
              'type-badge--consult': item.feedbackType === 3,
              'type-badge--other': item.feedbackType === 4,
            }"
          >
            <text class="type-badge__text">
              {{ item.feedbackType === 1 ? t('admin.feedback.type.complaint') : item.feedbackType === 2 ? t('admin.feedback.type.suggestion') : item.feedbackType === 3 ? t('admin.feedback.type.consult') : t('admin.feedback.type.other') }}
            </text>
          </view>
          <view
            class="status-badge"
            :class="{
              'status-badge--pending': item.status === 0,
              'status-badge--processing': item.status === 1,
              'status-badge--resolved': item.status === 2,
              'status-badge--closed': item.status === 3,
            }"
          >
            <text class="status-badge__text">
              {{ item.status === 0 ? t('admin.feedback.status.pending') : item.status === 1 ? t('admin.feedback.status.processing') : item.status === 2 ? t('admin.feedback.status.resolved') : t('admin.feedback.status.closed') }}
            </text>
          </view>
          <text class="card-time">{{ item.createTime?.split('T')[0] || '-' }}</text>
        </view>

        <!-- 标题 + 内容 -->
        <view class="card-content">
          <text class="card-title">{{ item.title }}</text>
          <text class="card-text">{{ item.content }}</text>
        </view>

        <!-- 提交者信息 -->
        <view class="card-user">
          <text class="card-user__label">{{ t('admin.feedback.submitter') }}</text>
          <text class="card-user__value">{{ item.userNickname || t('common.anonymous') }}</text>
          <text class="card-user__contact">{{ item.contact || t('admin.feedback.noContact') }}</text>
        </view>

        <!-- 图片展示 -->
        <view v-if="item.images" class="card-images">
          <view class="card-images__title">{{ t('admin.feedback.attachment') }}</view>
          <scroll-view scroll-x class="card-images__scroll">
            <SafeImage
              v-for="(img, idx) in JSON.parse(item.images)"
              :key="idx"
              class="card-images__img"
              :src="img"
              mode="aspectFill"
              :previewable="true"
            />
          </scroll-view>
        </view>

        <!-- 回复内容（已回复时显示） -->
        <view v-if="item.replyContent" class="card-reply">
          <view class="card-reply__header">
            <text class="card-reply__label">{{ t('admin.feedback.adminReply') }}</text>
            <text class="card-reply__time">{{ item.replyTime?.split('T')[0] || '-' }}</text>
          </view>
          <text class="card-reply__text">{{ item.replyContent }}</text>
          <text class="card-reply__handler">{{ t('admin.feedback.handler') }}：{{ item.handlerNickname || t('common.unknown') }}</text>
        </view>

        <!-- 回复按钮（未解决或未关闭时显示） -->
        <view v-if="item.status !== 2 && item.status !== 3" class="card-actions">
          <button class="reply-btn" @tap="openReplyModal(item.id)">
            {{ t('admin.feedback.replyBtn') }}
          </button>
        </view>
      </view>
    </view>

    <!-- 回复弹窗（自定义 confirm-dialog 风格） -->
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
              v-for="st in [1, 2, 3]"
              :key="st"
              class="status-option"
              :class="{ 'status-option--active': replyStatus === st }"
              @tap="replyStatus = st"
            >
              <text class="status-option__text">
                {{ st === 1 ? t('admin.feedback.status.processing') : st === 2 ? t('admin.feedback.status.resolved') : t('admin.feedback.status.closed') }}
              </text>
            </view>
          </view>
        </view>
        <view class="reply-dialog__actions">
          <view class="reply-dialog__btn reply-dialog__btn--cancel" @tap="showReplyModal = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="reply-dialog__btn reply-dialog__btn--confirm" @tap="handleReply">
            <text>{{ t('admin.feedback.submitReply') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.feedback-list-page {
  min-height: 100vh;
  background-color: $color-bg-page;
}

/* ── 筛选栏 ── */
.filter-bar {
  display: flex;
  background-color: $color-bg-card;
  padding: 24rpx 32rpx;
  gap: 24rpx;
  border-bottom: 2rpx solid $color-divider;
  position: sticky;
  top: 0;
  z-index: 10;
}

.filter-group {
  flex: 1;
  min-width: 0;

  &__label {
    display: block;
    font-size: 24rpx;
    color: $color-text-hint;
    margin-bottom: 12rpx;
  }
}

.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.filter-tab {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  border: 2rpx solid $color-divider;

  &__text {
    font-size: 22rpx;
    color: $color-text-secondary;
  }

  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;

    & .filter-tab__text {
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

/* ── 反馈卡片 ── */
.feedback-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
  flex-wrap: wrap;
}

.type-badge {
  padding: 6rpx 16rpx;
  border-radius: 16rpx;

  &__text {
    font-size: 20rpx;
    color: #ffffff;
    font-weight: 600;
  }

  &--complaint {
    background-color: #E05252;
  }

  &--suggestion {
    background-color: #4CAF50;
  }

  &--consult {
    background-color: #2196F3;
  }

  &--other {
    background-color: #9BA3AF;
  }
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 16rpx;

  &__text {
    font-size: 20rpx;
    color: #ffffff;
    font-weight: 600;
  }

  &--pending {
    background-color: #FFB22C;
  }

  &--processing {
    background-color: #2196F3;
  }

  &--resolved {
    background-color: #4CAF50;
  }

  &--closed {
    background-color: #9BA3AF;
  }
}

.card-time {
  font-size: 22rpx;
  color: $color-text-hint;
  margin: 12rpx 0 0 auto;
}

.card-content {
  margin-bottom: 24rpx;
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 12rpx;
}

.card-text {
  font-size: 26rpx;
  color: $color-text-secondary;
  line-height: 1.6;
}

.card-user {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  margin-bottom: 16rpx;

  &__label {
    font-size: 22rpx;
    color: $color-text-hint;
  }

  &__value {
    font-size: 24rpx;
    color: $color-text-primary;
    font-weight: 500;
  }

  &__contact {
    font-size: 22rpx;
    color: $color-text-secondary;
  }
}

.card-images {
  margin-bottom: 24rpx;

  &__title {
    font-size: 22rpx;
    color: $color-text-secondary;
    margin-bottom: 12rpx;
  }

  &__scroll {
    white-space: nowrap;
  }

  &__img {
    width: 200rpx;
    height: 200rpx;
    border-radius: 12rpx;
    margin-right: 16rpx;
    flex-shrink: 0;
    background-color: $color-divider;
  }
}

.card-reply {
  padding: 24rpx;
  background-color: #F0F9FF;
  border-radius: 12rpx;
  margin-bottom: 24rpx;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
  }

  &__label {
    font-size: 22rpx;
    color: #2196F3;
    font-weight: 600;
  }

  &__time {
    font-size: 20rpx;
    color: $color-text-hint;
  }

  &__text {
    font-size: 26rpx;
    color: $color-text-primary;
    line-height: 1.6;
    margin-bottom: 12rpx;
  }

  &__handler {
    font-size: 22rpx;
    color: $color-text-secondary;
  }
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

.reply-btn {
  padding: 16rpx 48rpx;
  background-color: $color-primary;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
  border-radius: 40rpx;
  border: none;
}

/* ── 自定义回复弹窗 ── */
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
    height: 240rpx;
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
</style>