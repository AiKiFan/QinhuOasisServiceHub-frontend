<!--
  译员详情页
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getInterpreterDetail } from '@/api/interpreter'
import { getCommentList, postComment, COMMENT_TARGET_TYPE } from '@/api/comment'
import { isLoggedIn, getUser } from '@/utils/auth'
import { t } from '@/utils/i18n'
import { checkFavorite, addFavorite, removeFavorite, FAVORITE_TYPE } from '@/api/favorites'
import SafeImage from '@/components/SafeImage/index.vue'

// SafeImage 已导入，无需额外操作

/** 页面参数（译员 ID） */
const pageOptions = ref(uni.getStorageSync('pageOptions') || {})

/** 译员详情数据 */
const detail = ref(null)
/** 加载状态 */
const loading = ref(false)
/** 是否加载失败 */
const hasError = ref(false)

/** 评论相关状态 */
const commentList = ref([])
const commentTotal = ref(0)
const commentPage = ref(1)
const hasMoreComments = ref(true)
const commentsLoading = ref(false)
const loadingMoreComments = ref(false)
const commentForm = ref({
  content: '',
  rating: 5,
})
const submittingComment = ref(false)

/** 评论每页条数 */
const COMMENT_PAGE_SIZE = 10

/** 是否已登录 */
const isUserLoggedIn = ref(isLoggedIn())

/** 当前用户 */
const currentUser = ref(getUser())

/** 是否已收藏 */
const isFavorited = ref(false)

/** 是否是译员本人（防止自预约、自评价） */
const isSelf = computed(() =>
  currentUser.value?.role === 1 && currentUser.value?.profileId === detail.value?.id
)

/**
 * 切换收藏状态
 */
async function toggleFavorite() {
  const interpreter = detail.value
  if (!interpreter) return

  if (!isLoggedIn()) {
    uni.showModal({
      title: t('common.confirm'),
      content: '请先登录后再收藏',
      confirmText: t('restaurant.goLogin'),
      success(res) {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' })
        }
      },
    })
    return
  }

  try {
    if (isFavorited.value) {
      await removeFavorite(FAVORITE_TYPE.INTERPRETER, interpreter.id)
      isFavorited.value = false
      uni.showToast({ title: t('favorites.removed'), icon: 'success' })
    } else {
      await addFavorite(FAVORITE_TYPE.INTERPRETER, interpreter.id)
      isFavorited.value = true
      uni.showToast({ title: t('favorites.added'), icon: 'success' })
    }
  } catch (error) {
    // API调用失败,恢复状态
    isFavorited.value = !isFavorited.value
    uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
  }
}

/** 英语等级映射（支持国际化） */
const getEnglishLevelMap = () => ({
  0: { label: t('interpreter.level.cet4'), color: '#9BA3AF' },
  1: { label: t('interpreter.level.cet6'), color: '#E8956D' },
  2: { label: t('interpreter.level.tem4'), color: '#FFB22C' },
  3: { label: t('interpreter.level.tem8'), color: '#C87941' },
  4: { label: t('interpreter.level.other'), color: '#7A6055' },
})

/**
 * 加载译员详情
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
    detail.value = await getInterpreterDetail(id)
    // 检查收藏状态（如果已登录）
    if (isLoggedIn()) {
      try {
        const result = await checkFavorite(FAVORITE_TYPE.INTERPRETER, id)
        isFavorited.value = result || false
      } catch {
        isFavorited.value = false
      }
    }
    loadComments(true)
  } catch {
    hasError.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 跳转预约页
 */
function goToBooking() {
  if (!isLoggedIn()) {
    uni.showModal({
      title: t('common.confirm'),
      content: t('interpreter.loginToBook'),
      confirmText: t('restaurant.goLogin'),
      success(res) {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' })
        }
      },
    })
    return
  }
  uni.navigateTo({
    url: `/pages/interpreter/booking?profileId=${detail.value.id}&hourlyRate=${detail.value.hourlyRate}`,
  })
}

/**
 * 加载译员评论列表（分页）
 * @param {boolean} refresh
 */
