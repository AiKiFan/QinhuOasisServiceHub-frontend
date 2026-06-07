<!--
  我的译员申请页 - 查看申请状态，审核前可修改
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getMyProfile, updateMyApplication, uploadInterpreterCert } from '@/api/interpreter'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'
import { previewImage } from '@/utils/image'

/** 英语等级选项 */
const ENGLISH_LEVELS = computed(() => [
  { value: 0, label: t('interpreter.level.cet4') },
  { value: 1, label: t('interpreter.level.cet6') },
  { value: 2, label: t('interpreter.level.tem4') },
  { value: 3, label: t('interpreter.level.tem8') },
  { value: 4, label: t('interpreter.level.other') },
])

/** 服务类型选项 */
const SERVICE_TYPES = computed(() => [
  { value: 1, label: t('interpreter.type.personalTag') },
  { value: 2, label: t('interpreter.type.teamTag') },
])

const loading = ref(true)
const profile = ref(null)
const editing = ref(false)
const submitting = ref(false)
const showNoChangeDialog = ref(false)

/** 原始值（用于判断是否有变更） */
const original = ref({})

/** 编辑表单 */
const form = ref({
  realName: '',
  studentId: '',
  school: '',
  englishLevel: 0,
  certUrls: [],
  introduction: '',
  introductionEn: '',
  serviceTypes: 3,
  hourlyRate: 50,
})

/** 状态文案 */
const statusText = computed(() => {
  if (!profile.value) return ''
  const map = {
    0: t('interpreter.myApplication.status.pending'),
    1: t('interpreter.myApplication.status.approved'),
    2: t('interpreter.myApplication.status.rejected'),
  }
  return map[profile.value.status] ?? ''
})

/** 状态样式类 */
const statusClass = computed(() => {
  if (!profile.value) return ''
  const map = { 0: 'pending', 1: 'approved', 2: 'rejected' }
  return map[profile.value.status] ?? ''
})

/** 是否可编辑（待审核或已拒绝状态） */
const canEdit = computed(() => profile.value?.status === 0 || profile.value?.status === 2)

/** 进入编辑模式 */
function startEdit() {
  if (!profile.value) return
  form.value = {
    realName: profile.value.realName || '',
    studentId: profile.value.studentId || '',
    school: profile.value.school || '',
    englishLevel: profile.value.englishLevel ?? 0,
    certUrls: (profile.value.certUrl || '').split(',').filter(Boolean),
    introduction: profile.value.introduction || '',
    introductionEn: profile.value.introductionEn || '',
    serviceTypes: profile.value.serviceTypes ?? 3,
    hourlyRate: profile.value.hourlyRate ?? 50,
  }
  original.value = { ...form.value, certUrls: [...form.value.certUrls] }
  editing.value = true
}

/** 选择英语等级 */
function chooseEnglishLevel() {
  const options = ENGLISH_LEVELS.value.map(el => el.label)
  uni.showActionSheet({
    itemList: options,
    success: (res) => {
      if (res.tapIndex !== undefined) {
        form.value.englishLevel = ENGLISH_LEVELS.value[res.tapIndex].value
      }
    },
  })
}

/** 切换服务类型 */
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
      const tempFilePaths = res.tempFilePaths
      uni.showLoading({ title: t('common.uploading') })
      Promise.all(tempFilePaths.map(fp => uploadInterpreterCert(fp)))
        .then(results => {
          results.forEach(r => form.value.certUrls.push(r.url))
          uni.hideLoading()
          uni.showToast({ title: t('common.uploadSuccess'), icon: 'success' })
        })
        .catch(() => {
          uni.hideLoading()
          uni.showToast({ title: t('common.uploadFailed'), icon: 'none' })
        })
    },
  })
}

/** 删除资质图片 */
function removeCertImage(index) {
  form.value.certUrls.splice(index, 1)
}

