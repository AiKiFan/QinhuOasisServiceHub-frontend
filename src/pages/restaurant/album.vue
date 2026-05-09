<!--
  餐厅相册页
  展示餐厅的全部图片网格，点击可放大预览
  @author AiKiFan
-->
<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getRestaurantDetail } from '@/api/restaurant'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

/** 页面参数（餐厅 ID） */
const pageOptions = ref({})

/** 餐厅详情数据 */
const detail = ref(null)
/** 加载状态 */
const loading = ref(false)
/** 是否有错误 */
const hasError = ref(false)

/** 全部图片列表 */
const imageList = computed(() => {
  const raw = detail.value?.images
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

/**
 * 预览图片
 * @param {number} index - 当前点击图片的索引
 */
function previewImage(index) {
  if (imageList.value.length > 0) {
    uni.previewImage({ urls: imageList.value, current: imageList.value[index] })
  }
}

onLoad((options) => {
  pageOptions.value = options || {}
  const id = options?.id
  if (!id) {
    hasError.value = true
    return
  }
  uni.setNavigationBarTitle({ title: t('restaurant.albumPageTitle') })
  loading.value = true
  hasError.value = false
  getRestaurantDetail(Number(id))
    .then((res) => {
      detail.value = res
    })
    .catch(() => {
      hasError.value = true
    })
    .finally(() => {
      loading.value = false
    })
})
</script>

<template>
  <view class="album-page">
    <!-- 加载中 -->
    <view v-if="loading" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="hasError" class="status">
      <text class="status__text">{{ t('common.loadFailed') }}</text>
      <button class="status__retry-btn" @tap="() => location.reload()">{{ t('common.retry') }}</button>
    </view>

    <!-- 相册内容 -->
    <view v-else-if="detail" class="album-content">
      <!-- 餐厅名称头部 -->
      <view class="album-header">
        <text class="album-header__name">{{ detail.displayName }}</text>
        <text class="album-header__count">{{ imageList.length }} {{ t('restaurant.photoCount') }}</text>
      </view>

      <!-- 无图片提示 -->
      <view v-if="imageList.length === 0" class="empty">
        <text class="empty__icon">📷</text>
        <text class="empty__text">{{ t('restaurant.noImages') }}</text>
      </view>

      <!-- 图片网格 -->
      <view v-else class="image-grid">
        <view
          v-for="(img, idx) in imageList"
          :key="idx"
          class="image-grid__item"
          @tap="previewImage(idx)"
        >
          <SafeImage class="image-grid__img" :src="img" mode="aspectFill" />
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.album-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding: 24rpx;
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

.album-content {
  /* 内容 */
}

.album-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
  }

  &__count {
    font-size: 24rpx;
    color: $color-text-hint;
  }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120rpx;
  gap: 16rpx;

  &__icon {
    font-size: 80rpx;
    opacity: 0.4;
  }

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  &__item {
    width: calc((100vw - 48rpx - 24rpx) / 3);
    height: calc((100vw - 48rpx - 24rpx) / 3);
    border-radius: 12rpx;
    overflow: hidden;
    background-color: $color-divider;
  }

  &__img {
    width: 100%;
    height: 100%;
  }
}
</style>
