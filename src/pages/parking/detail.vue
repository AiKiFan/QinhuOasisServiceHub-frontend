<!--
  停车场详情页 - 可视化车位布局
  @author AiKiFan
-->
<template>
  <view class="parking-page">
    <!-- 导航栏 -->
    <view class="navbar">
      <text class="navbar__title">{{ t('page.parkingDetail.title') }}</text>
    </view>

    <!-- 区域 Tab 切换 -->
    <scroll-view scroll-x class="zone-tabs">
      <view class="zone-tabs__inner">
        <view
          v-for="zone in zones"
          :key="zone.id"
          :class="['zone-tab', currentZoneId === zone.id ? 'zone-tab--active' : '']"
          @tap="switchZone(zone.id)"
        >
          <text class="zone-tab__name">{{ zone.displayName }}</text>
          <text class="zone-tab__rate">{{ zone.hourlyRate > 0 ? '¥' + zone.hourlyRate + t('parking.perHour') : t('parking.free') }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 实时计数器 -->
    <view class="counter-bar">
      <text class="counter-bar__text">
        {{ currentZoneName }} | {{ t('parking.remaining') }}：{{ freeCount }} / {{ totalCount }}
      </text>
    </view>

    <!-- 车位网格 -->
    <view class="spot-container">
      <view v-if="loading" class="loading">
        <text>{{ t('common.loading') }}</text>
      </view>
      <view v-else class="spot-grid">
        <view
          v-for="spot in spots"
          :key="spot.id"
          :class="['spot', getSpotClass(spot)]"
          @tap="onSpotTap(spot)"
        >
          <text :class="['spot__code', getSpotClass(spot)]">{{ spot.spotCode }}</text>
          <text v-if="spot.status !== 0" :class="['spot__vehicle', getSpotClass(spot)]">{{ maskPlate(spot.vehicleNo) }}</text>
        </view>
      </view>
    </view>

    <!-- 预约弹窗（空闲车位） -->
    <view v-if="showBookDialog" class="interpreter-overlay" @tap.self="showBookDialog = false">
      <view class="interpreter-dialog" @tap.stop>
        <text class="interpreter-dialog__title">{{ t('parking.bookTitle') }} - {{ selectedSpot.spotCode }}</text>
        <view class="interpreter-dialog__item">
          <text class="interpreter-dialog__label">{{ t('parking.plateNumber') }}</text>
          <LicensePlateInput v-model="bookForm.plateNumber" />
        </view>
        <view class="interpreter-actions">
          <view class="interpreter-btn interpreter-btn--cancel" @tap="showBookDialog = false">{{ t('parking.cancel') }}</view>
          <view class="interpreter-btn interpreter-btn--primary" @tap="confirmBook">{{ t('parking.confirm') }}</view>
        </view>
      </view>
    </view>

    <!-- 结算弹窗（已占用车位 - 本人预约） -->
    <view v-if="showSettleDialog" class="interpreter-overlay" @tap.self="showSettleDialog = false">
      <view class="interpreter-dialog" @tap.stop>
        <text class="interpreter-dialog__title">{{ t('parking.settleTitle') }} - {{ settleDetail.spotCode }}</text>
        <view class="interpreter-rows">
          <view class="interpreter-row">
            <text class="interpreter-row__label">{{ t('parking.plateNumber') }}</text>
            <text class="interpreter-row__value">{{ settleDetail.vehicleNo }}</text>
          </view>
          <view class="interpreter-row">
            <text class="interpreter-row__label">{{ t('parking.entryTime') }}</text>
            <text class="interpreter-row__value">{{ settleDetail.startTime }}</text>
          </view>
          <view class="interpreter-row">
            <text class="interpreter-row__label">{{ t('parking.duration') }}</text>
            <text class="interpreter-row__value">{{ settleDetail.hours }} {{ t('parking.hourUnit') }}</text>
          </view>
          <view class="interpreter-row">
            <text class="interpreter-row__label">{{ t('parking.hourlyRate') }}</text>
            <text class="interpreter-row__value">{{ settleDetail.rate > 0 ? '¥' + settleDetail.rate + t('parking.perHour') : t('parking.free') }}</text>
          </view>
          <view class="interpreter-row interpreter-row--highlight">
            <text class="interpreter-row__label">{{ t('parking.totalAmount') }}</text>
            <text class="interpreter-row__value interpreter-row__value--price">¥{{ settleDetail.totalAmount }}</text>
          </view>
        </view>
        <view class="interpreter-actions">
          <view class="interpreter-btn interpreter-btn--cancel" @tap="showSettleDialog = false">{{ t('parking.cancel') }}</view>
          <view class="interpreter-btn interpreter-btn--primary" @tap="confirmSettle">{{ t('parking.confirmExit') }}</view>
        </view>
      </view>
    </view>

    <!-- 入场/离场成功弹窗 -->
    <view v-if="showSuccessDialog" class="interpreter-overlay" @tap.self="showSuccessDialog = false">
      <view class="interpreter-dialog interpreter-dialog--center" @tap.stop>
        <view class="success-icon">✓</view>
        <text class="success-title">{{ successDialogType === 'entry' ? t('parking.success') : t('parking.settleSuccess') }}</text>
        <text class="success-msg">{{ successDialogType === 'entry' ? t('parking.successMsg') : t('parking.settleSuccessMsg') }}</text>
        <view class="interpreter-btn interpreter-btn--primary interpreter-btn--full" @tap="showSuccessDialog = false">{{ t('parking.gotIt') }}</view>
      </view>
    </view>

    <!-- 被占用提示弹窗 -->
    <view v-if="showOccupiedHint" class="interpreter-overlay" @tap.self="showOccupiedHint = false">
      <view class="interpreter-dialog interpreter-dialog--center" @tap.stop>
        <view class="hint-icon">!</view>
        <text class="hint-title">{{ t('parking.spotOccupied') }}</text>
        <text class="hint-msg">{{ t('parking.spotOccupiedMsg') }}</text>
        <view class="interpreter-btn interpreter-btn--primary interpreter-btn--full" @tap="showOccupiedHint = false">{{ t('parking.gotIt') }}</view>
      </view>
    </view>

    <TabBar active="home" />

    <!-- 登录提示弹窗 -->
    <view v-if="showLoginHint" class="interpreter-overlay" @tap.self="showLoginHint = false">
      <view class="interpreter-dialog interpreter-dialog--center" @tap.stop>
        <view class="hint-icon">!</view>
        <text class="hint-title">{{ t('common.loginRequired') }}</text>
        <text class="hint-msg">请先登录后再进行入场登记</text>
        <view class="interpreter-btn interpreter-btn--primary interpreter-btn--full" @tap="goLogin">{{ t('auth.login') }}</view>
        <view class="interpreter-btn interpreter-btn--cancel interpreter-btn--full" @tap="showLoginHint = false">{{ t('common.cancel') }}</view>
      </view>
    </view>
  </view>
</template>

<script>
import { getParkingZones, getZoneSpots, bookSpot, settleSpot } from '@/api/parking'
import { t } from '@/utils/i18n'
import { getUser, isLoggedIn } from '@/utils/auth'
import TabBar from '@/components/TabBar/index.vue'
import LicensePlateInput from '@/components/LicensePlateInput/index.vue'

export default {
  components: { TabBar, LicensePlateInput },
  data() {
    return {
      zones: [],
      currentZoneId: null,
      spots: [],
      loading: false,
      showBookDialog: false,
      showSuccessDialog: false,
      successDialogType: 'entry', // 'entry'=入场成功 'exit'=离场成功
      showOccupiedHint: false,
      showSettleDialog: false,
      showLoginHint: false,
      selectedSpot: {},
      settleDetail: {},
      bookForm: { plateNumber: '' }
    }
  },
  computed: {
    currentZoneName() {
      const z = this.zones.find(z => z.id === this.currentZoneId)
      return z ? z.displayName : ''
    },
    freeCount() {
      return this.spots.filter(s => s.status === 0).length
    },
    totalCount() {
      return this.spots.length
    }
  },
  onLoad(options) {
    this.currentZoneId = parseInt(options.id || 1)
    uni.setNavigationBarTitle({ title: t('page.parkingDetail.title') })
    this.loadZones()
  },
  onShow() {
    this.loadSpots()
  },
  methods: {
    t(key) {
      return t(key)
    },
    getMyUserId() {
      const user = getUser()
      if (!user) return null
      const uid = user.userId ?? user.id
      if (uid == null) return null
      return String(uid)
    },
    isMySpot(spot) {
      if (!spot || spot.status === 0) return false
      const myId = this.getMyUserId()
      const spotUid = (spot.userId != null && spot.userId !== undefined) ? String(spot.userId) : null
      if (!myId || !spotUid) return false
      return myId === spotUid
    },
    async loadZones() {
      try {
        const res = await getParkingZones()
        this.zones = Array.isArray(res) ? res : (res.data || [])
        if (!this.currentZoneId && this.zones.length > 0) {
          this.currentZoneId = this.zones[0].id
        }
        this.loadSpots()
      } catch (e) {
        uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
      }
    },
    async loadSpots() {
      if (!this.currentZoneId) return
      this.loading = true
      try {
        const res = await getZoneSpots(this.currentZoneId)
        this.spots = Array.isArray(res) ? res : []
      } catch (e) {
        this.spots = []
      } finally {
        this.loading = false
      }
    },
    switchZone(zoneId) {
      this.currentZoneId = zoneId
      this.loadSpots()
    },
    getSpotClass(spot) {
      if (spot.status === 0) return ''
      return this.isMySpot(spot) ? 'spot--mine' : 'spot--others'
    },
    onSpotTap(spot) {
      this.selectedSpot = spot
      if (spot.status === 0) {
        if (!isLoggedIn()) {
          this.showLoginHint = true
          return
        }
        this.bookForm = { plateNumber: '' }
        this.showBookDialog = true
        return
      }
      if (this.isMySpot(spot)) {
        this.prepareSettleDetail(spot)
        this.showSettleDialog = true
      } else {
        this.showOccupiedHint = true
      }
    },
    goLogin() {
      this.showLoginHint = false
      uni.navigateTo({ url: '/pages/login/index' })
    },
    prepareSettleDetail(spot) {
      const now = new Date()
      const start = spot.startTime ? new Date(spot.startTime) : now
      const diffH = (now - start) / (1000 * 60 * 60)
      const hours = Math.ceil(diffH)
      const actualHours = hours < 1 ? 1 : hours
      const zone = this.zones.find(z => z.id === spot.zoneId)
      const rate = zone ? zone.hourlyRate : 0
      const startStr = spot.startTime ? (() => {
        const d = new Date(spot.startTime)
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        return `${mm}-${dd} ${hh}:${mi}`
      })() : '--'
      this.settleDetail = {
        spotCode: spot.spotCode,
        vehicleNo: spot.vehicleNo || '--',
        startTime: startStr,
        hours: actualHours,
        rate,
        totalAmount: (actualHours * rate).toFixed(2)
      }
    },
    async confirmSettle() {
      uni.showLoading({ title: t('common.submitting') })
      try {
        await settleSpot(this.selectedSpot.id)
        uni.hideLoading()
        this.showSettleDialog = false
        this.successDialogType = 'exit'
        this.showSuccessDialog = true
        this.loadSpots()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || t('parking.settleFailed'), icon: 'none' })
      }
    },
    async confirmBook() {
      if (!this.bookForm.plateNumber || this.bookForm.plateNumber.length !== 8) {
        uni.showToast({ title: t('parking.enterPlate'), icon: 'none' })
        return
      }
      uni.showLoading({ title: t('common.submitting') })
      try {
        await bookSpot(this.selectedSpot.id, {
          vehicleNo: this.bookForm.plateNumber
        })
        uni.hideLoading()
        this.showBookDialog = false
        this.successDialogType = 'entry'
        this.showSuccessDialog = true
        this.loadSpots()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || t('parking.bookFailed'), icon: 'none' })
      }
    },
    maskPlate(plate) {
      if (!plate) return ''
      return plate.substring(0, 2) + '***' + plate.substring(plate.length - 1)
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.parking-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding-bottom: 120rpx;
}