/** 预览资质图片 */
function previewCert(url) {
  const certUrls = (profile.value?.certUrl || '').split(',').filter(Boolean)
  if (certUrls.length > 0) {
    previewImage({ urls: certUrls, current: url || certUrls[0] })
  }
}

/** 提交修改 */
async function handleSubmit() {
  if (!form.value.realName) {
    uni.showToast({ title: t('interpreter.apply.realNameRequired'), icon: 'none' })
    return
  }
  if (!form.value.studentId) {
    uni.showToast({ title: t('interpreter.apply.studentIdRequired'), icon: 'none' })
    return
  }
  if (!form.value.school) {
    uni.showToast({ title: t('interpreter.apply.schoolRequired'), icon: 'none' })
    return
  }
  if (!form.value.certUrls.length) {
    uni.showToast({ title: t('interpreter.apply.certRequired'), icon: 'none' })
    return
  }
  if (!form.value.introduction || !form.value.introductionEn) {
    uni.showToast({ title: t('interpreter.apply.introRequired'), icon: 'none' })
    return
  }
  if (form.value.serviceTypes === 0) {
    uni.showToast({ title: t('interpreter.apply.serviceTypeRequired'), icon: 'none' })
    return
  }

  // 检测是否有变更
  const certUrlsStr = (form.value.certUrls || []).join(',')
  const origCertUrlsStr = (original.value.certUrls || []).join(',')
  const changed =
    form.value.realName !== original.value.realName ||
    form.value.studentId !== original.value.studentId ||
    form.value.school !== original.value.school ||
    form.value.englishLevel !== original.value.englishLevel ||
    certUrlsStr !== origCertUrlsStr ||
    form.value.introduction !== original.value.introduction ||
    form.value.introductionEn !== original.value.introductionEn ||
    form.value.serviceTypes !== original.value.serviceTypes ||
    form.value.hourlyRate !== original.value.hourlyRate

  if (!changed) {
    showNoChangeDialog.value = true
    submitting.value = false
    return
  }

  submitting.value = true
  try {
    const updated = await updateMyApplication({
      realName: form.value.realName,
      studentId: form.value.studentId,
      school: form.value.school,
      englishLevel: form.value.englishLevel,
      certUrl: form.value.certUrls.join(','),
      introduction: form.value.introduction,
      introductionEn: form.value.introductionEn,
      serviceTypes: form.value.serviceTypes,
      hourlyRate: Number(form.value.hourlyRate),
    })
    profile.value = updated
    original.value = {
      realName: form.value.realName,
      studentId: form.value.studentId,
      school: form.value.school,
      englishLevel: form.value.englishLevel,
      certUrls: [...form.value.certUrls],
      introduction: form.value.introduction,
      introductionEn: form.value.introductionEn,
      serviceTypes: form.value.serviceTypes,
      hourlyRate: form.value.hourlyRate,
    }
    editing.value = false
    uni.showToast({ title: t('interpreter.myApplication.updateSuccess'), icon: 'success' })
  } catch {
    // 错误已在 request.js 中展示
  } finally {
    submitting.value = false
  }
}

/** 取消编辑 */
function cancelEdit() {
  editing.value = false
}

