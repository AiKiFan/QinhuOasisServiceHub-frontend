<!--
  景点详情页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { t } from '@/utils/i18n'
import { getScenicSpotDetail } from '@/api/scenic'
import { addFavorite, removeFavorite, checkFavorite } from '@/api/favorites'
import SafeImage from '@/components/SafeImage/index.vue'

/** 景点ID */
const spotId = ref('')
/** 景点详情 */
const spot = ref(null)
/** 加载状态 */
const loading = ref(false)
/** 是否收藏 */
const isFavorited = ref(false)
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
    // 检查是否已收藏
    const favorited = await checkFavorite('scenic', spotId.value)
    isFavorited.value = favorited
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
  } catch (error) {
    // API调用失败,恢复状态
    isFavorited.value = !isFavorited.value
    uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
  }
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
  uni.openLocation({
    latitude: parseFloat(spot.value.lat),
    longitude: parseFloat(spot.value.lng),
    name: spot.value.displayName,
    address: spot.value.address,
    fail: () => {
      uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
    }
  })
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