async function loadComments(refresh = false) {
  if (!detail.value) return
  if (refresh) {
    commentPage.value = 1
    commentList.value = []
    hasMoreComments.value = true
    commentsLoading.value = true
  } else {
    loadingMoreComments.value = true
  }
  try {
    const result = await getCommentList({
      targetId: detail.value.id,
      targetType: COMMENT_TARGET_TYPE.INTERPRETER,
      page: commentPage.value,
      size: COMMENT_PAGE_SIZE,
    })
    commentTotal.value = result.total
    const list = result.list || []
    if (refresh) {
      commentList.value = list
    } else {
      commentList.value = [...commentList.value, ...list]
    }
    hasMoreComments.value = commentList.value.length < commentTotal.value
  } finally {
    commentsLoading.value = false
    loadingMoreComments.value = false
  }
}

/** 加载更多评论 */
function loadMoreComments() {
  if (loadingMoreComments.value || !hasMoreComments.value) return
  commentPage.value++
  loadComments(false)
}

/** 提交评论 */
async function handlePostComment() {
  if (!isLoggedIn()) {
    uni.showModal({
      title: t('common.confirm'),
      content: t('interpreter.loginToBook'),
      confirmText: t('restaurant.goLogin'),
      success(res) {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' })
        }
      },
    })
    return
  }

  // 检查是否是译员自己（译员不能评价自己）

  // 判断条件：用户是译员(role=1) 且 有profileId 且 profileId匹配译员详情ID
  if (currentUser.value?.role === 1 && currentUser.value?.profileId && currentUser.value?.profileId === detail.value?.id) {
    uni.showToast({ title: t('interpreter.detail.cannotRateSelf'), icon: 'none' })
    return
  }

  if (!commentForm.value.content.trim()) {
    uni.showToast({ title: t('interpreter.commentPlaceholder'), icon: 'none' })
    return
  }
  submittingComment.value = true
  try {
    await postComment({
      targetId: detail.value.id,
      targetType: COMMENT_TARGET_TYPE.INTERPRETER,
      content: commentForm.value.content,
      rating: commentForm.value.rating,
    })
    uni.showToast({ title: t('interpreter.commentSuccess'), icon: 'success' })
    commentForm.value.content = ''
    commentForm.value.rating = 5
    loadComments(true)
  } catch {
    /* error handled by request.js */
  } finally {
    submittingComment.value = false
  }
}

/**
 * 预览证书大图
 * @param {string} url
 */
function previewCert(url) {
  const certUrls = (detail.value?.certUrl || '').split(',').filter(Boolean)
  if (certUrls.length > 0) {
    uni.previewImage({ urls: certUrls, current: url || certUrls[0] })
  }
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.interpreterDetail.title') })
  isUserLoggedIn.value = isLoggedIn()
  currentUser.value = getUser()
  // 获取页面参数（id 从上一个页面传递）
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  pageOptions.value = options
  uni.setStorageSync('pageOptions', options)
  loadDetail()
})
</script>

