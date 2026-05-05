<!--
  首页轮播图组件
  展示景区宣传图、餐厅推荐、译员服务等
  @author AiKiFan
-->
<script setup>
import { ref } from 'vue'

/** 轮播项配置 */
const SWIPER_ITEMS = [
  {
    title: '🏔️ 明月山景区',
    subtitle: '国家级旅游度假区 · 天然氧吧',
    bg: 'linear-gradient(135deg, #43A047 0%, #1B5E20 100%)',
  },
  {
    title: '🍜 美食餐厅',
    subtitle: '品味宜春特色美食 · 人气餐厅排行榜',
    bg: 'linear-gradient(135deg, #E8956D 0%, #BF6A4A 100%)',
  },
  {
    title: '🌍 译员服务',
    subtitle: '专业学生讲解 · 英汉双语服务',
    bg: 'linear-gradient(135deg, #5C6BC0 0%, #3949AB 100%)',
  },
  {
    title: '📋 投诉建议',
    subtitle: '您的意见是我们进步的动力',
    bg: 'linear-gradient(135deg, #F48FB1 0%, #C2185B 100%)',
  },
]

const swiperCurrent = ref(0)

function onChange(e) {
  swiperCurrent.value = e.detail.current
}
</script>

<template>
  <view class="swiper-wrap">
    <swiper
      class="swiper-wrap__swiper"
      :circular="true"
      :autoplay="true"
      :interval="4000"
      :duration="500"
      @change="onChange"
    >
      <swiper-item
        v-for="(item, index) in SWIPER_ITEMS"
        :key="index"
      >
        <view class="swiper-wrap__slide" :style="{ background: item.bg }">
          <text class="swiper-wrap__title">{{ item.title }}</text>
          <text class="swiper-wrap__subtitle">{{ item.subtitle }}</text>
        </view>
      </swiper-item>
    </swiper>

    <!-- 指示器 -->
    <view class="swiper-wrap__dots">
      <view
        v-for="(item, index) in SWIPER_ITEMS"
        :key="index"
        class="swiper-wrap__dot"
        :class="{ 'swiper-wrap__dot--active': index === swiperCurrent }"
      />
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.swiper-wrap {
  position: relative;
  margin: 0 24rpx;
  margin-top: 20rpx;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);

  &__swiper {
    height: 260rpx;
  }

  &__slide {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12rpx;
  }

  &__title {
    font-size: 40rpx;
    font-weight: 700;
    color: #ffffff;
    text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
  }

  &__subtitle {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.9);
  }

  &__dots {
    position: absolute;
    bottom: 16rpx;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 8rpx;
  }

  &__dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.5);
    transition: all 0.3s;

    &--active {
      width: 32rpx;
      border-radius: 6rpx;
      background-color: #ffffff;
    }
  }
}
</style>