.navbar {
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  padding: 24rpx 32rpx;
  box-shadow: 0 4rpx 16rpx rgba($color-primary, 0.25);
  &__title {
    font-size: 36rpx;
    color: #fff;
    font-weight: 700;
  }
}

.zone-tabs {
  background-color: #fff;
  &__inner {
    display: flex;
    padding: 16rpx 24rpx;
    gap: 16rpx;
  }
}

.zone-tab {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 28rpx;
  border-radius: 16rpx;
  background-color: $color-bg-page;
  border: 2rpx solid $color-divider;
  transition: all 0.2s;
  &__name {
    font-size: 26rpx;
    color: $color-text-primary;
    font-weight: 600;
  }
  &__rate {
    font-size: 20rpx;
    color: $color-text-hint;
    margin-top: 4rpx;
  }
  &--active {
    background-color: $color-primary-light;
    border-color: $color-primary;
    .zone-tab__name { color: $color-primary; }
  }
}

.counter-bar {
  background-color: $color-primary-light;
  padding: 16rpx 24rpx;
  &__text {
    font-size: 26rpx;
    color: $color-primary;
    font-weight: 600;
  }
}

.spot-container {
  padding: 20rpx;
}

.loading {
  text-align: center;
  padding: 80rpx;
  font-size: 28rpx;
  color: $color-text-hint;
}