onMounted(async () => {
  uni.setNavigationBarTitle({ title: t('interpreter.myApplication.title') })
  try {
    const data = await getMyProfile()
    profile.value = data
  } catch {
    // 未登录等情况
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <view class="my-application-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">{{ t('common.loading') }}</text>
    </view>

    <!-- 无申请 -->
    <view v-else-if="!profile" class="empty-state">
      <text class="empty-text">{{ t('interpreter.myApplication.noApplication') }}</text>
      <button class="go-apply-btn" @tap="uni.navigateTo({ url: '/pages/interpreter/apply' })">
        {{ t('interpreter.myApplication.goApply') }}
      </button>
    </view>

    <!-- 编辑模式 -->
    <view v-else-if="editing" class="form-card">
      <!-- 真实姓名 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.realName') }} *</text>
        <input class="form-input" v-model="form.realName" :placeholder="t('interpreter.apply.realNamePlaceholder')" placeholder-class="form-placeholder" />
      </view>

      <!-- 学号 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.studentId') }} *</text>
        <input class="form-input" v-model="form.studentId" :placeholder="t('interpreter.apply.studentIdPlaceholder')" placeholder-class="form-placeholder" />
      </view>

      <!-- 学校 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.school') }} *</text>
        <input class="form-input" v-model="form.school" :placeholder="t('interpreter.apply.schoolPlaceholder')" placeholder-class="form-placeholder" />
      </view>

      <!-- 英语等级 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.englishLevel') }} *</text>
        <view class="level-selector" @tap="chooseEnglishLevel">
          <text class="level-selector__label">
            {{ ENGLISH_LEVELS.find(el => el.value === form.englishLevel)?.label || t('common.select') }}
          </text>
          <text class="level-selector__arrow">›</text>
        </view>
      </view>

      <!-- 资质证书 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.cert') }} *</text>
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
            v-if="form.certUrls.length < 4"
            class="cert-grid__add"
            @tap="chooseCertImage"
          >
            <text class="cert-grid__add-icon">+</text>
            <text class="cert-grid__add-text">{{ t('interpreter.apply.addCert') }}</text>
          </view>
        </view>
        <view v-else class="cert-upload" @tap="chooseCertImage">
          <view class="cert-upload__icon">📷</view>
          <text class="cert-upload__text">{{ t('interpreter.apply.uploadCert') }}</text>
          <text class="cert-upload__hint">{{ t('interpreter.apply.certHint') }}</text>
        </view>
      </view>

      <!-- 中文介绍 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.introZh') }} *</text>
        <textarea class="form-textarea" v-model="form.introduction" :placeholder="t('interpreter.apply.introPlaceholder')" placeholder-class="form-placeholder" maxlength="500" />
        <text class="char-count">{{ form.introduction.length }}/500</text>
      </view>

      <!-- 英文介绍 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.introEn') }} *</text>
        <textarea class="form-textarea" v-model="form.introductionEn" :placeholder="t('interpreter.apply.introEnPlaceholder')" placeholder-class="form-placeholder" maxlength="500" />
        <text class="char-count">{{ form.introductionEn.length }}/500</text>
      </view>

      <!-- 服务类型 -->
      <view class="form-section">
        <text class="form-section__title">{{ t('interpreter.apply.serviceType') }} *</text>
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
        <text class="form-section__title">{{ t('interpreter.apply.hourlyRate') }} *</text>
        <input class="form-input" type="digit" v-model.number="form.hourlyRate" :placeholder="t('interpreter.apply.hourlyRatePlaceholder')" placeholder-class="form-placeholder" />
      </view>

      <!-- 按钮组 -->
      <view class="btn-group">
        <button class="btn-cancel" @tap="cancelEdit">{{ t('common.cancel') }}</button>
        <button class="btn-submit" :disabled="submitting" @tap="handleSubmit">
          {{ submitting ? t('common.submitting') : t('common.confirm') }}
        </button>
      </view>
    </view>

    <!-- 查看模式 -->
    <view v-else class="view-mode">
      <!-- 状态卡片 -->
      <view class="status-card">
        <view class="status-badge" :class="'status-badge--' + statusClass">
          <text class="status-badge__text">{{ statusText }}</text>
        </view>
        <view v-if="profile.status === 2 && profile.rejectReason" class="reject-reason">
          <text class="reject-reason__label">{{ t('interpreter.myApplication.rejectReason') }}</text>
          <text class="reject-reason__content">{{ profile.rejectReason }}</text>
        </view>
      </view>

      <!-- 信息卡片 -->
      <view class="info-card">
        <view class="info-row">
          <text class="info-row__label">{{ t('interpreter.apply.realName') }}</text>
          <text class="info-row__value">{{ profile.realName }}</text>
        </view>
        <view class="info-row">
          <text class="info-row__label">{{ t('interpreter.apply.studentId') }}</text>
          <text class="info-row__value">{{ profile.studentId }}</text>
        </view>
        <view class="info-row">
          <text class="info-row__label">{{ t('interpreter.apply.school') }}</text>
          <text class="info-row__value">{{ profile.school }}</text>
        </view>
        <view class="info-row">
          <text class="info-row__label">{{ t('interpreter.apply.englishLevel') }}</text>
          <text class="info-row__value">{{ ENGLISH_LEVELS.find(el => el.value === profile.englishLevel)?.label || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-row__label">{{ t('interpreter.apply.serviceType') }}</text>
          <text class="info-row__value">
            {{ SERVICE_TYPES.filter(st => profile.serviceTypes & st.value).map(st => st.label).join(' / ') || '-' }}
          </text>
        </view>
        <view class="info-row">
          <text class="info-row__label">{{ t('interpreter.apply.hourlyRate') }}</text>
          <text class="info-row__value">¥{{ profile.hourlyRate }}{{ t('interpreter.priceUnit') }}</text>
        </view>

        <!-- 资质证书 -->
        <view class="info-row info-row--block">
          <text class="info-row__label">{{ t('interpreter.apply.cert') }}</text>
          <view v-if="(profile.certUrl || '').split(',').filter(Boolean).length" class="cert-view-grid">
            <view
              v-for="(url, index) in (profile.certUrl || '').split(',').filter(Boolean)"
              :key="index"
              class="cert-view-grid__item"
              @tap="previewCert(url)"
            >
              <SafeImage class="cert-view-grid__img" :src="url" mode="aspectFill" :previewable="true" />
            </view>
          </view>
          <text v-else class="info-row__value">-</text>
        </view>

        <!-- 中文介绍 -->
        <view class="info-row info-row--block">
          <text class="info-row__label">{{ t('interpreter.apply.introZh') }}</text>
          <text class="info-row__value info-row__value--block">{{ profile.introduction || '-' }}</text>
        </view>

        <!-- 英文介绍 -->
        <view class="info-row info-row--block info-row--last">
          <text class="info-row__label">{{ t('interpreter.apply.introEn') }}</text>
          <text class="info-row__value info-row__value--block">{{ profile.introductionEn || '-' }}</text>
        </view>
      </view>

      <!-- 修改按钮（仅待审核） -->
      <button v-if="canEdit" class="edit-btn" @tap="startEdit">
        {{ t('interpreter.myApplication.editBtn') }}
      </button>
    </view>

    <!-- 无变更弹窗 -->
    <view v-if="showNoChangeDialog" class="confirm-mask" @tap.self="showNoChangeDialog = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('profile.edit.noChangeTitle') }}</text>
        <text class="confirm-dialog__content">{{ t('profile.edit.noChange') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--single" @tap="showNoChangeDialog = false">
            <text>{{ t('common.confirm') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.my-application-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding: 24rpx;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.loading-text {
  font-size: 28rpx;
  color: $color-text-hint;
}

.empty-text {
  font-size: 28rpx;
  color: $color-text-hint;
  margin-bottom: 32rpx;
}

.go-apply-btn {
  width: 320rpx;
  height: 80rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 40rpx;
  border: none;
  line-height: 80rpx;
}

/* ── 状态卡片 ── */
.status-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
  text-align: center;
}

.status-badge {
  display: inline-block;
  padding: 12rpx 40rpx;
  border-radius: 32rpx;
  font-size: 28rpx;
  font-weight: 600;

  &--pending {
    background-color: rgba(240, 173, 78, 0.15);
    color: #F0AD4E;
  }
  &--approved {
    background-color: rgba(76, 217, 100, 0.15);
    color: #4CD964;
  }
  &--rejected {
    background-color: rgba(221, 82, 77, 0.15);
    color: #DD524D;
  }

  &__text {
    font-size: 28rpx;
    font-weight: 600;
  }
}

.reject-reason {
  margin-top: 24rpx;
  text-align: left;
  padding: 20rpx;
  background-color: rgba(221, 82, 77, 0.06);
  border-radius: 12rpx;

  &__label {
    display: block;
    font-size: 24rpx;
    color: #DD524D;
    font-weight: 600;
    margin-bottom: 8rpx;
  }
  &__content {
    font-size: 26rpx;
    color: $color-text-secondary;
    line-height: 1.5;
  }
}

/* ── 信息卡片 ── */
.info-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 0 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.info-row {
  padding: 24rpx 0;
  border-bottom: 2rpx solid $color-divider;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  &--block {
    flex-direction: column;
  }
  &--last {
    border-bottom: none;
  }

  &__label {
    font-size: 26rpx;
    color: $color-text-hint;
    flex-shrink: 0;
    margin-right: 24rpx;
  }
  &__value {
    font-size: 28rpx;
    color: $color-text-primary;
    text-align: right;
    word-break: break-all;

    &--block {
      text-align: left;
      margin-top: 12rpx;
      line-height: 1.6;
    }
  }
}

.cert-view {
  margin-top: 12rpx;
  &__img {
    width: 240rpx;
    height: 240rpx;
    border-radius: 12rpx;
  }
}

.cert-view-grid {
  margin-top: 12rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  &__item {
    width: 160rpx;
    height: 160rpx;
    border-radius: 8rpx;
    overflow: hidden;
  }

  &__img {
    width: 100%;
    height: 100%;
    border-radius: 8rpx;
  }
}

/* ── 编辑表单（复用 apply 页样式） ── */
.form-card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 0 32rpx 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.form-section {
  padding: 32rpx 0;
  border-bottom: 2rpx solid $color-divider;
  &--last { border-bottom: none; }
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

.form-placeholder { color: $color-text-hint; }

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
  &__label { font-size: 28rpx; color: $color-text-primary; }
  &__arrow { font-size: 32rpx; color: $color-text-hint; }
}

.cert-uploaded {
  padding: 20rpx;
  text-align: center;
  &__hint {
    display: block;
    font-size: 22rpx;
    color: $color-primary;
    margin-top: 12rpx;
  }
}

.cert-preview {
  width: 320rpx;
  height: 320rpx;
  border-radius: 12rpx;
  margin: 0 auto;
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
  &__icon { font-size: 64rpx; line-height: 1; margin-bottom: 12rpx; }
  &__text { font-size: 24rpx; color: $color-text-hint; }
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
  &__text { font-size: 28rpx; color: $color-text-secondary; }
  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;
    .service-type-option__text { color: $color-primary; font-weight: 600; }
  }
}

.btn-group {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}

.btn-cancel {
  flex: 1;
  height: 88rpx;
  background-color: $color-bg-page;
  color: $color-text-secondary;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: 2rpx solid $color-divider;
  line-height: 88rpx;
}

.btn-submit {
  flex: 1;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  line-height: 88rpx;
  opacity: 1;
  &[disabled] { opacity: 0.6; }
}

/* ── 修改按钮 ── */
.edit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  line-height: 88rpx;
}

/* ── 无变更弹窗 ── */
.confirm-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.confirm-dialog {
  width: 560rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  overflow: hidden;

  &__title {
    display: block;
    text-align: center;
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
    padding: 48rpx 40rpx 16rpx;
  }

  &__content {
    display: block;
    text-align: center;
    font-size: 26rpx;
    color: $color-text-secondary;
    padding: 0 40rpx 48rpx;
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    border-top: 2rpx solid $color-divider;
  }

  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 96rpx;
    font-size: 30rpx;

    &--single {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

/* ── 资质图片网格 ── */
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
  }
}
</style>
