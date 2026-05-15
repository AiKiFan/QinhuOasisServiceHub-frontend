<!--
  停车场列表页
  @author AiKiFan
-->
<template>
  <view class="parking-list-page">
    <!-- 导航栏 -->
    <view class="navbar">
      <text class="navbar__title">{{ t('page.parkingList.title') }}</text>
    </view>

    <!-- 停车场列表 -->
    <view class="parking-items">
      <view
        v-if="loading && parkingList.length === 0"
        class="loading-state"
      >
        <text class="loading-state__text">{{ t('common.loading') }}</text>
      </view>

      <view
        v-for="parking in parkingList"
        :key="parking.id"
        class="parking-card"
        @tap="goToDetail(parking.id)"
      >
        <!-- 左：区域名 + 地址 + 费率 -->
        <view class="parking-card__left">
          <view class="parking-card__info">
            <text class="parking-card__name">{{ parking.displayName }}</text>
            <text class="parking-card__address">{{ parking.locationDesc }}</text>
            <text class="parking-card__rate">
              {{ parking.hourlyRate > 0 ? '¥' + parking.hourlyRate + t('parking.perHour') : t('parking.free') }}
            </text>
          </view>
        </view>

        <!-- 右：剩余车位 + 箭头 -->
        <view class="parking-card__right">
          <view class="avail-box">
            <text class="avail-box__num">{{ parking.availableCount }}</text>
            <text class="avail-box__total">/{{ parking.totalCapacity }}</text>
          </view>
          <view class="avail-bar">
            <view
              class="avail-bar__fill"
              :style="{ width: getAvailPercent(parking) + '%' }"
              :class="getAvailClass(parking)"
            ></view>
          </view>
          <text class="parking-card__arrow">›</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && parkingList.length === 0" class="empty-state">
        <text class="empty-state__text">{{ t('parking.noData') }}</text>
      </view>
    </view>

    <TabBar active="home" />
  </view>
</template>

<script>
import { getParkingSpaces } from '@/api/parking'
import { t } from '@/utils/i18n'
import TabBar from '@/components/TabBar/index.vue'

export default {
  components: { TabBar },

  data() {
    return {
      parkingList: [],
      loading: false
    }
  },

  onLoad() {
    this.loadParkingSpaces()
  },

  onLoad() {
    uni.setNavigationBarTitle({ title: t('page.parkingList.title') })
    this.loadParkingSpaces()
  },

  onShow() {
    this.loadParkingSpaces()
  },

  onPullDownRefresh() {
    this.loadParkingSpaces()
  },

  methods: {
    t(key) {
      return t(key)
    },

    async loadParkingSpaces() {
      this.loading = true
      try {
        const res = await getParkingSpaces()
        this.parkingList = Array.isArray(res) ? res : (res.data || [])
      } catch (error) {
        uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
      } finally {
        this.loading = false
        uni.stopPullDownRefresh()
      }
    },

    goToDetail(id) {
      uni.navigateTo({ url: `/pages/parking/detail?id=${id}` })
    },

    getAvailPercent(parking) {
      if (!parking.totalCapacity) return 0
      return Math.round((parking.availableCount / parking.totalCapacity) * 100)
    },

    getAvailClass(parking) {
      const pct = this.getAvailPercent(parking)
      if (pct === 0) return 'avail-bar__fill--full'
      if (pct <= 20) return 'avail-bar__fill--low'
      if (pct <= 50) return 'avail-bar__fill--mid'
      return 'avail-bar__fill--high'
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.parking-list-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding-bottom: 120rpx;
}

/* ── 导航栏 ── */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  padding: 24rpx 32rpx;
  box-shadow: 0 4rpx 16rpx rgba($color-primary, 0.25);

  &__title {
    font-size: 36rpx;
    color: #fff;
    font-weight: 700;
  }
}

/* ── 列表 ── */
.parking-items {
  padding: 20rpx 24rpx;
}

/* ── 停车场卡片 ── */
.parking-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 16rpx rgba($color-primary, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 1rpx 8rpx rgba($color-primary, 0.06);
  }

  &__left {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
  }

  &__name {
    font-size: 30rpx;
    font-weight: 700;
    color: $color-text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__address {
    font-size: 22rpx;
    color: $color-text-hint;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__rate {
    font-size: 22rpx;
    color: $color-primary;
    font-weight: 600;
    margin-top: 2rpx;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex-shrink: 0;
  }

  &__arrow {
    font-size: 40rpx;
    color: $color-text-hint;
    font-weight: 300;
  }
}

/* ── 剩余车位数字 ── */
.avail-box {
  display: flex;
  align-items: baseline;
  gap: 2rpx;

  &__num {
    font-size: 36rpx;
    font-weight: 800;
    color: $color-primary;
    line-height: 1;
  }

  &__total {
    font-size: 22rpx;
    color: $color-text-hint;
    font-weight: 500;
  }
}

/* ── 剩余车位进度条 ── */
.avail-bar {
  width: 80rpx;
  height: 8rpx;
  background-color: $color-divider;
  border-radius: 4rpx;
  overflow: hidden;

  &__fill {
    height: 100%;
    border-radius: 4rpx;
    transition: width 0.3s;

    &--high { background-color: #4CAF50; }
    &--mid  { background-color: #FFB22C; }
    &--low  { background-color: $color-primary; }
    &--full { background-color: #E05252; }
  }
}

/* ── 加载状态 ── */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}

/* ── 空状态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}
</style>
