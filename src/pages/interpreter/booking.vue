<!--
  译员预约页
 @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { createInterpreterOrder } from '@/api/interpreter-order'
import { isLoggedIn } from '@/utils/auth'
import { t } from '@/utils/i18n'

/** 服务类型选项 */
const SERVICE_TYPES = computed(() => [
  { value: 1, label: t('interpreter.booking.personal') },
  { value: 2, label: t('interpreter.booking.team') },
])

/** 页面参数（译员档案 ID 和时薪） */
const pageOptions = ref({})

/** 表单数据 */
const form = ref({
  serviceType: 1, // 1=个人 2=团队
  groupSize: 1,
  startTime: '',
  endTime: '',
  remark: '',
})

/** 译员时薪（从上一页传递） */
const hourlyRate = ref(50)

/** 提交中状态 */
const submitting = ref(false)

/**
 * 计算服务时长（小时）
 */
const durationHours = computed(() => {
  if (!form.value.startTime || !form.value.endTime) return 0
  const start = new Date(form.value.startTime)
  const end = new Date(form.value.endTime)
  const diff = end.getTime() - start.getTime()
  const hours = diff / (1000 * 60 * 60)
  return hours > 0 ? hours : 0
})

/**
 * 计算总费用
 */
const totalFee = computed(() => {
  return durationHours.value * hourlyRate.value
})

/**
 * 选择开始时间
 */
function chooseStartTime() {
  const now = new Date()
  const minDate = now.toISOString().slice(0, 10)
  
  uni.showModal({
    title: t('interpreter.booking.startTime'),
    editable: true,
    placeholderText: t('interpreter.booking.timePlaceholder'),
    success: (res) => {
      if (res.confirm && res.content) {
        // 简单验证格式
        if (isValidDateTime(res.content)) {
          form.value.startTime = res.content
        } else {
          uni.showToast({ title: t('interpreter.booking.invalidTimeFormat'), icon: 'none' })
        }
      }
    },
  })
}

/**
 * 选择结束时间
 */
function chooseEndTime() {
  uni.showModal({
    title: t('interpreter.booking.endTime'),
    editable: true,
    placeholderText: t('interpreter.booking.timePlaceholder'),
    success: (res) => {
      if (res.confirm && res.content) {
        if (isValidDateTime(res.content)) {
          form.value.endTime = res.content
        } else {
          uni.showToast({ title: t('interpreter.booking.invalidTimeFormat'), icon: 'none' })
        }
      }
    },
  })
}

/**
 * 简单验证日期时间格式
 */
function isValidDateTime(str) {
  const date = new Date(str)
  return date instanceof Date && !isNaN(date)
}

/**
 * 提交预约订单
 */
async function handleSubmit() {
  if (!isLoggedIn()) {
    uni.showModal({
      title: t('common.tip'),
      content: t('interpreter.booking.loginRequired'),
      confirmText: t('interpreter.goLogin'),
      success(res) {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' })
        }
      },
    })
    return
  }
  
  if (!form.value.startTime) {
    uni.showToast({ title: t('interpreter.booking.startTimeRequired'), icon: 'none' })
    return
  }
  if (!form.value.endTime) {
    uni.showToast({ title: t('interpreter.booking.endTimeRequired'), icon: 'none' })
    return
  }
  if (durationHours.value <= 0) {
    uni.showToast({ title: t('interpreter.booking.endBeforeStart'), icon: 'none' })
    return
  }
  if (form.value.serviceType === 2 && form.value.groupSize < 2) {
    uni.showToast({ title: t('interpreter.booking.minGroupSize'), icon: 'none' })
    return
  }
  
  submitting.value = true
  try {
    await createInterpreterOrder({
      profileId: pageOptions.value.profileId,
      serviceType: form.value.serviceType,
      groupSize: form.value.groupSize,
      startTime: new Date(form.value.startTime).toISOString(),
      endTime: new Date(form.value.endTime).toISOString(),
      remark: form.value.remark,
    })
    uni.showToast({ title: t('interpreter.booking.bookingSuccess'), icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/profile/index' })
    }, 1500)
  } catch {
    // 错误已在 request.js 中通过 Toast 展示
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.interpreterBooking.title') })
  // 获取页面参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  pageOptions.value = options

  if (options.hourlyRate) {
    hourlyRate.value = Number(options.hourlyRate)
  }

  if (!options.profileId) {
    uni.showToast({ title: t('common.paramError'), icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1000)
  }
})
</script>

