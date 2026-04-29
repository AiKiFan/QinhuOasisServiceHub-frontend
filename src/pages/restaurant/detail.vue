<!--
  餐厅详情页
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getRestaurantDetail } from '@/api/restaurant'
import { getCommentList, postComment, COMMENT_TARGET_TYPE } from '@/api/comment'
import { isLoggedIn, getUser } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

/** 页面参数（餐厅 ID） */
const pageOptions = ref(uni.getStorageSync('pageOptions') || {})

/** 餐厅详情数据 */
const detail = ref(null)
/** 加载状态 */
const loading = ref(false)
/** 是否加载失败 */
const hasError = ref(false)

/** 评论列表 */
const commentList = ref([])
/** 评论总数 */
const commentTotal = ref(0)
/** 评论当前页码 */
const commentPage = ref(1)
/** 评论是否还有更多 */
const hasMoreComments = ref(true)
/** 评论加载中 */
const commentsLoading = ref(false)
/** 评论加载更多中 */
const loadingMoreComments = ref(false)

/** 评论表单 */
const commentForm = ref({
  content: '',
  rating: 5,
})

/** 提交中状态 */
const submittingComment = ref(false)

/** 评论每页条数 */
const COMMENT_PAGE_SIZE = 10

/** 是否已登录 */
const isUserLoggedIn = computed(() => isLoggedIn())

/** 当前用户 */
const currentUser = computed(() => getUser())

/**
 * 加载餐厅详情
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
    detail.value = await getRestaurantDetail(id)
    loadComments(true)
  } catch {
    hasError.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 加载评论列表（分页）
 * @param {boolean} refresh - 是否刷新（重置为第一页）
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
      targetType: COMMENT_TARGET_TYPE.RESTAURANT,
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

    // 判断是否还有更多评论
    hasMoreComments.value = commentList.value.length < commentTotal.value
  } finally {
    commentsLoading.value = false
    loadingMoreComments.value = false
  }
}

/**
 * 加载更多评论
 */
function loadMoreComments() {
  if (loadingMoreComments.value || !hasMoreComments.value) return
  commentPage.value++
  loadComments(false)
}

/**
 * 提交评论
 */
async function handlePostComment() {
  if (!isUserLoggedIn.value) {
      uni.showModal({
      title: t('common.confirm'),
      content: t('restaurant.loginToComment'),
      confirmText: t('restaurant.goLogin'),
      success(res) {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' })
        }
      },
    })
    return
  }
  if (!commentForm.value.content.trim()) {
    uni.showToast({ title: t('common.loading'), icon: 'none' })
    return
  }
  submittingComment.value = true
  try {
    await postComment({
      targetId: detail.value.id,
      targetType: COMMENT_TARGET_TYPE.RESTAURANT,
      content: commentForm.value.content,
      rating: commentForm.value.rating,
    })
    uni.showToast({ title: t('restaurant.commentSuccess'), icon: 'success' })
    commentForm.value.content = ''
    commentForm.value.rating = 5
    // 提交成功后刷新评论列表
    loadComments(true)
  } catch {
    // 错误已在 request.js 中通过 Toast 展示
  } finally {
    submittingComment.value = false
  }
}

/**
 * 打开地图
 */
function openMap() {
  if (!detail.value?.lat || !detail.value?.lng) {
    uni.showToast({ title: '暂无位置信息', icon: 'none' })
    return
  }
  uni.openLocation({
    latitude: detail.value.lat,
    longitude: detail.value.lng,
    name: detail.value.displayName,
    address: detail.value.address,
  })
}

/**
 * 拨打电话
 */
function makePhoneCall() {
  if (!detail.value?.phone) {
    uni.showToast({ title: '暂无电话信息', icon: 'none' })
    return
  }
  uni.makePhoneCall({
    phoneNumber: detail.value.phone,
  })
}