.spot-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16rpx;
}

.spot {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background-color: $color-bg-card;
  border: 3rpx solid $color-divider;
  box-shadow: 0 2rpx 12rpx rgba($color-primary, 0.06);

  &__code {
    font-size: 22rpx;
    font-weight: 700;
    color: $color-text-primary;
  }

  &__vehicle {
    font-size: 16rpx;
    font-weight: 600;
    color: #fff;
    margin-top: 4rpx;
  }

  &--mine {
    background-color: #E8F8EE;
    border-color: #27AE60;
    box-shadow: 0 2rpx 12rpx rgba(39, 174, 96, 0.2);
    .spot__code { color: #1B7D3A; }
    .spot__vehicle { color: #E8F8EE; }
  }

  &--others {
    background-color: #FDECEA;
    border-color: #E74C3C;
    box-shadow: 0 2rpx 12rpx rgba(231, 76, 60, 0.15);
    .spot__code { color: #C0392B; }
    .spot__vehicle { color: #FDECEA; }
  }
}

/* ══════════════════════════════════════
   弹窗样式 - 完全对齐译员评价弹窗
   ══════════════════════════════════════ */

.interpreter-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 32rpx;
}

.interpreter-dialog {
  width: 100%;
  max-width: 600rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);

  &--center {
    text-align: center;
    padding: 60rpx 32rpx 48rpx;
  }
}

.interpreter-dialog__title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $color-text-primary;
  text-align: center;
  margin-bottom: 32rpx;
}

.interpreter-dialog__item {
  margin-bottom: 24rpx;
}

.interpreter-dialog__label {
  display: block;
  font-size: 26rpx;
  color: $color-text-secondary;
  margin-bottom: 12rpx;
}

/* ── 操作按钮组 ── */
.interpreter-actions {
  display: flex;
  gap: 16rpx;
}

.interpreter-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 80rpx;
  text-align: center;

  &--cancel {
    background-color: $color-bg-page;
    color: $color-text-secondary;
  }

  &--primary {
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
  }

  &--full {
    margin-top: 8rpx;
  }
}

