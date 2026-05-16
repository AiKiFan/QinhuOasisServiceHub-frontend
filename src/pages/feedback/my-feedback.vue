<!--
  我的投诉建议页 - 查看列表、详情、修改、追加回复
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getMyFeedbackList,
  getMyFeedbackDetail,
  updateFeedback,
  appendFeedbackReply,
  closeFeedback,
  resolveFeedback,
  uploadFeedbackImage,
} from '@/api/feedback'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'
import { saveImageCache } from '@/utils/image-cache'

const loading = ref(true)
const list = ref([])
const total = ref(0)

/** 详情模式 */
const detail = ref(null)
const detailLoading = ref(false)

/** 编辑模式 */
const editing = ref(false)
const submitting = ref(false)
const original = ref({})
const form = ref({
  title: '',
  content: '',
  images: [],
  contact: '',
})

/** 追加回复弹窗 */
const showReplyModal = ref(false)
const replyContent = ref('')

/** 关闭确认弹窗 */
const showCloseConfirm = ref(false)

/** 已解决确认弹窗 */
const showResolveConfirm = ref(false)

/** 无变更弹窗 */
const showNoChangeDialog = ref(false)

/** 类型映射 */
const typeMap = computed(() => ({
  1: { label: t('feedback.view.type.complaint'), color: '#E05252' },
  2: { label: t('feedback.view.type.suggestion'), color: '#4CAF50' },
  3: { label: t('feedback.view.type.consult'), color: '#2196F3' },
  4: { label: t('feedback.view.type.other'), color: '#9BA3AF' },
}))