onMounted(() => {
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
  <view class="restaurant-detail-page">
    <!-- 加载中状态 -->
    <view v-if="loading" class="status">
      <text class="status__text">加载中...</text>
    </view>

    <!-- 加载失败状态 -->
    <view v-else-if="hasError" class="status">
      <text class="status__text">加载失败，请重试</text>
      <button class="status__retry-btn" @tap="loadDetail">重新加载</button>
    </view>

    <!-- 详情内容 -->
    <view v-else-if="detail" class="detail-content">
      <!-- 封面轮播图 -->
      <scroll-view scroll-x class="cover-scroll">
        <view class="cover-list">
          <SafeImage
            v-for="(img, idx) in JSON.parse(detail.images || '[]')"
            :key="idx"
            class="cover-img"
            :src="img"
            mode="aspectFill"
          />
        </view>
      </scroll-view>

      <!-- 基本信息 -->
      <view class="info-card">
        <text class="info-card__title">{{ detail.displayName }}</text>
        <view class="info-card__meta">
          <view class="meta-item">
            <text class="meta-item__icon">🍽</text>
            <text class="meta-item__text">{{ detail.category }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-item__icon">💰</text>
            <text class="meta-item__text">¥{{ detail.avgPrice }}/人</text>
          </view>
          <view class="meta-item">
            <text class="meta-item__icon">⭐</text>
            <text class="meta-item__text">{{ detail.rating.toFixed(1) }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-item__icon">💬</text>
            <text class="meta-item__text">{{ detail.reviewCount }} 条评价</text>
          </view>
        </view>

        <!-- 标签 -->
        <view v-if="detail.tags" class="tags-section">
          <view
            v-for="(tag, idx) in JSON.parse(detail.tags)"
            :key="idx"
            class="tag-item"
          >
            <text class="tag-item__text">{{ tag }}</text>
          </view>
        </view>

        <!-- 营业时间 -->
        <view class="info-row">
          <text class="info-row__label">营业时间</text>
          <text class="info-row__value">{{ detail.businessHours || '-' }}</text>
        </view>

        <!-- 地址 -->
        <view class="info-row" @tap="openMap">
          <text class="info-row__label">地址</text>
          <text class="info-row__value info-row__link">{{ detail.address || '-' }}</text>
        </view>

        <!-- 电话 -->
        <view class="info-row" @tap="makePhoneCall">
          <text class="info-row__label">电话</text>
          <text class="info-row__value info-row__link">{{ detail.phone || '-' }}</text>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="comments-card">
        <text class="section-title">用户评价 ({{ commentTotal }})</text>

        <view v-if="commentsLoading" class="status">
          <text class="status__text">加载中...</text>
        </view>

        <view v-else class="comment-list">
          <view v-if="commentList.length === 0" class="empty">
            <text class="empty__text">暂无评价</text>
          </view>

          <view v-for="item in commentList" :key="item.id" class="comment-item">
            <view class="comment-header">
              <text class="comment-author">{{ item.authorNickname || '匿名' }}</text>
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
            <text class="load-more-comments__text">{{ loadingMoreComments ? '加载中...' : '查看更多评价' }}</text>
          </view>
          <view v-else-if="commentList.length > 0" class="no-more-comments">
            <text class="no-more-comments__text">已显示全部评价</text>
          </view>
        </view>
      </view>

      <!-- 发表评论 -->
      <view class="post-comment-card">
        <text class="section-title">发表评价</text>
        <view v-if="!isUserLoggedIn" class="login-tip">
          <text class="login-tip__text">登录后才能评价</text>
          <button class="login-tip__btn" @tap="() => uni.navigateTo({ url: '/pages/login/index' })">去登录</button>
        </view>
        <view v-else class="comment-form">
          <!-- 评分选择 -->
          <view class="rating-selector">
            <text class="rating-selector__label">评分</text>
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
            placeholder="分享你的用餐体验..."
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
            {{ submittingComment ? '提交中...' : '提交评价' }}
          </button>
        </view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="bottom-placeholder"></view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.restaurant-detail-page {
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

/* ── 封面轮播 ── */
.cover-scroll {
  white-space: nowrap;
  margin-bottom: 24rpx;
}

.cover-list {
  display: inline-flex;
  gap: 12rpx;
}

.cover-img {
  width: 600rpx;
  height: 360rpx;
  border-radius: 20rpx;
  background-color: $color-divider;
}

/* ── 基本信息 ── */
.info-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__title {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: $color-text-primary;
    margin-bottom: 24rpx;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 24rpx;
    margin-bottom: 24rpx;
  }
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;

  &__icon {
    font-size: 28rpx;
  }

  &__text {
    font-size: 24rpx;
    color: $color-text-secondary;
  }
}

.tags-section {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.tag-item {
  padding: 8rpx 16rpx;
  background-color: $color-primary-light;
  border-radius: 20rpx;

  &__text {
    font-size: 22rpx;
    color: $color-primary;
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid $color-divider;
  height: 72rpx;

  &:last-child {
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

  &__link {
    color: $color-primary;
    text-decoration: underline;
  }
}

/* ── 评论区 ── */
.comments-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 20rpx;
}

.empty {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;

  &__text {
    font-size: 26rpx;
    color: $color-text-hint;
  }
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
  margin-bottom: 24rpx;
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

  &__icon {
    font-size: 32rpx;
    color: $color-divider;
  }

  &--active & .star-option__icon {
    color: $color-rank-gold;
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

.bottom-placeholder {
  height: 120rpx;
}
</style>
