<!--
  带错误占位的安全图片组件
  图片加载失败时自动显示内置 SVG 占位图
  支持点击预览大图功能
  支持本地缓存降级加载（开发环境）

  用法：
    <SafeImage src="xxx.jpg" mode="aspectFill" class="cover" />
    <SafeImage src="xxx.jpg" mode="aspectFill" :previewable="true" />
-->
<script setup>
import { ref, watch } from 'vue'
import { loadImageCache } from '@/utils/image-cache'

const props = defineProps({
  /** 图片地址（MinIO URL） */
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

/** 当前实际显示的图片路径 */
const displaySrc = ref('')
/** 是否加载失败 */
const failed = ref(false)

/**
 * 加载图片：先尝试 MinIO URL，失败后降级到本地缓存
 */
async function loadImage() {
  if (!props.src) {
    displaySrc.value = ''
    failed.value = true
    return
  }

  // 先尝试加载 MinIO URL
  displaySrc.value = props.src
  failed.value = false
}

/**
 * 图片加载失败回调：尝试从本地缓存加载
 */
function onError() {
  console.log('[SafeImage] MinIO load failed, trying cache:', props.src)

  // 尝试从本地缓存加载
  const cachedPath = loadImageCache(props.src)

  if (cachedPath) {
    displaySrc.value = cachedPath
    console.log('[SafeImage] Using cached image:', cachedPath)
  } else {
    failed.value = true
    console.log('[SafeImage] No cache available, showing placeholder')
  }
}

/**
 * 点击图片时预览大图
 */
function handleTap() {
  if (props.previewable && displaySrc.value && !failed.value) {
    uni.previewImage({ urls: [displaySrc.value], current: displaySrc.value })
  }
}

// 监听 src 变化重新加载
watch(() => props.src, loadImage, { immediate: true })
</script>

<template>
  <!-- 正常图片 -->
  <image
    v-if="!failed && displaySrc"
    :src="displaySrc"
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