<template>
  <view class="booking-page">
    <view class="form-card">
      <!-- 服务类型 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.booking.serviceType') }}</text>
        <view class="service-type-selector">
          <view
            v-for="st in SERVICE_TYPES"
            :key="st.value"
            class="service-type-option"
            :class="{ 'service-type-option--active': form.serviceType === st.value }"
            @tap="form.serviceType = st.value"
          >
            <text class="service-type-option__text">{{ st.label }}</text>
          </view>
        </view>
      </view>

      <!-- 团队人数（仅团队服务时显示） -->
      <view v-if="form.serviceType === 2" class="form-section">
        <text class="form-section__title">{{ t('interpreter.booking.teamCount') }}</text>
        <view class="counter">
          <view
            class="counter__btn"
            :class="{ 'counter__btn--disabled': form.groupSize <= 2 }"
            @tap="form.groupSize > 2 && form.groupSize--"
          >
            <text class="counter__btn__text">−</text>
          </view>
          <text class="counter__val">{{ form.groupSize }} {{ t('common.person') }}</text>
          <view class="counter__btn" @tap="form.groupSize++">
            <text class="counter__btn__text">+</text>
          </view>
        </view>
      </view>

      <!-- 服务时间 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.booking.timeLabel') }}</text>
        
        <view class="time-row" @tap="chooseStartTime">
          <text class="time-row__label">{{ t('interpreter.booking.startTime') }}</text>
          <view class="time-row__value">
            <text class="time-row__text">{{ form.startTime || t('common.select') }}</text>
            <text class="time-row__arrow">›</text>
          </view>
        </view>

        <view class="time-row time-row--last" @tap="chooseEndTime">
          <text class="time-row__label">{{ t('interpreter.booking.endTime') }}</text>
          <view class="time-row__value">
            <text class="time-row__text">{{ form.endTime || t('common.select') }}</text>
            <text class="time-row__arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="form-section form-section--last">
        <text class="form-section__title">{{ t('interpreter.booking.remark') }} {{ t('common.optional') }}</text>
        <textarea
          class="form-textarea"
          v-model="form.remark"
          :placeholder="t('interpreter.booking.remarkPlaceholder')"
          placeholder-class="form-placeholder"
          maxlength="200"
        />
        <text class="char-count">{{ form.remark.length }}/200</text>
      </view>
    </view>

    <!-- 费用预览卡片 -->
    <view class="fee-card">
      <text class="fee-card__title">{{ t('interpreter.booking.costPreview') }}</text>
      <view class="fee-row">
        <text class="fee-row__label">{{ t('interpreter.booking.hourlyRate') }}</text>
        <text class="fee-row__value">¥{{ hourlyRate }}{{ t('interpreter.priceUnit') }}</text>
      </view>
      <view class="fee-row">
        <text class="fee-row__label">{{ t('interpreter.booking.duration') }}</text>
        <text class="fee-row__value">{{ durationHours.toFixed(1) }} {{ t('interpreter.hour') }}</text>
      </view>
      <view class="fee-divider" />
      <view class="fee-total">
        <text class="fee-total__label">{{ t('interpreter.booking.totalCost') }}</text>
        <text class="fee-total__value">¥{{ totalFee.toFixed(0) }}</text>
      </view>
    </view>

    <!-- 提交按钮 -->
    <button
      class="submit-btn"
      :class="{ 'submit-btn--disabled': submitting }"
      :disabled="submitting"
      @tap="handleSubmit"
    >
      {{ submitting ? t('common.submitting') : t('interpreter.booking.submitBtn') }}
    </button>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.booking-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding: 24rpx;
}

/* ── 表单卡片 ── */
.form-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 0 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.form-section {
  padding: 32rpx 0;
  border-bottom: 2rpx solid $color-divider;

  &--last {
    border-bottom: none;
  }

  &__title {
    display: block;
    font-size: 28rpx;
    color: $color-text-secondary;
    margin-bottom: 16rpx;
  }
}

/* ── 服务类型选择 ── */
.service-type-selector {
  display: flex;
  gap: 16rpx;
}

.service-type-option {
  flex: 1;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 2rpx solid $color-divider;
  text-align: center;

  &__text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;

    & .service-type-option__text {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

/* ── 人数计数器 ── */
.counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32rpx;
  padding: 20rpx 0;

  &__btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background-color: $color-primary-light;
    display: flex;
    align-items: center;
    justify-content: center;

    &--disabled {
      opacity: 0.4;
    }

    &__text {
      font-size: 36rpx;
      color: $color-primary;
      font-weight: 700;
      line-height: 1;
    }
  }

  &__val {
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
    min-width: 100rpx;
    text-align: center;
  }
}

/* ── 时间选择行 ── */
.time-row {
  padding: 20rpx 24rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &--last {
    margin-bottom: 0;
  }

  &__label {
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &__value {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__text {
    font-size: 26rpx;
    color: $color-text-primary;
  }

  &__arrow {
    font-size: 32rpx;
    color: $color-text-hint;
  }
}

/* ── 备注输入 ── */
.form-textarea {
  width: 100%;
  height: 160rpx;
  padding: 16rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: $color-text-primary;
  line-height: 1.5;
  box-sizing: border-box;
}

.form-placeholder {
  color: $color-text-hint;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: $color-text-hint;
  margin-top: 8rpx;
}

/* ── 费用预览卡片 ── */
.fee-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: 24rpx;
  }
}

.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64rpx;

  &__label {
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &__value {
    font-size: 26rpx;
    color: $color-text-primary;
  }
}

.fee-divider {
  height: 2rpx;
  background-color: $color-divider;
  margin: 16rpx 0;
}

.fee-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8rpx;

  &__label {
    font-size: 30rpx;
    font-weight: 600;
    color: $color-text-secondary;
  }

  &__value {
    font-size: 48rpx;
    font-weight: 700;
    color: $color-primary;
  }
}

/* ── 提交按钮 ── */
.submit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  line-height: 88rpx;

  &--disabled {
    opacity: 0.6;
  }
}
</style>
