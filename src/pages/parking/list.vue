<template>
  <view class="parking-list">
    <!-- 导航栏 -->
    <view class="navbar">
      <text class="title">停车场</text>
    </view>

    <!-- 停车场列表 -->
    <view class="parking-items">
      <view
        v-for="parking in parkingList"
        :key="parking.id"
        class="parking-item"
        @click="goToDetail(parking.id)"
      >
        <view class="parking-info">
          <view class="parking-name">{{ parking.displayName }}</view>
          <view class="parking-address">{{ parking.locationDesc }}</view>
          <view class="parking-meta">
            <view class="meta-item">
              <text class="icon">🚗</text>
              <text class="text">剩余：{{ parking.availableCount }} / {{ parking.totalCapacity }}</text>
            </view>
            <view class="meta-item">
              <text class="icon">💰</text>
              <text class="text">¥{{ parking.hourlyRate }} /小时</text>
            </view>
          </view>
        </view>
        <view class="parking-arrow">›</view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && parkingList.length === 0" class="empty">
      <text>暂无停车场数据</text>
    </view>
  </view>
</template>

<script>
import { getParkingSpaces } from '@/api/parking'
import PullRefresh from '@/components/PullRefresh/index.vue'

export default {
  components: {
    PullRefresh
  },

  data() {
    return {
      parkingList: [],
      loading: false
    }
  },

  onLoad() {
    this.loadParkingSpaces()
  },

  onPullDownRefresh() {
    this.loadParkingSpaces()
  },

  methods: {
    async loadParkingSpaces() {
      this.loading = true
      try {
        const res = await getParkingSpaces()
        // get() 已解析后端返回的 data 字段，res 直接就是数组
        this.parkingList = res || []
      } catch (error) {
        console.error('加载停车场列表失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
        uni.stopPullDownRefresh()
      }
    },

    goToDetail(id) {
      uni.navigateTo({
        url: `/pages/parking/detail?id=${id}`
      })
    }
  }
}
</script>

<style scoped>
.parking-list {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20rpx 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 36rpx;
  color: #fff;
  font-weight: bold;
}

.parking-items {
  padding: 20rpx;
}

.parking-item {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.parking-item:active {
  transform: scale(0.98);
  opacity: 0.8;
}

.parking-info {
  flex: 1;
}

.parking-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.parking-address {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.parking-meta {
  display: flex;
  gap: 24rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  color: #888;
}

.icon {
  font-size: 28rpx;
}

.parking-arrow {
  font-size: 40rpx;
  color: #ccc;
  font-weight: 300;
}

.loading,
.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60rpx;
  color: #999;
  font-size: 28rpx;
}
</style>
