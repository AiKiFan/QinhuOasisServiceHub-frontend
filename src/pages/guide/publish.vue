<!-- 攻略发布页 -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { getGuideDetail, publishGuide, updateMyGuide } from '@/api/guide'
import { uploadImage } from '@/api/admin'
import { getUser, requireLogin } from '@/utils/auth'

const editingId = ref(null)
const form = ref({ postType: 2, title: '', titleEn: '', summary: '', content: '', coverImg: '', images: [], isPrivate: false })
const submitting = ref(false)
const uploading = ref(false)
const isAdmin = computed(() => {
  const user = getUser()
  return Boolean(user && (user.role === 2 || user.role === 'admin'))
})
const isEditing = computed(() => Boolean(editingId.value))
const typeOptions = computed(() => (isAdmin.value
  ? [{ value: 1, label: '官方攻略' }, { value: 2, label: '游客攻略' }]
  : [{ value: 2, label: '游客攻略' }]))

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
  if (detail.status === 1) {
    uni.showToast({ title: '已发布攻略不可编辑', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 600)
  }
}

function chooseImages() {
  if (uploading.value) return
  const remain = 9 - form.value.images.length
  if (remain <= 0) {
    uni.showToast({ title: '最多上传9张图片', icon: 'none' })
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

async function submit() {
  if (!requireLogin()) return
  if (!form.value.title.trim() || !form.value.content.trim()) {
    uni.showToast({ title: '请填写标题和正文', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const payload = { ...form.value, title: form.value.title.trim(), content: form.value.content.trim() }
    const result = isEditing.value ? await updateMyGuide(editingId.value, payload) : await publishGuide(payload)
    uni.showToast({ title: result?.status === 2 ? '已提交，等待审核' : '发布成功', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: `/pages/guide/detail?id=${result.id}` }), 600)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (!requireLogin()) return
  const options = getCurrentPages().slice(-1)[0]?.options || {}
  editingId.value = options.id || null
  uni.setNavigationBarTitle({ title: editingId.value ? '编辑攻略' : '发布攻略' })
  loadEditing()
})
</script>

<template>
  <view class="publish-page">
    <view class="form-card">
      <text class="section-title">攻略类型</text>
      <view class="type-row">
        <view v-for="item in typeOptions" :key="item.value" class="type-option" :class="{ active: form.postType === item.value }" @tap="form.postType = item.value">{{ item.label }}</view>
      </view>
      <text class="section-title">标题 <text class="required">*</text></text>
      <input v-model="form.title" class="input" maxlength="200" placeholder="请输入攻略标题" />
      <text class="section-title">英文标题 <text class="optional">（可选）</text></text>
      <input v-model="form.titleEn" class="input" maxlength="300" placeholder="English title" />
      <text class="section-title">摘要 <text class="optional">（可选）</text></text>
      <textarea v-model="form.summary" class="textarea summary" maxlength="500" placeholder="用一句话介绍这篇攻略" />
      <text class="section-title">正文 <text class="required">*</text></text>
      <textarea v-model="form.content" class="textarea content" maxlength="20000" placeholder="分享你的路线、景点和旅行建议吧" />
      <view class="image-title"><text class="section-title">攻略图片</text><text class="image-tip">{{ form.images.length }}/9</text></view>
      <view class="image-grid">
        <view v-for="(image, index) in form.images" :key="image" class="image-item">
          <SafeImage :src="image" mode="aspectFill" />
          <view class="remove" @tap="removeImage(index)">×</view>
          <view v-if="image === form.coverImg" class="cover-label">封面图</view>
          <view v-else class="set-cover" @tap="form.coverImg = image">设为封面</view>
        </view>
        <view v-if="form.images.length < 9" class="add-image" @tap="chooseImages"><text>{{ uploading ? '上传中...' : '+' }}</text></view>
      </view>
      <view class="private-row" @tap="form.isPrivate = !form.isPrivate">
        <view><text class="private-title">设为私密</text><text class="private-tip">仅自己可见，不会出现在公开攻略列表</text></view>
        <switch :checked="form.isPrivate" color="#E8956D" />
      </view>
      <button class="submit-btn" :loading="submitting" @tap="submit">{{ isEditing ? '保存修改' : '发布攻略' }}</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';
.publish-page { min-height: 100vh; padding: 24rpx; background: $color-bg-page; }.form-card { padding: 28rpx; background: #fff; border-radius: 24rpx; box-shadow: 0 5rpx 18rpx rgba(108,71,49,.07); }.section-title { display: block; margin: 22rpx 0 14rpx; color: $color-text-primary; font-size: 28rpx; font-weight: 650; }.required { color: #dd5d4c; }.optional { color: $color-text-hint; font-size: 23rpx; font-weight: 400; }.type-row { display: flex; gap: 18rpx; }.type-option { padding: 16rpx 30rpx; border: 2rpx solid $color-divider; border-radius: 12rpx; color: $color-text-secondary; font-size: 26rpx; }.type-option.active { border-color: $color-primary; color: $color-primary; background: $color-primary-light; }.input, .textarea { box-sizing: border-box; width: 100%; padding: 18rpx 20rpx; border-radius: 12rpx; background: #fffaf6; color: $color-text-primary; font-size: 26rpx; }.input { height: 78rpx; }.textarea { line-height: 1.6; }.summary { height: 150rpx; }.content { height: 500rpx; }.image-title { display: flex; align-items: center; justify-content: space-between; }.image-title .section-title { margin-bottom: 0; }.image-tip { color: $color-text-hint; font-size: 23rpx; }.image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin-top: 16rpx; }.image-item, .add-image { position: relative; height: 190rpx; overflow: hidden; border-radius: 12rpx; }.image-item .safe-image { width: 100%; height: 100%; }.add-image { display: flex; align-items: center; justify-content: center; border: 2rpx dashed #ddbba7; color: $color-primary; background: #fffaf6; font-size: 70rpx; }.remove { position: absolute; top: 4rpx; right: 8rpx; width: 38rpx; height: 38rpx; border-radius: 50%; text-align: center; line-height: 34rpx; color: #fff; background: rgba(0,0,0,.5); font-size: 30rpx; }.cover-label, .set-cover { position: absolute; right: 0; bottom: 0; left: 0; padding: 6rpx; text-align: center; color: #fff; background: rgba(232,149,109,.85); font-size: 20rpx; }.set-cover { background: rgba(0,0,0,.45); }.private-row { display: flex; align-items: center; justify-content: space-between; margin-top: 32rpx; padding: 20rpx 0; border-top: 2rpx solid $color-divider; }.private-title, .private-tip { display: block; }.private-title { color: $color-text-primary; font-size: 27rpx; }.private-tip { margin-top: 6rpx; color: $color-text-hint; font-size: 22rpx; }.submit-btn { height: 84rpx; margin-top: 26rpx; line-height: 84rpx; border-radius: 42rpx; color: #fff; background: $color-primary; font-size: 29rpx; }
</style>
