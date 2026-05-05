<!--
  带错误占位的安全图片组件
  图片加载失败时自动显示内置 SVG 占位图
  支持点击预览大图功能
  @author AiKiFan

  用法：
    <SafeImage src="xxx.jpg" mode="aspectFill" class="cover" />
    <SafeImage src="xxx.jpg" mode="aspectFill" :previewable="true" />
-->
<script setup>
import { ref } from 'vue'

const props = defineProps({
  /** 图片地址 */
  src: {
    type: String,
    default: '',
  },
  /** 图片裁剪缩放模式，同 uni image mode */
  mode: {
    type: String,
    default: 'aspectFill',
  },
  /** 是否开启懒加载（默认开启，提升列表页性能） */
  lazyLoad: {
    type: Boolean,
    default: true,
  },
  /** 是否可点击预览 */
  previewable: {
    type: Boolean,
    default: false,
  },
})

/** 是否加载失败 */
const failed = ref(false)

function onError() {
  failed.value = true
}

/**
 * 点击图片时预览大图
 */
function handleTap() {
  if (props.previewable && props.src && !failed.value) {
    uni.previewImage({ urls: [props.src], current: props.src })
  }
}
</script>

<template>
  <!-- 正常图片 -->
  <image
    v-if="!failed && src"
    :src="src"
    :mode="mode"
    :lazy-load="lazyLoad"
    @error="onError"
    @tap="handleTap"
    class="safe-image"
    :class="{ 'safe-image--clickable': previewable }"
  />

  <!-- 占位图（加载失败 或 无 src） -->
  <view v-else class="safe-image safe-image--placeholder">
    <text class="safe-image__icon">🖼</text>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.safe-image {
  display: block;
  width: 100%;
  height: 100%;
  background-color: $color-divider;

  &--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, $color-divider 0%, #E8DDD3 100%);
  }

  &__icon {
    font-size: 48rpx;
    opacity: 0.5;
  }
}
</style>