<template>
  <view class="interpreter-detail-page">
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
      <!-- 头部信息卡 -->
      <view class="hero-card">
        <view class="hero-avatar-wrap">
          <SafeImage
            class="hero-avatar"
            :src="detail.avatar"
            mode="aspectFill"
          />
        </view>
        <view class="hero-header">
          <text class="hero-name">{{ detail.realName || detail.nickname }}</text>
          <view class="favorite-btn" @tap="toggleFavorite">
            <text class="favorite-btn__icon">{{ isFavorited ? '❤️' : '🤍' }}</text>
          </view>
        </view>
        <view class="hero-tags">
          <view
            class="level-badge"
            :style="{ backgroundColor: getEnglishLevelMap()[detail.englishLevel]?.color || '#9BA3AF' }"
          >
            <text class="level-badge__text">
              {{ getEnglishLevelMap()[detail.englishLevel]?.label || t('common.unknown') }}
            </text>
          </view>
          <view v-if="detail.serviceTypes & 1" class="service-badge">
            <text class="service-badge__text">{{ t('interpreter.type.personal') }}</text>
          </view>
          <view v-if="detail.serviceTypes & 2" class="service-badge">
            <text class="service-badge__text">{{ t('interpreter.type.team') }}</text>
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <view class="info-card">
        <view class="info-row">
          <text class="info-row__label">{{ t('interpreter.school') }}</text>
          <text class="info-row__value">{{ detail.school || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-row__label">{{ t('interpreter.studentId') }}</text>
          <text class="info-row__value">{{ detail.studentId || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-row__label">{{ t('interpreter.rating') }}</text>
          <view class="info-row__rating">
            <text class="info-row__star">★</text>
            <text class="info-row__rating-val">{{ detail.rating.toFixed(1) }}</text>
          </view>
        </view>
        <view class="info-row info-row--last">
          <text class="info-row__label">{{ t('interpreter.completedOrders') }}</text>
          <text class="info-row__value">{{ detail.totalOrders }} {{ t('interpreter.orders') }}</text>
        </view>
      </view>

      <!-- 时薪展示 -->
      <view class="price-card">
        <text class="price-card__label">{{ t('interpreter.hourlyRate') }}</text>
        <view class="price-card__amount">
          <text class="price-card__symbol">¥</text>
          <text class="price-card__val">{{ detail.hourlyRate.toFixed(0) }}</text>
          <text class="price-card__unit">/ {{ t('interpreter.hour') }}</text>
        </view>
      </view>

      <!-- 服务介绍 -->
      <view class="intro-card">
        <text class="section-title">{{ t('interpreter.introduction') }}</text>
        <text class="intro-text">{{ detail.displayIntroduction || detail.introduction || t('interpreter.noIntroduction') }}</text>
      </view>

      <!-- 证书展示 -->
      <view v-if="(detail.certUrl || '').split(',').filter(Boolean).length" class="cert-card">
        <text class="section-title">{{ t('interpreter.certificate') }}</text>
        <view class="cert-grid">
          <view
            v-for="(url, index) in (detail.certUrl || '').split(',').filter(Boolean)"
            :key="index"
            class="cert-grid__item"
            @tap="previewCert(url)"
          >
            <SafeImage
              class="cert-grid__img"
              :src="url"
              mode="aspectFill"
            />
          </view>
        </view>
        <text class="cert-hint">{{ t('interpreter.clickToPreview') }}</text>
      </view>

      <!-- 评论区 -->
      <view class="comments-card">
        <text class="section-title">{{ t('interpreter.comments') }} ({{ commentTotal }})</text>

        <view v-if="commentsLoading" class="status">
          <text class="status__text">{{ t('common.loading') }}</text>
        </view>

        <view v-else class="comment-list">
          <view v-if="commentList.length === 0" class="empty">
            <text class="empty__text">{{ t('interpreter.noComments') }}</text>
          </view>

          <view v-for="item in commentList" :key="item.id" class="comment-item">
            <view class="comment-header">
              <text class="comment-author">{{ item.authorNickname || t('common.anonymous') }}</text>
              <view class="comment-rating">
                <text class="comment-rating-star">★</text>
                <text class="comment-rating-val">{{ item.rating }}</text>
              </view>
              <text class="comment-time">{{ item.createTime?.split('T')[0] || '-' }}</text>
            </view>
            <text class="comment-content">{{ item.content }}</text>
          </view>

          <!-- 加载更多评论 -->
          <view v-if="hasMoreComments" class="load-more-comments" @tap="loadMoreComments">
            <text class="load-more-comments__text">{{ loadingMoreComments ? t('common.loading') : t('common.loadMore') }}</text>
          </view>
          <view v-else-if="commentList.length > 0" class="no-more-comments">
            <text class="no-more-comments__text">{{ t('common.noMore') }}</text>
          </view>
        </view>
      </view>

      <!-- 发表评论 -->
      <view class="post-comment-card">
        <text class="section-title">{{ t('interpreter.postComment') }}</text>
        <view v-if="!isUserLoggedIn" class="login-tip">
          <text class="login-tip__text">{{ t('interpreter.loginToComment') }}</text>
          <button class="login-tip__btn" @tap="() => uni.navigateTo({ url: '/pages/login/index' })">{{ t('restaurant.goLogin') }}</button>
        </view>
        <view v-else-if="isSelf" class="self-tip">
          <text class="self-tip__text">{{ t('interpreter.detail.cannotRateSelf') }}</text>
        </view>
        <view v-else class="comment-form">
          <!-- 评分选择 -->
          <view class="rating-selector">
            <text class="rating-selector__label">{{ t('interpreter.commentRating') }}</text>
            <view class="rating-selector__stars">
              <view
                v-for="i in 5"
                :key="i"
                class="star-option"
                :class="{ 'star-option--active': commentForm.rating >= i }"
                @tap="commentForm.rating = i"
              >
                <text class="star-option__icon">★</text>
              </view>
            </view>
          </view>

          <!-- 评论输入框 -->
          <textarea
            class="comment-input"
            v-model="commentForm.content"
            :placeholder="t('interpreter.commentPlaceholder')"
            placeholder-class="comment-placeholder"
            maxlength="500"
          />
          <text class="char-count">{{ commentForm.content.length }}/500</text>

          <!-- 提交按钮 -->
          <button
            class="submit-btn"
            :class="{ 'submit-btn--disabled': submittingComment }"
            :disabled="submittingComment"
            @tap="handlePostComment"
          >
            {{ submittingComment ? t('common.submitting') : t('common.submit') }}
          </button>
        </view>
      </view>

      <!-- 预约按钮 -->
      <view v-if="!isSelf" class="booking-bar">
        <button class="booking-btn" @tap="goToBooking">{{ t('interpreter.bookNow') }}</button>
      </view>
    </view>

    <!-- 底部占位（避免按钮遮挡内容） -->
    <view class="bottom-placeholder"></view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.interpreter-detail-page {
  min-height: 100vh;
  background-color: $color-bg-page;
}

.status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }

  &__retry-btn {
    margin-top: 32rpx;
    padding: 16rpx 48rpx;
    background-color: $color-primary;
    color: #ffffff;
    font-size: 28rpx;
    border-radius: 40rpx;
    border: none;
  }
}

.detail-content {
  padding: 24rpx;
}

/* ── 头部信息卡 ── */
.hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 48rpx 32rpx 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.hero-avatar-wrap {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 24rpx;
  border: 4rpx solid $color-primary-light;
}

.hero-avatar {
  width: 100%;
  height: 100%;
}

.hero-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.hero-name {
  font-size: 40rpx;
  font-weight: 700;
  color: $color-text-primary;
}

.hero-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  justify-content: center;
}

.level-badge {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;

  &__text {
    font-size: 22rpx;
    color: #ffffff;
    font-weight: 600;
  }
}

.service-badge {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  background-color: $color-divider;

  &__text {
    font-size: 22rpx;
    color: $color-text-secondary;
    font-weight: 500;
  }
}

/* ── 基本信息 ── */
.info-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 0 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 88rpx;
  border-bottom: 2rpx solid $color-divider;

  &--last {
    border-bottom: none;
  }

  &__label {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__value {
    font-size: 28rpx;
    color: $color-text-primary;
  }

  &__rating {
    display: flex;
    align-items: center;
    gap: 4rpx;
  }

  &__star {
    font-size: 26rpx;
    color: $color-rank-gold;
  }

  &__rating-val {
    font-size: 28rpx;
    font-weight: 600;
    color: $color-text-primary;
  }
}

/* ── 时薪展示 ── */
.price-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__label {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &__amount {
    display: flex;
    align-items: baseline;
  }

  &__symbol {
    font-size: 32rpx;
    font-weight: 600;
    color: $color-primary;
  }

  &__val {
    font-size: 56rpx;
    font-weight: 700;
    color: $color-primary;
    line-height: 1;
  }

  &__unit {
    font-size: 24rpx;
    color: $color-text-hint;
    margin-left: 4rpx;
  }
}

/* ── 服务介绍 ── */
.intro-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 16rpx;
}

