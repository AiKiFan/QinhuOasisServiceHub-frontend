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

/** 日期选择器绑定值 */
const startDate = ref('')
const startTime = ref('')
const endDate = ref('')
const endTime = ref('')

/** 表单数据 */
const form = ref({
  serviceType: 1,
  groupSize: 1,
  remark: '',
  phone: '',
})

/** 译员时薪（从上一页传递） */
const hourlyRate = ref(50)

/** 提交中状态 */
const submitting = ref(false)

/** 生成未来7天日期选项 */
const dateRange = computed(() => {
  const dates = []
  const now = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${day}`)
  }
  return dates
})

/** 生成时间选项（08:00 ~ 20:00，每半小时） */
const timeOptions = computed(() => {
  const times = []
  for (let h = 8; h <= 20; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 20) times.push(`${String(h).padStart(2, '0')}:30`)
  }
  return times
})

/** 计算合并后的开始/结束时间字符串 */
const startDateTime = computed(() => {
  if (!startDate.value || !startTime.value) return ''
  return `${startDate.value} ${startTime.value}`
})
const endDateTime = computed(() => {
  if (!endDate.value || !endTime.value) return ''
  return `${endDate.value} ${endTime.value}`
})

/**
 * 计算服务时长（小时）
 */
const durationHours = computed(() => {
  if (!startDateTime.value || !endDateTime.value) return 0
  const start = new Date(startDateTime.value)
  const end = new Date(endDateTime.value)
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

/** 日期选择器变更 */
function onStartDateChange(e) {
  startDate.value = dateRange.value[e.detail.value] || ''
}
function onEndDateChange(e) {
  endDate.value = dateRange.value[e.detail.value] || ''
}

/** 时间选择器变更 */
function onStartTimeChange(e) {
  startTime.value = timeOptions.value[e.detail.value] || ''
}
function onEndTimeChange(e) {
  endTime.value = timeOptions.value[e.detail.value] || ''
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

  if (!startDateTime.value) {
    uni.showToast({ title: t('interpreter.booking.startTimeRequired'), icon: 'none' })
    return
  }
  if (!endDateTime.value) {
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
      startTime: new Date(startDateTime.value).toISOString(),
      endTime: new Date(endDateTime.value).toISOString(),
      remark: form.value.remark,
      phone: form.value.phone.trim() || undefined,
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

        <!-- 开始日期 -->
        <picker :range="dateRange" @change="onStartDateChange">
          <view class="time-row">
            <text class="time-row__label">{{ t('interpreter.booking.startTime') }}</text>
            <view class="time-row__value">
              <text class="time-row__text">{{ startDate || t('common.select') }}</text>
              <text class="time-row__arrow">›</text>
            </view>
          </view>
        </picker>

        <!-- 开始时间 -->
        <picker v-if="startDate" :range="timeOptions" @change="onStartTimeChange">
          <view class="time-row">
            <text class="time-row__label"></text>
            <view class="time-row__value">
              <text class="time-row__text">{{ startTime || t('common.select') }}</text>
              <text class="time-row__arrow">›</text>
            </view>
          </view>
        </picker>

        <!-- 结束日期 -->
        <picker :range="dateRange" @change="onEndDateChange">
          <view class="time-row">
            <text class="time-row__label">{{ t('interpreter.booking.endTime') }}</text>
            <view class="time-row__value">
              <text class="time-row__text">{{ endDate || t('common.select') }}</text>
              <text class="time-row__arrow">›</text>
            </view>
          </view>
        </picker>

        <!-- 结束时间 -->
        <picker v-if="endDate" :range="timeOptions" @change="onEndTimeChange">
          <view class="time-row time-row--last">
            <text class="time-row__label"></text>
            <view class="time-row__value">
              <text class="time-row__text">{{ endTime || t('common.select') }}</text>
              <text class="time-row__arrow">›</text>
            </view>
          </view>
        </picker>
      </view>

      <!-- 备注 -->
      <view class="form-section">
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

      <!-- 联系电话 -->
      <view class="form-section form-section--last">
        <text class="form-section__title">{{ t('interpreter.booking.phone') }} {{ t('common.optional') }}</text>
        <input
          class="form-input"
          v-model="form.phone"
          type="tel"
          :placeholder="t('interpreter.booking.phonePlaceholder')"
          placeholder-class="form-placeholder"
          maxlength="20"
        />
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

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 16rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: $color-text-primary;
  box-sizing: border-box;
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