/* ── 结算详情行 ── */
.interpreter-rows {
  margin-bottom: 24rpx;
}

.interpreter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72rpx;
  border-bottom: 1rpx solid $color-divider;

  &--highlight {
    background-color: rgba($color-primary, 0.06);
    margin: 0 -32rpx;
    padding: 0 32rpx;
    border-bottom: none;
    border-radius: 0 0 16rpx 16rpx;
    height: 88rpx;
  }

  &__label {
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &__value {
    font-size: 26rpx;
    color: $color-text-primary;
    font-weight: 600;

    &--price {
      font-size: 36rpx;
      color: $color-primary;
      font-weight: 700;
    }
  }
}

/* ── 成功弹窗内容 ── */
.success-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #fff;
  font-size: 48rpx;
  line-height: 100rpx;
  text-align: center;
  margin: 0 auto 24rpx;
}

.success-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $color-text-primary;
  margin-bottom: 12rpx;
}

.success-msg {
  display: block;
  font-size: 26rpx;
  color: $color-text-secondary;
  line-height: 1.6;
  margin-bottom: 32rpx;
}

/* ── 被占用提示弹窗 ── */
.hint-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%);
  color: #fff;
  font-size: 48rpx;
  font-weight: 700;
  line-height: 100rpx;
  text-align: center;
  margin: 0 auto 24rpx;
}

.hint-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $color-text-primary;
  margin-bottom: 12rpx;
}

.hint-msg {
  display: block;
  font-size: 26rpx;
  color: $color-text-secondary;
  line-height: 1.6;
  margin-bottom: 32rpx;
}
</style>
