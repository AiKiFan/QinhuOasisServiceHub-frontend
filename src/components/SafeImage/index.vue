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
 * 将 MinIO 不可达地址替换为当前页面可访问的地址
 *
 * 公共读策略下，图片 URL 不带预签名参数，格式为：
 * http://localhost:9000/bucket/20260524/xxx.jpg
 *
 * 本地开发（localhost/127.0.0.1）直接返回原 URL
 * 手机访问时，将 localhost/127.0.0.1 替换为当前页面 hostname
 */
function buildAccessibleUrl(rawUrl) {
  if (!rawUrl) return ''
  // 非 HTTP 地址直接返回
  if (!rawUrl.match(/^https?:\/\//)) return rawUrl
  // 本地开发环境（hostname 是 localhost / 127.0.0.1）直接返回原 URL
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return rawUrl
  // 手机访问环境：替换 localhost/127.0.0.1 为当前 hostname
  return rawUrl.replace(/http:\/\/(localhost|127\.0\.0\.1):9000/g,
      `${location.protocol}//${location.hostname}:9000`)
}

async function loadImage() {
  if (!props.src) {
    displaySrc.value = ''
    failed.value = true
    return
  }

  // 先尝试加载 MinIO URL（替换 localhost 为当前可访问地址）
  displaySrc.value = buildAccessibleUrl(props.src)
  failed.value = false
}

/**
 * 图片加载失败回调：尝试从本地缓存加载
 */
async function onError() {

  // 尝试从本地缓存加载（现在是异步函数）
  try {
    const cachedPath = await loadImageCache(props.src)

    if (cachedPath) {
      displaySrc.value = cachedPath
    } else {
      failed.value = true
    }
  } catch (err) {
    failed.value = true
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