/** 状态映射 */
const statusMap = computed(() => ({
  0: { label: t('feedback.view.status.pending'), color: '#FFB22C' },
  1: { label: t('feedback.view.status.processing'), color: '#2196F3' },
  2: { label: t('feedback.view.status.resolved'), color: '#4CAF50' },
  3: { label: t('feedback.view.status.closed'), color: '#9BA3AF' },
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

/** 加载列表 */
async function loadList() {
  loading.value = true
  try {
    const result = await getMyFeedbackList({ page: 1, size: 50 })
    list.value = result.list
    total.value = result.total
  } catch {
    // error handled by request.js
  } finally {
    loading.value = false
  }
}

/** 进入详情 */
async function openDetail(item) {
  detailLoading.value = true
  try {
    const data = await getMyFeedbackDetail(item.id)
    detail.value = data
  } catch {
    // fallback to list item data
    detail.value = item
  } finally {
    detailLoading.value = false
  }
}

/** 返回列表 */
function backToList() {
  detail.value = null
  editing.value = false
  showReplyModal.value = false
  showCloseConfirm.value = false
  showResolveConfirm.value = false
  loadList()
}

/** 进入编辑模式（仅 status=0） */
function startEdit() {
  if (!detail.value) return
  form.value = {
    title: detail.value.title || '',
    content: detail.value.content || '',
    images: parseImages(detail.value.images),
    contact: detail.value.contact || '',
  }
  original.value = { ...form.value, images: [...form.value.images] }
  editing.value = true
}

/** 取消编辑 */
function cancelEdit() {
  editing.value = false
}

/** 选择图片 */
function chooseImage() {
  const remain = 9 - form.value.images.length
  if (remain <= 0) {
    uni.showToast({ title: t('feedback.images.max'), icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    success: (res) => {
      uni.showLoading({ title: t('common.uploading') })
      Promise.all(res.tempFilePaths.map(async (fp) => {
        const r = await uploadFeedbackImage(fp)
        await saveImageCache(r.url, fp)
        return r
      }))
        .then(results => {
          results.forEach(r => form.value.images.push(r.url))
          uni.hideLoading()
          uni.showToast({ title: t('common.uploadSuccess'), icon: 'success' })
        })
        .catch(() => {
          uni.hideLoading()
          uni.showToast({ title: t('common.uploadFailed'), icon: 'none' })
        })
    },
  })
}

/** 删除图片 */
function removeImage(index) {
  form.value.images.splice(index, 1)
}

/** 预览图片 */
function previewImage(url, imageList) {
  const urls = imageList || []
  if (urls.length > 0) {
    uni.previewImage({ urls, current: url || urls[0] })
  }
}

/** 提交修改 */
async function handleSubmit() {
  if (!form.value.title.trim()) {
    uni.showToast({ title: t('feedback.view.titleRequired'), icon: 'none' })
    return
  }
  if (!form.value.content.trim()) {
    uni.showToast({ title: t('feedback.view.contentRequired'), icon: 'none' })
    return
  }

  // 变更检测
  const imagesStr = (form.value.images || []).join(',')
  const origImagesStr = (original.value.images || []).join(',')
  const changed =
    form.value.title !== original.value.title ||
    form.value.content !== original.value.content ||
    imagesStr !== origImagesStr ||
    form.value.contact !== original.value.contact

  if (!changed) {
    showNoChangeDialog.value = true
    return
  }

  submitting.value = true
  try {
    const updated = await updateFeedback(detail.value.id, {
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      images: form.value.images.length > 0 ? form.value.images : null,
      contact: form.value.contact.trim() || null,
    })
    detail.value = updated
    original.value = { ...form.value, images: [...form.value.images] }
    editing.value = false
    uni.showToast({ title: t('feedback.view.modifySuccess'), icon: 'success' })
  } catch {
    // error handled by request.js
  } finally {
    submitting.value = false
  }
}

/** 提交追加回复 */
async function handleAppendReply() {
  if (!replyContent.value.trim()) {
    uni.showToast({ title: t('admin.feedback.replyRequired'), icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await appendFeedbackReply(detail.value.id, replyContent.value.trim())
    uni.showToast({ title: t('feedback.view.replySuccess'), icon: 'success' })
    showReplyModal.value = false
    replyContent.value = ''
    // 重新加载详情
    const data = await getMyFeedbackDetail(detail.value.id)
    detail.value = data
  } catch {
    // error handled by request.js
  } finally {
    submitting.value = false
  }
}

/** 关闭投诉 */
async function handleClose() {
  try {
    await closeFeedback(detail.value.id)
    uni.showToast({ title: t('feedback.view.closeSuccess'), icon: 'success' })
    showCloseConfirm.value = false
    const data = await getMyFeedbackDetail(detail.value.id)
    detail.value = data
  } catch {
    // error handled by request.js
  }
}

/** 标记已解决 */
async function handleResolve() {
  try {
    await resolveFeedback(detail.value.id)
    uni.showToast({ title: t('feedback.view.resolveSuccess'), icon: 'success' })
    showResolveConfirm.value = false
    const data = await getMyFeedbackDetail(detail.value.id)
    detail.value = data
  } catch {
    // error handled by request.js
  }
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('feedback.view.title') })
  loadList()
})
</script>

<template>
  <view class="my-feedback-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">{{ t('common.loading') }}</text>
    </view>

    <!-- 无数据 -->
    <view v-else-if="list.length === 0 && !detail" class="empty-state">
      <text class="empty-text">{{ t('feedback.view.noData') }}</text>
    </view>

    <!-- 列表模式 -->
    <view v-else-if="!detail" class="list-mode">
      <view
        v-for="item in list"
        :key="item.id"
        class="feedback-card"
        @tap="openDetail(item)"
      >
        <view class="card-header">
          <view
            class="type-badge"
            :style="{ backgroundColor: typeMap[item.feedbackType]?.color || '#9BA3AF' }"
          >
            <text class="type-badge__text">{{ typeMap[item.feedbackType]?.label || '-' }}</text>
          </view>
          <view
            class="status-badge"
            :style="{ backgroundColor: statusMap[item.status]?.color || '#9BA3AF' }"
          >
            <text class="status-badge__text">{{ statusMap[item.status]?.label || '-' }}</text>
          </view>
          <text class="card-time">{{ item.createTime?.split('T')[0] || '-' }}</text>
        </view>
        <text class="card-title">{{ item.title }}</text>
        <text class="card-content">{{ item.content }}</text>
        <view v-if="item.replyContent" class="card-reply-hint">
          <text class="card-reply-hint__text">{{ t('feedback.view.replyFrom') }}</text>
        </view>
      </view>
    </view>

    <!-- 详情模式 -->
    <view v-else class="detail-mode">
      <!-- 详情加载中 -->
      <view v-if="detailLoading" class="loading-state">
        <text class="loading-text">{{ t('common.loading') }}</text>
      </view>

      <!-- 编辑模式 -->
      <view v-else-if="editing" class="form-card">
        <view class="form-section">
          <text class="form-section__title">{{ t('feedback.title') }} *</text>
          <input class="form-input" v-model="form.title" :placeholder="t('feedback.title.placeholder')" placeholder-class="form-placeholder" maxlength="50" />
        </view>
        <view class="form-section">
          <text class="form-section__title">{{ t('feedback.content') }} *</text>
          <textarea class="form-textarea" v-model="form.content" :placeholder="t('feedback.content.placeholder')" placeholder-class="form-placeholder" maxlength="500" />
          <text class="char-count">{{ form.content.length }}/500</text>
        </view>
        <view class="form-section">
          <text class="form-section__title">{{ t('feedback.images') }}</text>
          <view class="image-grid">
            <view v-for="(img, idx) in form.images" :key="idx" class="image-item">
              <SafeImage class="image-item__img" :src="img" mode="aspectFill" :previewable="true" @tap="previewImage(img, form.images)" />
              <view class="image-item__delete" @tap.stop="removeImage(idx)">
                <text class="image-item__delete-icon">×</text>
              </view>
            </view>
            <view v-if="form.images.length < 9" class="image-add" @tap="chooseImage">
              <text class="image-add__icon">+</text>
              <text class="image-add__text">{{ t('feedback.images.add') }}</text>
            </view>
          </view>
        </view>
        <view class="form-section">
          <text class="form-section__title">{{ t('feedback.contact') }}</text>
          <input class="form-input" v-model="form.contact" :placeholder="t('feedback.contact.placeholder')" placeholder-class="form-placeholder" />
        </view>
        <view class="btn-group">
          <button class="btn-cancel" @tap="cancelEdit">{{ t('feedback.view.cancelBtn') }}</button>
          <button class="btn-submit" :disabled="submitting" @tap="handleSubmit">
            {{ submitting ? t('common.submitting') : t('common.confirm') }}
          </button>
        </view>
      </view>

      <!-- 查看模式 -->
      <view v-else class="view-mode">
        <!-- 返回按钮 -->
        <view class="back-bar" @tap="backToList">
          <text class="back-bar__arrow">&lt;</text>
          <text class="back-bar__text">{{ t('feedback.view.title') }}</text>
        </view>

        <!-- 状态卡片 -->
        <view class="status-card">
          <view
            class="status-badge-lg"
            :style="{ backgroundColor: (statusMap[detail.status]?.color || '#9BA3AF') + '20', color: statusMap[detail.status]?.color || '#9BA3AF' }"
          >
            <text class="status-badge-lg__text">{{ statusMap[detail.status]?.label || '-' }}</text>
          </view>
          <view class="type-inline">
            <view class="type-badge-sm" :style="{ backgroundColor: typeMap[detail.feedbackType]?.color || '#9BA3AF' }">
              <text class="type-badge-sm__text">{{ typeMap[detail.feedbackType]?.label || '-' }}</text>
            </view>
          </view>
        </view>

        <!-- 内容卡片 -->
        <view class="info-card">
          <view class="info-row info-row--block">
            <text class="info-row__label">{{ t('feedback.title') }}</text>
            <text class="info-row__value info-row__value--block">{{ detail.title }}</text>
          </view>
          <view class="info-row info-row--block">
            <text class="info-row__label">{{ t('feedback.content') }}</text>
            <text class="info-row__value info-row__value--block">{{ detail.content }}</text>
          </view>
          <view v-if="detail.contact" class="info-row">
            <text class="info-row__label">{{ t('feedback.contact') }}</text>
            <text class="info-row__value">{{ detail.contact }}</text>
          </view>
          <view v-if="parseImages(detail.images).length" class="info-row info-row--block info-row--last">
            <text class="info-row__label">{{ t('feedback.images') }}</text>
            <view class="cert-view-grid">
              <view
                v-for="(url, index) in parseImages(detail.images)"
                :key="index"
                class="cert-view-grid__item"
                @tap="previewImage(url, parseImages(detail.images))"
              >
                <SafeImage class="cert-view-grid__img" :src="url" mode="aspectFill" :previewable="true" />
              </view>
            </view>
          </view>
        </view>

        <!-- 管理员回复 -->
        <view v-if="detail.replyContent" class="reply-card">
          <text class="reply-card__content">{{ detail.replyContent }}</text>
          <text v-if="detail.replyTime" class="reply-card__time">{{ t('feedback.view.replyTime') }}：{{ detail.replyTime?.split('T')[0] || '-' }}</text>
        </view>

        <!-- 操作按钮区域 -->
        <view class="action-area">
          <!-- 待处理：可修改 -->
          <button v-if="detail.status === 0" class="action-btn action-btn--primary" @tap="startEdit">
            {{ t('feedback.view.editBtn') }}
          </button>
          <button v-if="detail.status === 0" class="action-btn action-btn--danger" @tap="showCloseConfirm = true">
            {{ t('feedback.view.closeBtn') }}
          </button>

          <!-- 处理中：追加回复 / 已解决 / 关闭 -->
          <button v-if="detail.status === 1" class="action-btn action-btn--primary" @tap="showReplyModal = true; replyContent = ''">
            {{ t('feedback.view.replyAppendBtn') }}
          </button>
          <button v-if="detail.status === 1" class="action-btn action-btn--success" @tap="showResolveConfirm = true">
            {{ t('feedback.view.resolveBtn') }}
          </button>
          <button v-if="detail.status === 1" class="action-btn action-btn--danger" @tap="showCloseConfirm = true">
            {{ t('feedback.view.closeBtn') }}
          </button>
        </view>
      </view>
    </view>

    <!-- 无变更弹窗 -->
    <view v-if="showNoChangeDialog" class="confirm-mask" @tap.self="showNoChangeDialog = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('profile.edit.noChangeTitle') }}</text>
        <text class="confirm-dialog__content">{{ t('feedback.view.noChangeHint') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--single" @tap="showNoChangeDialog = false">
            <text>{{ t('common.confirm') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 追加回复弹窗 -->
    <view v-if="showReplyModal" class="confirm-mask" @tap.self="showReplyModal = false">
      <view class="reply-dialog">
        <text class="reply-dialog__title">{{ t('feedback.view.replyAppend') }}</text>
        <textarea
          class="reply-dialog__input"
          v-model="replyContent"
          :placeholder="t('feedback.view.replyPlaceholder')"
          maxlength="500"
        />
        <view class="reply-dialog__actions">
          <view class="reply-dialog__btn reply-dialog__btn--cancel" @tap="showReplyModal = false">
            <text>{{ t('feedback.view.cancelBtn') }}</text>
          </view>
          <view class="reply-dialog__btn reply-dialog__btn--confirm" @tap="handleAppendReply">
            <text>{{ t('feedback.view.submitReplyBtn') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 关闭确认弹窗 -->
    <view v-if="showCloseConfirm" class="confirm-mask" @tap.self="showCloseConfirm = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('feedback.view.closeBtn') }}</text>
        <text class="confirm-dialog__content">{{ t('feedback.view.closeConfirm') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--cancel" @tap="showCloseConfirm = false">
            <text>{{ t('feedback.view.cancelBtn') }}</text>
          </view>
          <view class="confirm-dialog__btn confirm-dialog__btn--danger" @tap="handleClose">
            <text>{{ t('feedback.view.closeBtn') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 已解决确认弹窗 -->
    <view v-if="showResolveConfirm" class="confirm-mask" @tap.self="showResolveConfirm = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('feedback.view.resolveBtn') }}</text>
        <text class="confirm-dialog__content">{{ t('feedback.view.resolveConfirm') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--cancel" @tap="showResolveConfirm = false">
            <text>{{ t('feedback.view.cancelBtn') }}</text>
          </view>
          <view class="confirm-dialog__btn confirm-dialog__btn--success" @tap="handleResolve">
            <text>{{ t('feedback.view.resolveBtn') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.my-feedback-page {
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

/* ── 列表模式 ── */
.list-mode {
  padding: 24rpx;
}

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
  margin-bottom: 16rpx;
}

.type-badge {
  padding: 4rpx 14rpx;
  border-radius: 14rpx;
  &__text { font-size: 20rpx; color: #ffffff; font-weight: 600; }
}

.status-badge {
  padding: 4rpx 14rpx;
  border-radius: 14rpx;
  &__text { font-size: 20rpx; color: #ffffff; font-weight: 600; }
}

.card-time {
  font-size: 22rpx;
  color: $color-text-hint;
  margin-left: auto;
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 8rpx;
}

.card-content {
  display: block;
  font-size: 26rpx;
  color: $color-text-secondary;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-reply-hint {
  margin-top: 16rpx;
  &__text { font-size: 22rpx; color: #2196F3; }
}

/* ── 详情模式 ── */
.back-bar {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background-color: $color-bg-card;
  border-bottom: 2rpx solid $color-divider;
  &__arrow { font-size: 32rpx; color: $color-text-primary; margin-right: 12rpx; }
  &__text { font-size: 30rpx; color: $color-text-primary; font-weight: 600; }
}

.status-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin: 24rpx;
  text-align: center;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.status-badge-lg {
  display: inline-block;
  padding: 12rpx 40rpx;
  border-radius: 32rpx;
  &__text { font-size: 28rpx; font-weight: 600; }
}

.type-inline {
  margin-top: 16rpx;
}

.type-badge-sm {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 14rpx;
  &__text { font-size: 20rpx; color: #ffffff; font-weight: 600; }
}

.info-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 0 32rpx;
  margin: 0 24rpx 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.info-row {
  padding: 24rpx 0;
  border-bottom: 2rpx solid $color-divider;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  &--block { flex-direction: column; }
  &--last { border-bottom: none; }

  &__label {
    font-size: 26rpx;
    color: $color-text-hint;
    flex-shrink: 0;
    margin-right: 24rpx;
  }
  &__value {
    font-size: 28rpx;
    color: $color-text-primary;
    text-align: right;
    word-break: break-all;
    &--block { text-align: left; margin-top: 12rpx; line-height: 1.6; }
  }
}

.cert-view-grid {
  margin-top: 12rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  &__item { width: 160rpx; height: 160rpx; border-radius: 8rpx; overflow: hidden; }
  &__img { width: 100%; height: 100%; border-radius: 8rpx; }
}

.reply-card {
  background-color: #F0F9FF;
  border-radius: 20rpx;
  padding: 32rpx;
  margin: 0 24rpx 20rpx;
  &__label { display: block; font-size: 22rpx; color: #2196F3; font-weight: 600; margin-bottom: 12rpx; }
  &__content { display: block; font-size: 26rpx; color: $color-text-primary; line-height: 1.6; }
  &__time { display: block; font-size: 20rpx; color: $color-text-hint; margin-top: 8rpx; }
}

.action-area {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.action-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  border: none;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 88rpx;

  &--primary {
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
  }
  &--success {
    background-color: #4CAF50;
    color: #ffffff;
  }
  &--danger {
    background-color: #E05252;
    color: #ffffff;
  }
}

/* ── 编辑表单 ── */
.form-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 0 32rpx 32rpx;
  margin: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.form-section {
  padding: 32rpx 0;
  border-bottom: 2rpx solid $color-divider;
  &--last { border-bottom: none; }
  &__title { display: block; font-size: 28rpx; color: $color-text-secondary; margin-bottom: 16rpx; }
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

.form-placeholder { color: $color-text-hint; }

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: $color-text-hint;
  margin-top: 8rpx;
}

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
  &__img { width: 100%; height: 100%; }
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
  &__delete-icon { font-size: 28rpx; color: #ffffff; font-weight: 700; line-height: 1; }
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
  &__icon { font-size: 48rpx; color: $color-primary; line-height: 1; }
  &__text { font-size: 22rpx; color: $color-text-hint; }
}

.btn-group {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}

.btn-cancel {
  flex: 1;
  height: 88rpx;
  background-color: $color-bg-page;
  color: $color-text-secondary;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: 2rpx solid $color-divider;
  line-height: 88rpx;
}

.btn-submit {
  flex: 1;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  line-height: 88rpx;
  opacity: 1;
  &[disabled] { opacity: 0.6; }
}

/* ── 弹窗通用 ── */
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
  &__title { display: block; text-align: center; font-size: 32rpx; font-weight: 600; color: $color-text-primary; padding: 48rpx 40rpx 16rpx; }
  &__content { display: block; text-align: center; font-size: 26rpx; color: $color-text-secondary; padding: 0 40rpx 48rpx; line-height: 1.6; }
  &__actions { display: flex; border-top: 2rpx solid $color-divider; }
  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 96rpx;
    font-size: 30rpx;
    &--single { color: $color-primary; font-weight: 600; }
    &--cancel { color: $color-text-secondary; border-right: 2rpx solid $color-divider; }
    &--danger { color: #E05252; font-weight: 600; }
    &--success { color: #4CAF50; font-weight: 600; }
  }
}

/* ── 追加回复弹窗 ── */
.reply-dialog {
  width: 600rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  overflow: hidden;
  &__title { display: block; text-align: center; font-size: 32rpx; font-weight: 600; color: $color-text-primary; padding: 48rpx 40rpx 24rpx; }
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
  &__actions { display: flex; border-top: 2rpx solid $color-divider; margin-top: 32rpx; }
  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 96rpx;
    font-size: 30rpx;
    &--cancel { color: $color-text-secondary; border-right: 2rpx solid $color-divider; }
    &--confirm { color: $color-primary; font-weight: 600; }
  }
}
</style>
