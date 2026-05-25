<!--
  管理员编辑译员资料
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { getInterpreterDetail } from '@/api/interpreter'
import { adminUpdateInterpreterProfile } from '@/api/admin'
import { uploadInterpreterCert } from '@/api/interpreter'
import { getUser } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

/** 页面参数（译员 ID） */
const pageOptions = ref(uni.getStorageSync('pageOptions') || {})

/** 译员 ID */
const interpreterId = ref(null)

/** 加载状态 */
const loading = ref(false)
/** 提交状态 */
const submitting = ref(false)
/** 加载失败 */
const loadError = ref(false)

/** 英语等级选项 */
const ENGLISH_LEVELS = [
  { value: 0, label: t('interpreter.level.cet4') },
  { value: 1, label: t('interpreter.level.cet6') },
  { value: 2, label: t('interpreter.level.tem4') },
  { value: 3, label: t('interpreter.level.tem8') },
  { value: 4, label: t('interpreter.level.other') },
]

/** 服务类型选项 */
const SERVICE_TYPES = [
  { value: 1, label: t('admin.interpreter.serviceTypePersonal') },
  { value: 2, label: t('admin.interpreter.serviceTypeTeam') },
]

/** 表单数据 */
const form = ref({
  realName: '',
  studentId: '',
  school: '',
  englishLevel: null,
  certUrls: [],
  certNo: '',
  introduction: '',
  introductionEn: '',
  serviceTypes: 3,
  hourlyRate: 50,
})

/** 上传中状态 */
const uploadingCert = ref(false)

/** 选择英语等级 */
function chooseEnglishLevel() {
  const options = ENGLISH_LEVELS.map(el => el.label)
  uni.showActionSheet({
    itemList: options,
    success: (res) => {
      if (res.tapIndex !== undefined) {
        form.value.englishLevel = ENGLISH_LEVELS[res.tapIndex].value
      }
    },
  })
}

/** 选择服务类型（多选） */
function toggleServiceType(value) {
  form.value.serviceTypes ^= value
}

