<!--
  景点详情页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { t } from '@/utils/i18n'
import { getScenicSpotDetail } from '@/api/scenic'
import { addFavorite, removeFavorite, checkFavorite } from '@/api/favorites'
import { isLoggedIn } from '@/utils/auth'
import SafeImage from '@/components/SafeImage/index.vue'

/** 景点ID */
const spotId = ref('')
/** 景点详情 */
const spot = ref(null)
/** 加载状态 */
const loading = ref(false)
/** 是否收藏 */
const isFavorited = ref(false)
/** 登录提示弹窗 */
const showLoginHint = ref(false)
/** 图片列表 */
const imageList = ref([])

/**
 * 加载景点详情
 */
async function loadDetail() {
  loading.value = true
  try {
    spot.value = await getScenicSpotDetail(spotId.value)
    // 解析图片列表
    if (spot.value.images) {
      try {
        imageList.value = JSON.parse(spot.value.images)
      } catch {
        imageList.value = []
      }
    }
    // 检查是否已收藏（仅登录用户）
    if (isLoggedIn()) {
      try {
        const favorited = await checkFavorite('scenic', spotId.value)
        isFavorited.value = favorited || false
      } catch {
        isFavorited.value = false
      }
    }
  } catch {
    /* error handled by request.js */
  } finally {
    loading.value = false
  }
}

/**
 * 切换收藏状态
 */
async function toggleFavorite() {
  if (!isLoggedIn()) {
    showLoginHint.value = true
    return
  }

  try {
    if (isFavorited.value) {
      await removeFavorite('scenic', spotId.value)
      isFavorited.value = false
      uni.showToast({ title: t('favorites.removed'), icon: 'success' })
    } else {
      await addFavorite('scenic', spotId.value)
      isFavorited.value = true
      uni.showToast({ title: t('favorites.added'), icon: 'success' })
    }
  } catch {
    isFavorited.value = !isFavorited.value
    uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
  }
}

/** 导航到登录页 */
function goLogin() {
  showLoginHint.value = false
  uni.navigateTo({ url: '/pages/login/index' })
}

/**
 * 预览图片
 */
function previewImage(url) {
  uni.previewImage({ urls: [url], current: url })
}

/**
 * 导航到景点
 */
function navigateToSpot() {
  if (!spot.value.lat || !spot.value.lng) return
  const lat = parseFloat(spot.value.lat)
  const lng = parseFloat(spot.value.lng)
  // #ifdef H5
  // H5 环境：打开高德地图网页版，页面顶部有"到这里"按钮
  const name = encodeURIComponent(spot.value.displayName || '景点位置')
  window.open(
    `https://ditu.amap.com/?geo=${lng},${lat}&name=${name}`,
    '_blank'
  )
  // #endif
  // #ifndef H5
  uni.openLocation({
    latitude: lat,
    longitude: lng,
    name: spot.value.displayName,
    address: spot.value.address,
    fail: () => {
      uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
    }
  })
  // #endif
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || currentPage.$page?.options || {}
  spotId.value = options.id
  if (spotId.value) {
    loadDetail()
  }
  // 动态设置导航栏标题
  uni.setNavigationBarTitle({ title: t('page.scenicDetail.title') })
})
</script>