.intro-text {
  font-size: 28rpx;
  color: $color-text-secondary;
  line-height: 1.6;
}

/* ── 证书展示 ── */
.cert-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.cert-image {
  width: 100%;
  border-radius: 12rpx;
  background-color: $color-divider;
}

.cert-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  &__item {
    width: 200rpx;
    height: 200rpx;
    border-radius: 8rpx;
    overflow: hidden;
  }

  &__img {
    width: 100%;
    height: 100%;
    border-radius: 8rpx;
  }
}

.cert-hint {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: $color-text-hint;
  margin-top: 12rpx;
}

/* ── 评论区 ── */
.comments-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.comment-list {
  margin-bottom: 24rpx;
}

.comment-item {
  padding: 20rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.comment-author {
  font-size: 26rpx;
  font-weight: 600;
  color: $color-text-primary;
}

.comment-rating {
  display: flex;
  align-items: center;
  gap: 4rpx;

  &__star {
    font-size: 22rpx;
    color: $color-rank-gold;
  }

  &__val {
    font-size: 24rpx;
    font-weight: 600;
    color: $color-text-primary;
  }
}

.comment-time {
  font-size: 22rpx;
  color: $color-text-hint;
  margin-left: auto;
}

.comment-content {
  font-size: 26rpx;
  color: $color-text-secondary;
  line-height: 1.6;
}

/* ── 加载更多评论 ── */
.load-more-comments {
  display: flex;
  justify-content: center;
  padding: 24rpx 0;

  &__text {
    font-size: 26rpx;
    color: $color-primary;
    font-weight: 500;
    padding: 12rpx 48rpx;
    border: 2rpx solid $color-primary;
    border-radius: 40rpx;
  }
}

.no-more-comments {
  display: flex;
  justify-content: center;
  padding: 24rpx 0;

  &__text {
    font-size: 24rpx;
    color: $color-text-hint;
  }
}

/* ── 发表评论 ── */
.post-comment-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.login-tip {
  text-align: center;
  padding: 40rpx 0;

  &__text {
    font-size: 26rpx;
    color: $color-text-hint;
    margin-bottom: 16rpx;
  }

  &__btn {
    padding: 16rpx 48rpx;
    background-color: $color-primary;
    color: #ffffff;
    font-size: 28rpx;
    border-radius: 40rpx;
    border: none;
  }
}

.comment-form {
  /* 评分选择 */
}

.rating-selector {
  margin-bottom: 20rpx;

  &__label {
    display: block;
    font-size: 26rpx;
    color: $color-text-secondary;
    margin-bottom: 12rpx;
  }

  &__stars {
    display: flex;
    gap: 8rpx;
  }
}

.star-option {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: pointer;

  &__icon {
    font-size: 32rpx;
    color: $color-divider;
    transition: all 0.3s ease;
  }

  &--active {
    transform: scale(1.2);

    .star-option__icon {
      color: $color-rank-gold;
      font-size: 36rpx;
      text-shadow: 0 0 8rpx rgba(255, 215, 0, 0.6);
    }
  }

  &:hover {
    transform: scale(1.1);
  }
}

.comment-input {
  width: 100%;
  height: 160rpx;
  padding: 16rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: $color-text-primary;
  line-height: 1.5;
  box-sizing: border-box;
  margin-bottom: 12rpx;
}

.comment-placeholder {
  color: $color-text-hint;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: $color-text-hint;
  margin-bottom: 16rpx;
}

.submit-btn {
  width: 100%;
  height: 80rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 40rpx;
  border: none;
  line-height: 80rpx;

  &--disabled {
    opacity: 0.6;
  }
}

/* ── 预约按钮 ── */
.booking-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background-color: $color-bg-card;
  border-top: 2rpx solid $color-divider;
}

.booking-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  line-height: 88rpx;
}

.bottom-placeholder {
  height: 120rpx;
}

/* ── 收藏按钮 ── */
.favorite-btn {
  padding: 12rpx;

  &__icon {
    font-size: 48rpx;
  }
}

/* ── 自我评价提示 ── */
.self-tip {
  text-align: center;
  padding: 40rpx 0;

  &__text {
    font-size: 26rpx;
    color: $color-text-hint;
  }
}
</style>
