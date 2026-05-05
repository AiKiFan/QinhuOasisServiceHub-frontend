<template>
  <view class="parking-detail">
    <!-- 导航栏 -->
    <view class="navbar">
      <text class="title">停车场详情</text>
    </view>

    <!-- 地图区域（暂时用占位，实际需配置明月山坐标） -->
    <view class="map-container">
      <map
        class="map"
        :latitude="parkingInfo.latitude || 27.62"
        :longitude="parkingInfo.longitude || 114.37"
        :markers="markers"
        :scale="16"
        show-location
      ></map>
    </view>

    <!-- 停车场信息卡片 -->
    <view class="info-card">
      <view class="parking-name">{{ parkingInfo.displayName }}</view>
      <view class="parking-address">{{ parkingInfo.locationDesc }}</view>

      <view class="stats-grid">
        <view class="stat-item">
          <view class="stat-value">{{ parkingInfo.availableCount }}</view>
          <view class="stat-label">剩余车位</view>
        </view>
        <view class="stat-item">
          <view class="stat-value">{{ parkingInfo.totalCapacity }}</view>
          <view class="stat-label">总车位</view>
        </view>
        <view class="stat-item">
          <view class="stat-value">¥{{ parkingInfo.hourlyRate }}</view>
          <view class="stat-label">每小时</view>
        </view>
        <view class="stat-item">
          <view class="stat-value">{{ getSpaceTypeLabel(parkingInfo.spaceType) }}</view>
          <view class="stat-label">类型</view>
        </view>
      </view>
    </view>

    <!-- 预约表单 -->
    <view class="booking-form">
      <view class="form-title">预约停车</view>

      <view class="form-item">
        <text class="label">车牌号</text>
        <input
          class="input"
          v-model="bookingForm.plateNumber"
          placeholder="请输入车牌号"
          placeholder-class="placeholder"
        />
      </view>

      <view class="form-item">
        <text class="label">预计时长</text>
        <view class="duration-selector">
          <view
            v-for="hour in durationOptions"
            :key="hour"
            :class="['duration-item', { active: bookingForm.duration === hour }]"
            @click="selectDuration(hour)"
          >
            {{ hour }}小时
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="label">预计费用</text>
        <text class="fee">¥{{ estimatedFee }}</text>
      </view>

      <button class="book-btn" @click="handleBooking" :loading="booking">
        {{ booking ? '预约中...' : '立即预约' }}
      </button>
    </view>
  </view>
</template>

<script>
import { getParkingSpaces, bookParking } from '@/api/parking'

export default {
  data() {
    return {
      parkingId: null,
      parkingInfo: {
        displayName: '',
        locationDesc: '',
        latitude: 27.62,
        longitude: 114.37,
        availableCount: 0,
        totalCapacity: 0,
        hourlyRate: 0,
        spaceType: 0
      },
      bookingForm: {
        plateNumber: '',
        duration: 1
      },
      durationOptions: [1, 2, 3, 4, 5, 6],
      booking: false
    }
  },

  computed: {
    estimatedFee() {
      return (this.bookingForm.duration * (this.parkingInfo.hourlyRate || 0)).toFixed(2)
    },

    markers() {
      return [{
        id: 1,
        latitude: this.parkingInfo.latitude || 27.62,
        longitude: this.parkingInfo.longitude || 114.37,
        width: 30,
        height: 30,
        iconPath: '/static/marker.png',
        title: this.parkingInfo.displayName
      }]
    }
  },

  onLoad(options) {
    this.parkingId = options.id
    this.loadParkingDetail()
  },

  methods: {
    getSpaceTypeLabel(type) {
      const labels = {
        0: '普通',
        1: '残障专用',
        2: '新能源充电'
      }
      return labels[type] || '普通'
    },

    async loadParkingDetail() {
      try {
        const res = await getParkingSpaces()
        const parking = res.data?.find(item => item.id == this.parkingId)
        if (parking) {
          this.parkingInfo = { ...this.parkingInfo, ...parking }
        }
      } catch (error) {
        console.error('加载停车场详情失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },

    selectDuration(hour) {
      this.bookingForm.duration = hour
    },

    async handleBooking() {
      if (!this.bookingForm.plateNumber) {
        return uni.showToast({
          title: '请输入车牌号',
          icon: 'none'
        })
      }

      this.booking = true
      try {
        await bookParking({
          parkingSpaceId: this.parkingId,
          plateNumber: this.bookingForm.plateNumber,
          duration: this.bookingForm.duration
        })

        uni.showToast({
          title: '预约成功',
          icon: 'success'
        })

        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      } catch (error) {
        console.error('预约失败:', error)
        uni.showToast({
          title: '预约失败，请重试',
          icon: 'none'
        })
      } finally {
        this.booking = false
      }
    }
  }
}
</script>

<style scoped>
.parking-detail {
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

.map-container {
  height: 300rpx;
  width: 100%;
}

.map {
  width: 100%;
  height: 100%;
}

.info-card {
  background-color: #fff;
  margin: 20rpx;
  padding: 30rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.parking-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.parking-address {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 30rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
}

.booking-form {
  background-color: #fff;
  margin: 20rpx;
  padding: 30rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.form-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}

.input {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.placeholder {
  color: #ccc;
}

.duration-selector {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.duration-item {
  padding: 16rpx 28rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #666;
  transition: all 0.3s;
}

.duration-item.active {
  background-color: #667eea;
  border-color: #667eea;
  color: #fff;
}

.fee {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.book-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  margin-top: 20rpx;
}
</style>