<template>
  <view class="scenic-detail-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 景点详情 -->
    <view v-else-if="spot" class="scenic-detail">
      <!-- 封面图 -->
      <SafeImage
        class="scenic-detail__cover"
        :src="spot.coverImg"
        mode="aspectFill"
        :previewable="true"
        @tap="previewImage(spot.coverImg)"
      />

      <!-- 基本信息 -->
      <view class="scenic-info">
        <view class="scenic-info__header">
          <text class="scenic-info__name">{{ spot.displayName }}</text>
          <view class="favorite-btn" @tap="toggleFavorite">
            <text class="favorite-btn__icon">{{ isFavorited ? '❤️' : '🤍' }}</text>
          </view>
        </view>
        <view class="scenic-info__meta">
          <text class="scenic-info__rating">⭐ {{ spot.rating }}</text>
          <text class="scenic-info__reviews">{{ spot.reviewCount }} {{ t('scenic.reviews') }}</text>
          <text class="scenic-info__price">
            {{ spot.ticketPrice > 0 ? '¥' + spot.ticketPrice : t('scenic.free') }}
          </text>
        </view>
      </view>

      <!-- 开放时间 -->
      <view class="info-card">
        <text class="info-card__title">{{ t('scenic.openingHours') }}</text>
        <text class="info-card__value">{{ spot.openingHours }}</text>
      </view>

      <!-- 地址 -->
      <view class="info-card" @tap="navigateToSpot">
        <text class="info-card__title">{{ t('scenic.address') }}</text>
        <view class="info-card__row">
          <text class="info-card__value info-card__value--flex">{{ spot.address }}</text>
          <text class="info-card__nav">导航 ›</text>
        </view>
      </view>

      <!-- 景点介绍 -->
      <view v-if="spot.displayDescription" class="info-card">
        <text class="info-card__title">{{ t('scenic.introduction') }}</text>
        <text class="info-card__desc">{{ spot.displayDescription }}</text>
      </view>

      <!-- 图片展示 -->
      <view v-if="imageList.length > 0" class="info-card">
        <text class="info-card__title">{{ t('scenic.images') }}</text>
        <view class="image-grid">
          <view
            v-for="(img, index) in imageList"
            :key="index"
            class="image-grid__item"
            @tap="previewImage(img)"
          >
            <SafeImage :src="img" mode="aspectFill" />
          </view>
        </view>
      </view>
    </view>

    <!-- 登录提示弹窗 -->
    <view v-if="showLoginHint" class="interpreter-overlay" @tap.self="showLoginHint = false">
      <view class="interpreter-dialog interpreter-dialog--center" @tap.stop>
        <view class="hint-icon">!</view>
        <text class="hint-title">{{ t('common.loginRequired') }}</text>
        <text class="hint-msg">请先登录后再收藏景点</text>
        <view class="interpreter-btn interpreter-btn--primary interpreter-btn--full" @tap="goLogin">{{ t('auth.login') }}</view>
        <view class="interpreter-btn interpreter-btn--cancel interpreter-btn--full" @tap="showLoginHint = false">{{ t('common.cancel') }}</view>
      </view>
    </view>

    <!-- 返回按钮 -->
    <view class="back-btn" @tap="() => uni.navigateBack()">
      <text class="back-btn__icon">‹</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.scenic-detail-page {
  min-height: 100vh;
  background-color: $color-bg-page;
}

.status {
  display: flex;
  justify-content: center;
  padding: 200rpx 0;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}

.scenic-detail {
  &__cover {
    width: 100%;
    height: 400rpx;
  }
}

.scenic-info {
  padding: 24rpx;
  background-color: $color-bg-card;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12rpx;
  }

  &__name {
    font-size: 36rpx;
    font-weight: 700;
    color: $color-text-primary;
    flex: 1;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }

  &__rating {
    font-size: 26rpx;
    color: $color-primary;
  }

  &__reviews {
    font-size: 24rpx;
    color: $color-text-hint;
  }

  &__price {
    font-size: 28rpx;
    color: $color-primary;
    font-weight: 600;
    margin-left: auto;
  }
}

.favorite-btn {
  flex-shrink: 0;
  padding: 8rpx;

  &__icon {
    font-size: 44rpx;
  }
}

.info-card {
  margin: 20rpx 24rpx;
  padding: 24rpx;
  background-color: $color-bg-card;
  border-radius: 16rpx;

  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: 12rpx;
  }

  &__value {
    font-size: 26rpx;
    color: $color-text-secondary;

    &--flex {
      flex: 1;
    }
  }

  &__row {
    display: flex;
    align-items: center;
  }

  &__nav {
    font-size: 26rpx;
    color: $color-primary;
    margin-left: 16rpx;
  }

  &__desc {
    font-size: 26rpx;
    color: $color-text-secondary;
    line-height: 1.6;
  }
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  margin-top: 12rpx;

  &__item {
    width: 200rpx;
    height: 160rpx;
    border-radius: 8rpx;
    overflow: hidden;
  }
}

/* ── 登录提示弹窗 ── */
.interpreter-overlay {
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

.interpreter-dialog {
  width: 100%;
  max-width: 600rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);

  &--center {
    text-align: center;
    padding: 60rpx 32rpx 48rpx;
  }
}

.interpreter-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 80rpx;
  text-align: center;

  &--cancel {
    background-color: $color-bg-page;
    color: $color-text-secondary;
  }

  &--primary {
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
  }

  &--full {
    margin-top: 8rpx;
  }
}

.hint-icon {
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

.hint-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $color-text-primary;
  margin-bottom: 12rpx;
}

.hint-msg {
  display: block;
  font-size: 26rpx;
  color: $color-text-secondary;
  line-height: 1.6;
  margin-bottom: 32rpx;
}

.back-btn {
  position: fixed;
  top: 80rpx;
  left: 24rpx;
  width: 64rpx;
  height: 64rpx;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &__icon {
    font-size: 40rpx;
    color: #ffffff;
    font-weight: bold;
  }
}
</style>