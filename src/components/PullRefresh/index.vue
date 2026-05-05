<!--
  统一下拉刷新组件
  支持自定义刷新内容、刷新状态指示
  @author AiKiFan
-->
<script setup>
import { ref } from 'vue'

defineProps({
  /** 是否正在刷新 */
  refreshing: {
    type: Boolean,
    default: false,
  },
  /** 刷新完成文字 */
  refreshText: {
    type: String,
    default: '刷新成功',
  },
  /** 下拉提示文字 */
  pullText: {
    type: String,
    default: '下拉刷新',
  },
  /** 释放提示文字 */
  releaseText: {
    type: String,
    default: '释放刷新',
  },
  /** 刷新中提示文字 */
  loadingText: {
    type: String,
    default: '正在刷新...',
  },
})

/** 触摸开始Y坐标 */
const startY = ref(0)
/** 当前偏移量 */
const translateY = ref(0)
/** 是否正在触摸 */
const touching = ref(false)
/** 触发刷新的阈值 */
const TRIGGER_HEIGHT = 80
/** 最大下拉高度 */
const MAX_PULL_HEIGHT = 200

/** 刷新状态 */
const refreshState = ref('idle') // idle, pulling, releasing, loading, success

/** 触摸开始 */
function onTouchStart(e) {
  if (refreshState.value === 'loading' || refreshState.value === 'success') return
  
  startY.value = e.touches[0].clientY
  touching.value = true
  refreshState.value = 'pulling'
}

/** 触摸移动 */
function onTouchMove(e) {
  if (!touching.value) return
  if (refreshState.value === 'loading' || refreshState.value === 'success') return
  
  const currentY = e.touches[0].clientY
  const diff = currentY - startY.value
  
  // 只能向下拉
  if (diff <= 0) {
    translateY.value = 0
    refreshState.value = 'idle'
    return
  }
  
  // 计算阻尼效果
  const damping = diff > TRIGGER_HEIGHT ? 0.3 : 0.6
  translateY.value = Math.min(diff * damping, MAX_PULL_HEIGHT)
  
  // 更新状态
  if (translateY.value >= TRIGGER_HEIGHT) {
    refreshState.value = 'releasing'
  } else {
    refreshState.value = 'pulling'
  }
}

/** 触摸结束 */
function onTouchEnd() {
  touching.value = false
  
  if (translateY.value >= TRIGGER_HEIGHT) {
    // 触发刷新
    refreshState.value = 'loading'
    translateY.value = TRIGGER_HEIGHT
    emit('refresh')
  } else {
    // 回弹
    translateY.value = 0
    refreshState.value = 'idle'
  }
}

/** 刷新完成 */
function onRefreshComplete() {
  refreshState.value = 'success'
  setTimeout(() => {
    refreshState.value = 'idle'
    translateY.value = 0
  }, 500)
}

/** 重置状态 */
function reset() {
  refreshState.value = 'idle'
  translateY.value = 0
  touching.value = false
}

defineExpose({
  reset,
  onRefreshComplete,
})

const emit = defineEmits(['refresh'])
</script>

<template>
  <view 
    class="pull-refresh-container"
    :style="{ transform: `translateY(${translateY}px)` }"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- 刷新提示器 -->
    <view 
      class="pull-refresh-indicator" 
      :style="{ 
        opacity: Math.min(translateY / 40, 1),
        transform: `scale(${Math.min(translateY / TRIGGER_HEIGHT, 1)})` 
      }"
    >
      <view class="refresh-icon" :class="`refresh-icon--${refreshState}`">
        <text class="icon-symbol">↻</text>
      </view>
      <text class="refresh-text">
        <text v-if="refreshState === 'pulling'">{{ pullText }}</text>
        <text v-else-if="refreshState === 'releasing'">{{ releaseText }}</text>
        <text v-else-if="refreshState === 'loading'">{{ loadingText }}</text>
        <text v-else-if="refreshState === 'success'">{{ refreshText }}</text>
      </text>
    </view>
    
    <!-- 内容区域 -->
    <view class="pull-refresh-content">
      <slot></slot>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.pull-refresh-container {
  transition: transform 0.3s ease;
}

.pull-refresh-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  min-height: 0;
  transition: opacity 0.2s ease;
}

.refresh-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background-color: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
  transition: transform 0.3s ease;
  
  &--pulling {
    transform: rotate(0deg);
  }
  
  &--releasing {
    transform: rotate(180deg);
  }
  
  &--loading {
    animation: rotate 1s linear infinite;
  }
  
  &--success {
    background-color: #43A047;
    animation: bounce 0.5s ease;
  }
}

.icon-symbol {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

.refresh-text {
  font-size: 24rpx;
  color: $color-text-secondary;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>