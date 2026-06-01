<!--
  餐厅详情页
  @author AiKiFan
-->
<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getRestaurantDetail } from '@/api/restaurant'
import { getCommentList, postComment, COMMENT_TARGET_TYPE } from '@/api/comment'
import { isLoggedIn, getUser } from '@/utils/auth'
import { t } from '@/utils/i18n'
import { checkFavorite, addFavorite, removeFavorite, FAVORITE_TYPE } from '@/api/favorites'
import SafeImage from '@/components/SafeImage/index.vue'

/** 页面参数（餐厅 ID），由 onLoad 注入，不再依赖 Storage 脏数据 */
const pageOptions = ref({})

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

/** 登录提示弹窗 */
const showLoginHint = ref(false)
const loginHintMessage = ref('')

/** 是否已登录 */
const isUserLoggedIn = computed(() => isLoggedIn())

/** 当前用户 */
const currentUser = computed(() => getUser())

/** 是否已收藏 */
const isFavorited = ref(false)

/** 全部图片列表 */
const imageList = computed(() => {
  const raw = detail.value?.images
  if (!raw) return []
  // 如果已经是数组（后端直接返回），直接用；如果是字符串则解析
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

/** 轮播图（最多4张） */
const carouselImages = computed(() => imageList.value.slice(0, 4))

/** 是否有更多图片 */
const hasMoreImages = computed(() => imageList.value.length > 4)

/** 当前轮播图索引 */
const carouselIndex = ref(0)

/**
 * 切换收藏状态
 */
async function toggleFavorite() {
  const restaurant = detail.value
  if (!restaurant) return

  if (!isLoggedIn()) {
    loginHintMessage.value = '请先登录后再收藏'
    showLoginHint.value = true
    return
  }

  const previousState = isFavorited.value
  try {
    if (isFavorited.value) {
      await removeFavorite(FAVORITE_TYPE.RESTAURANT, restaurant.id)
      isFavorited.value = false
      uni.showToast({ title: t('favorites.removed'), icon: 'success' })
    } else {
      await addFavorite(FAVORITE_TYPE.RESTAURANT, restaurant.id)
      isFavorited.value = true
      uni.showToast({ title: '已收藏', icon: 'success' })
    }
  } catch (error) {
    isFavorited.value = previousState
    uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
  }
}

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
    // 检查收藏状态（如果已登录）
    if (isLoggedIn()) {
      try {
        const result = await checkFavorite(FAVORITE_TYPE.RESTAURANT, id)
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
 * 预览当前轮播图
 */
function previewCurrentImage() {
  if (imageList.value.length > 0) {
    uni.previewImage({ urls: imageList.value, current: imageList.value[carouselIndex.value] })
  }
}

/**
 * 打开相册页
 */
function openAlbum() {
  const id = detail.value?.id
  if (!id) return
  uni.navigateTo({ url: `/pages/restaurant/album?id=${id}` })
}

/**
 * 提交评论
 */
async function handlePostComment() {
  if (!isUserLoggedIn.value) {
    loginHintMessage.value = t('restaurant.loginToComment')
    showLoginHint.value = true
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

/** 导航到登录页 */
function goToLogin() {
  showLoginHint.value = false
  uni.navigateTo({ url: '/pages/login/index' })
}

/**
 * 打开地图
 */
function openMap() {
  if (!detail.value?.lat || !detail.value?.lng) {
    uni.showToast({ title: '暂无位置信息', icon: 'none' })
    return
  }
  const lat = parseFloat(detail.value.lat)
  const lng = parseFloat(detail.value.lng)
  // #ifdef H5
  // H5 环境：打开高德地图网页版，页面顶部有"到这里"按钮
  const name = encodeURIComponent(detail.value.displayName || '餐厅位置')
  window.open(
    `https://ditu.amap.com/?geo=${lng},${lat}&name=${name}`,
    '_blank'
  )
  // #endif
  // #ifndef H5
  uni.openLocation({
    latitude: lat,
    longitude: lng,
    name: detail.value.displayName,
    address: detail.value.address,
    fail: () => {
      uni.showToast({ title: '导航失败', icon: 'none' })
    }
  })
  // #endif
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

onLoad((options) => {
  // uni-app 官方方式：onLoad 回调参数即为 URL query 解析后的对象
  // 例如 /pages/restaurant/detail?id=1 → options = { id: '1' }
  pageOptions.value = options || {}
  uni.setNavigationBarTitle({ title: t('page.restaurantDetail.title') })
  loadDetail()
})
</script>

<template>
  <view class="restaurant-detail-page">
    <!-- 加载中状态 -->
    <view v-if="loading" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 加载失败状态 -->
    <view v-else-if="hasError" class="status">
      <text class="status__text">{{ t('common.loadFailed') }}</text>
      <view class="status__retry-btn" @tap="loadDetail">{{ t('common.retry') }}</view>
    </view>

    <!-- 详情内容 -->
    <view v-else-if="detail" class="detail-content">
      <!-- 图片轮播 -->
      <view v-if="carouselImages.length > 0" class="carousel-wrap">
        <swiper
          class="carousel"
          :autoplay="carouselImages.length > 1"
          :interval="4000"
          :circular="true"
          @change="carouselIndex = $event.detail.current"
        >
          <swiper-item
            v-for="(img, idx) in carouselImages"
            :key="idx"
            class="carousel-item"
          >
            <SafeImage
              class="carousel-img"
              :src="img"
              mode="aspectFill"
              @tap="previewCurrentImage"
            />
          </swiper-item>
        </swiper>
        <!-- 轮播指示器 -->
        <view v-if="carouselImages.length > 1" class="carousel-dots">
          <view
            v-for="i in carouselImages.length"
            :key="i"
            class="carousel-dot"
            :class="{ 'carousel-dot--active': carouselIndex === i - 1 }"
          />
        </view>
        <!-- 更多图片提示 -->
        <view v-if="hasMoreImages" class="carousel-more" @tap="openAlbum">
          <text class="carousel-more__text">{{ t('restaurant.album') }} ›</text>
        </view>
      </view>
      <!-- 无图片占位 -->
      <view v-else class="carousel-placeholder">
        <text class="carousel-placeholder__icon">🍽</text>
        <text class="carousel-placeholder__text">{{ t('restaurant.noImages') }}</text>
      </view>

      <!-- 基本信息 -->
      <view class="info-card">
        <view class="info-card__header">
          <text class="info-card__title">{{ detail.displayName }}</text>
          <view class="favorite-btn" @tap="toggleFavorite">
            <text class="favorite-btn__icon">{{ isFavorited ? '❤️' : '🤍' }}</text>
          </view>
        </view>
        <view class="info-card__meta">
          <view class="meta-item">
            <text class="meta-item__icon">🍽</text>
            <text class="meta-item__text">{{ detail.category }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-item__icon">💰</text>
            <text class="meta-item__text">¥{{ detail.avgPrice }}{{ t('restaurant.perPerson') }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-item__icon">⭐</text>
            <text class="meta-item__text">{{ detail.rating.toFixed(1) }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-item__icon">💬</text>
            <text class="meta-item__text">{{ detail.reviewCount }} {{ t('restaurant.reviews') }}</text>
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
          <text class="info-row__label">{{ t('restaurant.businessHours') }}</text>
          <text class="info-row__value">{{ detail.businessHours || '-' }}</text>
        </view>

        <!-- 地址 -->
        <view class="info-row" @tap="openMap">
          <text class="info-row__label">{{ t('restaurant.address') }}</text>
          <text class="info-row__value info-row__link">{{ detail.address || '-' }}</text>
        </view>

        <!-- 电话 -->
        <view class="info-row" @tap="makePhoneCall">
          <text class="info-row__label">{{ t('restaurant.phone') }}</text>
          <text class="info-row__value info-row__link">{{ detail.phone || '-' }}</text>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="comments-card">
        <text class="section-title">{{ t('restaurant.comments') }} ({{ commentTotal }})</text>

        <view v-if="commentsLoading" class="status">
          <text class="status__text">{{ t('common.loading') }}</text>
        </view>

        <view v-else class="comment-list">
          <view v-if="commentList.length === 0" class="empty">
            <text class="empty__text">{{ t('restaurant.noComments') }}</text>
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
            <text class="load-more-comments__text">{{ loadingMoreComments ? t('common.loading') : t('restaurant.loadMoreComments') }}</text>
          </view>
          <view v-else-if="commentList.length > 0" class="no-more-comments">
            <text class="no-more-comments__text">{{ t('restaurant.allCommentsLoaded') }}</text>
          </view>
        </view>
      </view>

      <!-- 发表评论 -->
      <view class="post-comment-card">
        <text class="section-title">{{ t('restaurant.postComment') }}</text>
        <view v-if="!isUserLoggedIn" class="login-tip">
          <text class="login-tip__text">{{ t('restaurant.loginToComment') }}</text>
          <button class="login-tip__btn" @tap="() => uni.navigateTo({ url: '/pages/login/index' })">{{ t('restaurant.goLogin') }}</button>
        </view>
        <view v-else class="comment-form">
          <!-- 评分选择 -->
          <view class="rating-selector">
            <text class="rating-selector__label">{{ t('restaurant.ratingLabel') }}</text>
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
            :placeholder="t('restaurant.commentPlaceholder')"
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
            {{ submittingComment ? t('restaurant.submittingComment') : t('restaurant.submitComment') }}
          </button>
        </view>
      </view>
    </view>

    <!-- 登录提示弹窗 -->
    <view v-if="showLoginHint" class="login-hint-overlay" @tap.self="showLoginHint = false">
      <view class="login-hint-dialog" @tap.stop>
        <view class="login-hint-icon">!</view>
        <text class="login-hint-title">{{ t('common.loginRequired') }}</text>
        <text class="login-hint-msg">{{ loginHintMessage }}</text>
        <view class="login-hint-btn login-hint-btn--primary" @tap="goToLogin">{{ t('restaurant.goLogin') }}</view>
        <view class="login-hint-btn login-hint-btn--cancel" @tap="showLoginHint = false">{{ t('common.cancel') }}</view>
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

/* ── 图片轮播 ── */
.carousel-wrap {
  position: relative;
  margin-bottom: 24rpx;
  border-radius: 20rpx;
  overflow: hidden;
}

.carousel {
  width: 100%;
  height: 400rpx;
}

.carousel-item {
  width: 100%;
  height: 100%;
}

.carousel-img {
  width: 100%;
  height: 100%;
}

.carousel-dots {
  position: absolute;
  bottom: 20rpx;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 10rpx;
}

.carousel-dot {
  width: 16rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background-color: rgba(255, 255, 255, 0.5);

  &--active {
    width: 32rpx;
    background-color: #ffffff;
  }
}

.carousel-more {
  position: absolute;
  bottom: 20rpx;
  right: 20rpx;
  padding: 8rpx 16rpx;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 20rpx;
  z-index: 10;

  &__text {
    font-size: 22rpx;
    color: #ffffff;
    line-height: 1;
    font-family: sans-serif;
  }
}

.carousel-placeholder {
  height: 300rpx;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;

  &__icon {
    font-size: 80rpx;
    opacity: 0.4;
  }

  &__text {
    font-size: 26rpx;
    color: $color-text-hint;
  }
}

/* ── 基本信息 ── */
.info-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;
  }

  &__title {
    flex: 1;
    font-size: 40rpx;
    font-weight: 700;
    color: $color-text-primary;
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
  transition: all 0.3s ease;
  cursor: pointer;

  &__icon {
    font-size: 32rpx;
    color: $color-divider;
    transition: all 0.3s ease;
  }

  &--active {
    transform: scale(1.2);

    & .star-option__icon {
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

.bottom-placeholder {
  height: 120rpx;
}

/* ── 登录提示弹窗 ── */
.login-hint-overlay {
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

.login-hint-dialog {
  width: 100%;
  max-width: 600rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  padding: 60rpx 32rpx 48rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  text-align: center;
}

.login-hint-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%);
  color: #fff;
  font-size: 48rpx;
  font-weight: 700;
  line-height: 100rpx;
  text-align: center;
  margin: 0 auto 24rpx;
}

.login-hint-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $color-text-primary;
  margin-bottom: 12rpx;
}

.login-hint-msg {
  display: block;
  font-size: 26rpx;
  color: $color-text-secondary;
  line-height: 1.6;
  margin-bottom: 32rpx;
  word-break: break-all;
}

.login-hint-btn {
  display: block;
  width: 100%;
  height: 80rpx;
  border-radius: 40rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 80rpx;
  text-align: center;
  margin-top: 16rpx;
  overflow: hidden;

  &--primary {
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
  }

  &--cancel {
    background-color: $color-bg-page;
    color: $color-text-secondary;
  }
}

/* ── 收藏按钮 ── */
.favorite-btn {
  padding: 12rpx;

  &__icon {
    font-size: 48rpx;
  }
}
</style>