/** 选择资质图片（最多4张） */
function chooseCertImage() {
  const remain = 4 - form.value.certUrls.length
  if (remain <= 0) {
    uni.showToast({ title: t('interpreter.apply.certMaxTip'), icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    success: (res) => {
      uploadingCert.value = true
      const tempFilePaths = res.tempFilePaths
      uni.showLoading({ title: t('common.loading') })
      Promise.all(tempFilePaths.map(fp => uploadInterpreterCert(fp)))
        .then(results => {
          results.forEach(r => form.value.certUrls.push(r.url))
          uni.hideLoading()
          uni.showToast({ title: t('common.uploadSuccess'), icon: 'success' })
        })
        .catch(() => {
          uni.hideLoading()
          uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
        })
        .finally(() => {
          uploadingCert.value = false
        })
    },
    fail: () => {
      // 用户取消选择，不做处理
    },
  })
}

/** 删除资质图片 */
function removeCertImage(index) {
  form.value.certUrls.splice(index, 1)
}

/** 预览资质图片 */
function previewCert(url) {
  if (url) {
    uni.previewImage({ urls: form.value.certUrls, current: url })
  }
}

/** 加载译员数据 */
async function loadData() {
  if (!interpreterId.value) {
    loadError.value = true
    return
  }
  loading.value = true
  loadError.value = false
  try {
    const detail = await getInterpreterDetail(interpreterId.value)
    form.value.realName = detail.realName || ''
    form.value.studentId = detail.studentId || ''
    form.value.school = detail.school || ''
    form.value.englishLevel = detail.englishLevel ?? null
    form.value.certUrls = (detail.certUrl || '').split(',').filter(Boolean)
    form.value.certNo = detail.certNo || ''
    form.value.introduction = detail.introduction || ''
    form.value.introductionEn = detail.introductionEn || ''
    form.value.serviceTypes = detail.serviceTypes ?? 3
    form.value.hourlyRate = detail.hourlyRate ?? 50
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

/** 提交保存 */
async function handleSubmit() {
  if (!form.value.realName) {
    uni.showToast({ title: t('admin.interpreter.realNameRequired'), icon: 'none' })
    return
  }
  if (!form.value.studentId) {
    uni.showToast({ title: t('admin.interpreter.studentIdRequired'), icon: 'none' })
    return
  }
  if (!form.value.school) {
    uni.showToast({ title: t('admin.interpreter.schoolRequired'), icon: 'none' })
    return
  }
  if (form.value.englishLevel === null) {
    uni.showToast({ title: t('admin.interpreter.englishLevelRequired'), icon: 'none' })
    return
  }
  if (form.value.hourlyRate < 0) {
    uni.showToast({ title: t('admin.interpreter.hourlyRateInvalid'), icon: 'none' })
    return
  }
  if (form.value.serviceTypes === 0) {
    uni.showToast({ title: t('admin.interpreter.serviceTypeRequired'), icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await adminUpdateInterpreterProfile(interpreterId.value, {
      realName: form.value.realName,
      studentId: form.value.studentId,
      school: form.value.school,
      englishLevel: form.value.englishLevel,
      certUrl: form.value.certUrls.join(','),
      certNo: form.value.certNo,
      introduction: form.value.introduction,
      introductionEn: form.value.introductionEn,
      serviceTypes: form.value.serviceTypes,
      hourlyRate: Number(form.value.hourlyRate),
    })
    uni.showToast({ title: t('admin.interpreter.saveSuccess'), icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch {
    uni.showToast({ title: t('admin.interpreter.saveFailed'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  // 获取页面参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  interpreterId.value = options.id
  uni.setStorageSync('pageOptions', options)
  uni.setNavigationBarTitle({ title: t('admin.interpreter.title') })
  // 权限检查
  const user = getUser()
  if (!user || user.role !== 2) {
    uni.showToast({ title: t('admin.feedback.noPermission'), icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }
  loadData()
})
</script>

<template>
  <view class="edit-page">
    <!-- 加载中 -->
    <view v-if="loading" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="loadError" class="status">
      <text class="status__text">{{ t('common.loadFailed') }}</text>
      <view class="status__retry" @tap="loadData">{{ t('common.retry') }}</view>
    </view>

    <!-- 表单 -->
    <view v-else class="form-card">
      <!-- 真实姓名 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('admin.interpreter.realName') }} *</text>
        <input
          class="form-input"
          v-model="form.realName"
          :placeholder="t('admin.interpreter.realName')"
          placeholder-class="form-placeholder"
        />
      </view>

      <!-- 学号 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('admin.interpreter.studentId') }} *</text>
        <input
          class="form-input"
          v-model="form.studentId"
          :placeholder="t('admin.interpreter.studentId')"
          placeholder-class="form-placeholder"
        />
      </view>

      <!-- 学校 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('admin.interpreter.school') }} *</text>
        <input
          class="form-input"
          v-model="form.school"
          :placeholder="t('admin.interpreter.school')"
          placeholder-class="form-placeholder"
        />
      </view>

      <!-- 英语等级 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('admin.interpreter.englishLevel') }} *</text>
        <view class="level-selector" @tap="chooseEnglishLevel">
          <text class="level-selector__label">
            {{ ENGLISH_LEVELS.find(el => el.value === form.englishLevel)?.label || t('common.select') }}
          </text>
          <text class="level-selector__arrow">›</text>
        </view>
      </view>

      <!-- 资质证书 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('admin.interpreter.cert') }}</text>
        <view v-if="form.certUrls.length" class="cert-grid">
          <view
            v-for="(url, index) in form.certUrls"
            :key="index"
            class="cert-grid__item"
          >
            <SafeImage
              class="cert-grid__img"
              :src="url"
              mode="aspectFill"
              :previewable="true"
              @tap="previewCert(url)"
            />
            <view class="cert-grid__del" @tap.stop="removeCertImage(index)">
              <text class="cert-grid__del-icon">×</text>
            </view>
          </view>
          <view
            v-if="form.certUrls.length < 4 && !uploadingCert"
            class="cert-grid__add"
            @tap="chooseCertImage"
          >
            <text class="cert-grid__add-icon">+</text>
            <text class="cert-grid__add-text">{{ t('admin.interpreter.certHint') }}</text>
          </view>
          <view v-if="uploadingCert" class="cert-grid__add cert-grid__add--loading">
            <text class="cert-grid__add-text">{{ t('common.loading') }}</text>
          </view>
        </view>
        <view v-else-if="!uploadingCert" class="cert-upload" @tap="chooseCertImage">
          <text class="cert-upload__icon">📷</text>
          <text class="cert-upload__text">{{ t('admin.interpreter.certHint') }}</text>
        </view>
      </view>

      <!-- 证书编号 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('admin.interpreter.certNo') }}</text>
        <input
          class="form-input"
          v-model="form.certNo"
          :placeholder="t('admin.interpreter.certNo')"
          placeholder-class="form-placeholder"
        />
      </view>

      <!-- 中文介绍 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('admin.interpreter.introduction') }}</text>
        <textarea
          class="form-textarea"
          v-model="form.introduction"
          :placeholder="t('admin.interpreter.introduction')"
          placeholder-class="form-placeholder"
          maxlength="500"
        />
        <text class="char-count">{{ form.introduction.length }}/500</text>
      </view>

      <!-- 英文介绍 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('admin.interpreter.introductionEn') }}</text>
        <textarea
          class="form-textarea"
          v-model="form.introductionEn"
          :placeholder="t('admin.interpreter.introductionEn')"
          placeholder-class="form-placeholder"
          maxlength="500"
        />
        <text class="char-count">{{ form.introductionEn.length }}/500</text>
      </view>

      <!-- 服务类型 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('admin.interpreter.serviceType') }} *</text>
        <view class="service-type-selector">
          <view
            v-for="st in SERVICE_TYPES"
            :key="st.value"
            class="service-type-option"
            :class="{ 'service-type-option--active': form.serviceTypes & st.value }"
            @tap="toggleServiceType(st.value)"
          >
            <text class="service-type-option__text">{{ st.label }}</text>
          </view>
        </view>
      </view>

      <!-- 时薪 -->
      <view class="form-section form-section--last">
        <text class="form-section__title">{{ t('admin.interpreter.hourlyRate') }} *</text>
        <input
          class="form-input"
          type="digit"
          v-model.number="form.hourlyRate"
          :placeholder="t('admin.interpreter.hourlyRatePlaceholder')"
          placeholder-class="form-placeholder"
        />
      </view>
    </view>

    <!-- 保存按钮 -->
    <button
      class="submit-btn"
      :class="{ 'submit-btn--disabled': submitting }"
      :disabled="submitting"
      @tap="handleSubmit"
    >
      {{ submitting ? t('common.submitting') : t('common.save') }}
    </button>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.edit-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding: 24rpx;
}

