<!-- 攻略发布页 -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getGuideDetail, publishGuide, updateMyGuide } from '@/api/guide'
import { uploadImage } from '@/api/admin'
import { getUser, requireLogin } from '@/utils/auth'
import { getLanguage, t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'

const currentLang = ref(getLanguage())
const editingId = ref(null)
const form = ref({ postType: 2, title: '', titleEn: '', summary: '', content: '', coverImg: '', images: [], isPrivate: false })
const submitting = ref(false)
const uploading = ref(false)
const isAdmin = computed(() => {
  const user = getUser()
  return Boolean(user && (user.role === 2 || user.role === 'admin'))
})
const isEditing = computed(() => Boolean(editingId.value))
const typeOptions = computed(() => {
  currentLang.value
  return isAdmin.value
    ? [{ value: 1, label: t('guide.publish.type.official') }, { value: 2, label: t('guide.publish.type.tourist') }]
    : [{ value: 2, label: t('guide.publish.type.tourist') }]
})

function refreshLanguage() {
  currentLang.value = getLanguage()
  uni.setNavigationBarTitle({ title: isEditing.value ? t('guide.publish.editTitle') : t('guide.publish.createTitle') })
}

function parseImages(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function loadEditing() {
  if (!editingId.value) return
  const detail = await getGuideDetail(editingId.value)
  form.value = {
    postType: detail.postType,
    title: detail.title || '',
    titleEn: detail.titleEn || '',
    summary: detail.summary || '',
    content: detail.content || '',
    coverImg: detail.coverImg || '',
    images: parseImages(detail.images),
    isPrivate: Number(detail.isPrivate) === 1,
  }
}

function chooseImages() {
  if (uploading.value) return
  const remain = 9 - form.value.images.length
  if (remain <= 0) {
    uni.showToast({ title: t('guide.publish.maxImages'), icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async result => {
      uploading.value = true
      try {
        const urls = []
        for (const path of result.tempFilePaths) {
          const uploaded = await uploadImage(path)
          if (uploaded?.url) urls.push(uploaded.url)
        }
        form.value.images = form.value.images.concat(urls).slice(0, 9)
        if (!form.value.coverImg && form.value.images.length) form.value.coverImg = form.value.images[0]
      } finally {
        uploading.value = false
      }
    },
  })
}

function removeImage(index) {
  const removed = form.value.images[index]
  form.value.images.splice(index, 1)
  if (removed === form.value.coverImg) form.value.coverImg = form.value.images[0] || ''
}

function replaceImage(index) {
  if (uploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async result => {
      const oldImage = form.value.images[index]
      uploading.value = true
      try {
        const uploaded = await uploadImage(result.tempFilePaths[0])
        if (!uploaded?.url) {
          return
        }
        form.value.images.splice(index, 1, uploaded.url)
        if (oldImage === form.value.coverImg || !form.value.coverImg) {
          form.value.coverImg = uploaded.url
        }
      } finally {
        uploading.value = false
      }
    },
  })
}

async function submit() {
  if (!requireLogin()) return
  if (!form.value.title.trim() || !form.value.content.trim()) {
    uni.showToast({ title: t('guide.publish.formInvalid'), icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const payload = { ...form.value, title: form.value.title.trim(), content: form.value.content.trim() }
    const result = isEditing.value ? await updateMyGuide(editingId.value, payload) : await publishGuide(payload)
    uni.showToast({ title: result?.status === 2 ? t('guide.publish.submitSuccessReview') : t('guide.publish.submitSuccessPublish'), icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: `/pages/guide/detail?id=${result.id}` }), 600)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (!requireLogin()) return
  const options = getCurrentPages().slice(-1)[0]?.options || {}
  editingId.value = options.id || null
  refreshLanguage()
  loadEditing()
})

onShow(() => {
  refreshLanguage()
})
</script>

<template>
  <view class="publish-page">
    <view class="form-card">
      <text class="section-title">{{ t('guide.publish.typeLabel') }}</text>
      <view class="type-row">
        <view v-for="item in typeOptions" :key="item.value" class="type-option" :class="{ active: form.postType === item.value }" @tap="form.postType = item.value">{{ item.label }}</view>
      </view>
      <text class="section-title">{{ t('guide.publish.titleLabel') }} <text class="required">*</text></text>
      <input v-model="form.title" class="input" maxlength="200" :placeholder="t('guide.publish.titlePlaceholder')" />
      <text class="section-title">{{ t('guide.publish.titleEnLabel') }} <text class="optional">{{ t('common.optional') }}</text></text>
      <input v-model="form.titleEn" class="input" maxlength="300" :placeholder="t('guide.publish.titleEnPlaceholder')" />
      <text class="section-title">{{ t('guide.publish.summaryLabel') }} <text class="optional">{{ t('common.optional') }}</text></text>
      <textarea v-model="form.summary" class="textarea summary" maxlength="500" :placeholder="t('guide.publish.summaryPlaceholder')" />
      <text class="section-title">{{ t('guide.publish.contentLabel') }} <text class="required">*</text></text>
      <textarea v-model="form.content" class="textarea content" maxlength="20000" :placeholder="t('guide.publish.contentPlaceholder')" />
      <view class="image-title"><text class="section-title">{{ t('guide.publish.imageLabel') }}</text><text class="image-tip">{{ form.images.length }}/9</text></view>
      <view class="image-grid">
        <view v-for="(image, index) in form.images" :key="image" class="image-item">
          <SafeImage :src="image" mode="aspectFill" />
          <view class="remove" @tap.stop="removeImage(index)">?</view>
          <view class="change" @tap.stop="replaceImage(index)">{{ t('common.edit') }}</view>
          <view v-if="image === form.coverImg" class="cover-label">{{ t('guide.publish.coverLabel') }}</view>
          <view v-else class="set-cover" @tap.stop="form.coverImg = image">{{ t('guide.publish.setCover') }}</view>
        </view>
        <view v-if="form.images.length < 9" class="add-image" @tap="chooseImages"><text>{{ uploading ? t('guide.publish.imageUploading') : '+' }}</text></view>
      </view>
      <view class="private-row" @tap="form.isPrivate = !form.isPrivate">
        <view><text class="private-title">{{ t('guide.publish.privateLabel') }}</text><text class="private-tip">{{ t('guide.publish.privateTip') }}</text></view>
        <switch :checked="form.isPrivate" color="#E8956D" />
      </view>
      <text v-if="isEditing" class="review-tip">{{ t('guide.publish.reviewHint') }}</text>
      <button class="submit-btn" :loading="submitting" @tap="submit">{{ isEditing ? t('guide.publish.submitEdit') : t('guide.publish.submitCreate') }}</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';
.publish-page { min-height: 100vh; padding: 24rpx; background: $color-bg-page; }.form-card { padding: 28rpx; background: #fff; border-radius: 24rpx; box-shadow: 0 5rpx 18rpx rgba(108,71,49,.07); }.section-title { display: block; margin: 22rpx 0 14rpx; color: $color-text-primary; font-size: 28rpx; font-weight: 650; }.required { color: #dd5d4c; }.optional { color: $color-text-hint; font-size: 23rpx; font-weight: 400; }.type-row { display: flex; gap: 18rpx; }.type-option { padding: 16rpx 30rpx; border: 2rpx solid $color-divider; border-radius: 12rpx; color: $color-text-secondary; font-size: 26rpx; }.type-option.active { border-color: $color-primary; color: $color-primary; background: $color-primary-light; }.input, .textarea { box-sizing: border-box; width: 100%; padding: 18rpx 20rpx; border-radius: 12rpx; background: #fffaf6; color: $color-text-primary; font-size: 26rpx; }.input { height: 78rpx; }.textarea { line-height: 1.6; }.summary { height: 150rpx; }.content { height: 500rpx; }.image-title { display: flex; align-items: center; justify-content: space-between; }.image-title .section-title { margin-bottom: 0; }.image-tip { color: $color-text-hint; font-size: 23rpx; }.image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin-top: 16rpx; }.image-item, .add-image { position: relative; height: 190rpx; overflow: hidden; border-radius: 12rpx; }.image-item .safe-image { width: 100%; height: 100%; }.add-image { display: flex; align-items: center; justify-content: center; border: 2rpx dashed #ddbba7; color: $color-primary; background: #fffaf6; font-size: 70rpx; }.change { position: absolute; top: 4rpx; left: 8rpx; padding: 4rpx 12rpx; border-radius: 16rpx; color: #fff; background: rgba(0,0,0,.45); font-size: 20rpx; }.remove { position: absolute; top: 4rpx; right: 8rpx; width: 38rpx; height: 38rpx; border-radius: 50%; text-align: center; line-height: 34rpx; color: #fff; background: rgba(0,0,0,.5); font-size: 30rpx; }.cover-label, .set-cover { position: absolute; right: 0; bottom: 0; left: 0; padding: 6rpx; text-align: center; color: #fff; background: rgba(232,149,109,.85); font-size: 20rpx; }.set-cover { background: rgba(0,0,0,.45); }.private-row { display: flex; align-items: center; justify-content: space-between; margin-top: 32rpx; padding: 20rpx 0; border-top: 2rpx solid $color-divider; }.private-title, .private-tip { display: block; }.private-title { color: $color-text-primary; font-size: 27rpx; }.private-tip { margin-top: 6rpx; color: $color-text-hint; font-size: 22rpx; }.review-tip { display: block; margin-top: 14rpx; color: $color-text-hint; font-size: 22rpx; line-height: 1.5; }.submit-btn { height: 84rpx; margin-top: 26rpx; line-height: 84rpx; border-radius: 42rpx; color: #fff; background: $color-primary; font-size: 29rpx; }
</style>
