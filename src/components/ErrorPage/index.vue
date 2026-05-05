<!--
  统一错误/空状态页面组件
  支持多种状态：404、500、网络错误、空数据
  @author AiKiFan
-->
<script setup>
import { t } from '@/utils/i18n'

const props = defineProps({
  /** 状态类型：404 | 500 | network | empty | error */
  type: {
    type: String,
    default: 'empty',
    validator: (v) => ['404', '500', 'network', 'empty', 'error'].includes(v),
  },
  /** 自定义描述文字 */
  description: {
    type: String,
    default: '',
  },
  /** 是否显示重试按钮 */
  showRetry: {
    type: Boolean,
    default: true,
  },
  /** 自定义图标 */
  icon: {
    type: String,
    default: '',
  },
  /** 是否显示返回按钮 */
  showBack: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['retry', 'back'])

// 状态配置
const statusConfig = {
  '404': {
    icon: '🔍',
    title: '页面不存在',
    description: '您访问的页面已搬家或不存在',
  },
  '500': {
    icon: '💥',
    title: '服务器异常',
    description: '服务器开小差了，请稍后再试',
  },
  'network': {
    icon: '📡',
    title: '网络连接失败',
    description: '请检查您的网络设置',
  },
  'empty': {
    icon: '📭',
    title: '暂无内容',
    description: '这里空空如也，去看看别的吧',
  },
  'error': {
    icon: '😵',
    title: '加载失败',
    description: '数据加载失败，请稍后重试',
  },
}

const currentConfig = computed(() => statusConfig[props.type] || statusConfig.empty)

/** 重试 */
function handleRetry() {
  emit('retry')
}

/** 返回上一页 */
function handleBack() {
  // 优先触发自定义事件
  emit('back')
  
  // 如果没有自定义处理，执行默认行为
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<template>
  <view class="error-page">
    <!-- 图标 -->
    <view class="error-page__icon-wrap">
      <text class="error-page__icon">{{ icon || currentConfig.icon }}</text>
    </view>
    
    <!-- 标题 -->
    <text class="error-page__title">{{ currentConfig.title }}</text>
    
    <!-- 描述 -->
    <text class="error-page__desc">
      {{ description || currentConfig.description }}
    </text>
    
    <!-- 操作按钮 -->
    <view class="error-page__actions">
      <button 
        v-if="showRetry && (type !== 'empty')" 
        class="error-page__btn error-page__btn--primary"
        @tap="handleRetry"
      >
        🔄 {{ type === 'network' ? '重新连接' : '重试' }}
      </button>
      
      <button 
        v-if="showBack" 
        class="error-page__btn error-page__btn--secondary"
        @tap="handleBack"
      >
        ← 返回
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 60rpx;
  min-height: 60vh;
  box-sizing: border-box;
  
  &__icon-wrap {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40rpx;
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  }
  
  &__icon {
    font-size: 80rpx;
    line-height: 1;
  }
  
  &__title {
    font-size: 36rpx;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: 16rpx;
  }
  
  &__desc {
    font-size: 28rpx;
    color: $color-text-hint;
    text-align: center;
    line-height: 1.6;
    margin-bottom: 48rpx;
  }
  
  &__actions {
    display: flex;
    gap: 24rpx;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  &__btn {
    min-width: 200rpx;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    font-weight: 500;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0 40rpx;
    
    &--primary {
      background: linear-gradient(135deg, $color-primary 0%, darken($color-primary, 10%) 100%);
      color: #ffffff;
      box-shadow: 0 4rpx 20rpx rgba($color-primary, 0.3);
    }
    
    &--secondary {
      background-color: $color-bg-card;
      color: $color-text-secondary;
      border: 2rpx solid $color-divider;
    }
    
    &:active {
      opacity: 0.9;
      transform: scale(0.98);
    }
  }
}
</style>