.status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  gap: 24rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }

  &__retry {
    padding: 12rpx 48rpx;
    background-color: $color-primary;
    color: #ffffff;
    font-size: 28rpx;
    border-radius: 40rpx;
  }
}

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

.form-textarea {
  width: 100%;
  height: 200rpx;
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

.level-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;

  &__label {
    font-size: 28rpx;
    color: $color-text-primary;
  }

  &__arrow {
    font-size: 32rpx;
    color: $color-text-hint;
  }
}

.cert-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200rpx;
  background-color: $color-bg-page;
  border: 2rpx dashed $color-divider;
  border-radius: 12rpx;

  &__icon {
    font-size: 64rpx;
    line-height: 1;
    margin-bottom: 12rpx;
  }

  &__text {
    font-size: 24rpx;
    color: $color-text-hint;
  }
}

.cert-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;

  &__item {
    position: relative;
    width: 200rpx;
    height: 200rpx;
  }

  &__img {
    width: 100%;
    height: 100%;
    border-radius: 12rpx;
  }

  &__del {
    position: absolute;
    top: -16rpx;
    right: -16rpx;
    width: 44rpx;
    height: 44rpx;
    background-color: rgba(0, 0, 0, 0.55);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__del-icon {
    font-size: 32rpx;
    color: #fff;
    line-height: 1;
    font-weight: 600;
  }

  &__add {
    width: 200rpx;
    height: 200rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: $color-bg-page;
    border: 2rpx dashed $color-divider;
    border-radius: 12rpx;

    &--loading {
      opacity: 0.6;
    }
  }

  &__add-icon {
    font-size: 56rpx;
    color: $color-text-hint;
    line-height: 1;
  }

  &__add-text {
    font-size: 22rpx;
    color: $color-text-hint;
    margin-top: 8rpx;
    text-align: center;
  }
}

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

    .service-type-option__text {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

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
