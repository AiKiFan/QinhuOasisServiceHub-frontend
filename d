<!--
  预约译员页
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { createInterpreterOrder } from '@/api/interpreter-order'

/** 页面参数（译员 ID + 时薪） */
const profileId = ref('')
const hourlyRate = ref(0)

/** 服务类型：1=个人 2=团队 */
const SERVICE_TYPES = [
  { value: 1, label: '个人译员' },
  { value: 2, label: '团队译员' },
]

/** 表单数据 */
const form = ref({
  serviceType: 1,
  groupSize: 1,
  startTime: '',
  endTime: '',
  remark: '',
})

/** 提交中状态 */
const submitting = ref(false)

/** 计算预约时长（小时）与总价 */
const bookingDuration = computed(() => {
  if (!form.value.startTime || !form.value.endTime) return 0
  const start = new Date(form.value.startTime)
  const end = new Date(form.value.endTime)
  const diffMs = end - start
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (1000 * 60 * 60))
})

const totalAmount = computed(() => {
  return bookingDuration.value * Number(hourlyRate.value)
})

/** 选择日期时间 */
function chooseDateTime(field) {
  uni.showDatePicker({
    format: 'yyyy-MM-dd HH:mm',
    success: (res) => {
      form.value[field] = res
    },
  })
}

/**
 * 提交预约
 */
async function handleSubmit() {
  if (!form.value.startTime || !form.value.endTime) {
    uni.showToast({ title: '请选择服务时间', icon: 'none' })
    return
  }
  if (bookingDuration.value <= 0) {
    uni.showToast({ title: '结束时间须晚于开始时间', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await createInterpreterOrder({
      profileId: Number(profileId.value),
      serviceType: form.value.serviceType,
      groupSize: form.value.groupSize,
      startTime: new Date(form.value.startTime).toISOString(),
      endTime: new Date(form.value.endTime).toISOString(),
      remark: form.value.remark || '',
    })
    uni.showToast({ title: '预约成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/profile/index' })
    }, 1500)
  } catch {
    // 错误已在 request.js 中通过 Toast 展示
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  profileId.value = options.profileId || ''
  hourlyRate.value = Number(options.hourlyRate) || 0
  // 默认设置时间
  const now = new Date()
  now.setMinutes(0, 0, 0)
  form.value.startTime = formatDate(now)
  const end = new Date(now)
  end.setHours(end.getHours() + 2)
  form.value.endTime = formatDate(end)
})

/**
 * 格式化日期为 yyyy-MM-dd HH:mm
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}
</script>

<template>
  <view class="booking-page">
    <view class="form-card">
      <!-- 服务类型 -->
      <view class="form-section">
        <text class="form-section__title">服务类型</text>
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

      <!-- 团队人数（专业 2 时展示） -->
      <view v-if="form.serviceType === 2" class="form-section">
        <text class="form-section__title">团队人数</text>
        <view class="group-size-control">
          <button
            class="group-size-btn"
            :disabled="form.groupSize <= 2"
            @tap="form.groupSize = Math.max(2, form.groupSize - 1)"
          >−</button>
          <text class="group-size-value">{{ form.groupSize }} 人</text>
          <button
            class="group-size-btn"
            @tap="form.groupSize = Math.min(50, form.groupSize + 1)"
          >+</button>
        </view>
      </view>

      <!-- 开始时间 -->
      <view class="form-section">
        <text class="form-section__title">开始时间</text>
        <view class="time-picker" @tap="chooseDateTime('startTime')">
          <text class="time-picker__value">{{ form.startTime || '请选择' }}</text>
          <text class="time-picker__arrow">›</text>
        </view>
      </view>

      <!-- 结束时间 -->
      <view class="form-section">
        <text class="form-section__title">结束时间</text>
        <view class="time-picker" @tap="chooseDateTime('endTime')">
          <text class="time-picker__value">{{ form.endTime || '请选择' }}</text>
          <text class="time-picker__arrow">›</text>
        </view>
      </view>

      <!-- 备注 -->
      <view class="form-section form-section--last">
        <text class="form-section__title">备注</text>
        <textarea
          class="remark-input"
          v-model="form.remark"
          placeholder="如有特殊需求请在此备注..."
          placeholder-class="remark-placeholder"
          maxlength="200"
        />
        <text class="char-count">{{ form.remark.length }}/200</text>
      </view>
    </view>

    <!-- 费用预览 -->
    <view class="fee-preview">
      <text class="fee-preview__label">费用预览</text>
      <view class="fee-preview__detail">
        <text class="fee-preview__text">
          时薪 ¥{{ hourlyRate }} × {{ bookingDuration }} 小时
        </text>
        <text class="fee-preview__total">
          = <text class="fee-preview__amount">¥{{ totalAmount.toFixed(0) }}</text>
        </text>
      </view>
      <view class="fee-preview__hint">最终价格以订单结算页为准</view>
    </view>

    <!-- 提交按钮 -->
    <button
      class="submit-btn"
      :class="{ 'submit-btn--disabled': submitting }"
      :disabled="submitting"
      @tap="handleSubmit"
    >
      {{ submitting ? '提交中...' : `提交预约 · ¥${totalAmount.toFixed(0)}` }}
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

/* ── 团队人数控制 ── */
.group-size-control {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.group-size-btn {
  width: 72rpx;
  height: 72rpx;
  padding: 0;
  border-radius: 50%;
  border: 2rpx solid $color-primary;
  background-color: $color-bg-card;
  color: $color-primary;
  font-size: 48rpx;
  font-weight: 600;
  line-height: 72rpx;
  text-align: center;
}

.group-size-value {
  font-size: 36rpx;
  font-weight: 600;
  color: $color-text-primary;
  min-width: 120rpx;
  text-align: center;
}

/* ── 时间选择器 ── */
.time-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;

  &__value {
    font-size: 28rpx;
    color: $color-text-primary;
  }

  &__arrow {
    font-size: 32rpx;
    color: $color-text-hint;
  }
}

/* ── 备注输入框 ── */
.remark-input {
  width: 100%;
  height: 144rpx;
  padding: 20rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: $color-text-primary;
  line-height: 1.5;
  box-sizing: border-box;
}

.remark-placeholder {
  color: $color-text-hint;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: $color-text-hint;
  margin-top: 8rpx;
}

/* ── 费用预览 ── */
.fee-preview {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__label {
    display: block;
    font-size: 28rpx;
    color: $color-text-secondary;
    margin-bottom: 16rpx;
  }

  &__detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__text {
    font-size: 28rpx;
    color: $color-text-primary;
  }

  &__total {
    font-size: 28rpx;
    color: $color-text-primary;
  }

  &__amount {
    font-size: 48rpx;
    font-weight: 700;
    color: $color-primary;
  }

  &__hint {
    display: block;
    font-size: 22rpx;
    color: $color-text-hint;
    margin-top: 12rpx;
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
