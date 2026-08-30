<!-- 攻略详情页 -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { getGuideDetail, toggleGuideLike, deleteMyGuide, setGuidePrivate } from '@/api/guide'
import { getCommentList, postComment, COMMENT_TARGET_TYPE } from '@/api/comment'
import { addFavorite, removeFavorite, checkFavorite, FAVORITE_TYPE } from '@/api/favorites'
import { getUser, isLoggedIn, requireLogin } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'
import { previewImage } from '@/utils/image'

const id = ref(null)
const detail = ref(null)
const comments = ref([])
const commentTotal = ref(0)
const commentText = ref('')
const liked = ref(false)
const favorited = ref(false)
const loading = ref(true)
const loadError = ref(false)

const isOwner = computed(() => {
  const user = getUser()
  return Boolean(user && detail.value && Number(user.userId || user.id) === Number(detail.value.userId))
})
const isAdmin = computed(() => {
  const user = getUser()
  return Boolean(user && (user.role === 2 || user.role === 'admin'))
})
const canEdit = computed(() => isOwner.value && detail.value && detail.value.status !== 1)
const images = computed(() => {
  const value = detail.value?.images
  if (!value) {
    return []
  }
  if (Array.isArray(value)) {
    return value
  }
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

async function loadDetail() {
  if (!id.value) {
    loading.value = false
    loadError.value = true
    return
  }
  loading.value = true
  loadError.value = false
  try {
    detail.value = await getGuideDetail(id.value)
    const result = await getCommentList({
      targetId: id.value,
      targetType: COMMENT_TARGET_TYPE.POST,
      page: 1,
      size: 20,
    })
    comments.value = result?.list || []
    commentTotal.value = result?.total || comments.value.length
    if (isLoggedIn()) {
      try {
        favorited.value = Boolean(await checkFavorite(FAVORITE_TYPE.TRAVEL_GUIDE, id.value))
      } catch {
        favorited.value = false
      }
    }
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function handleLike() {
  if (!requireLogin()) {
    return
  }
  const result = await toggleGuideLike(id.value)
  liked.value = Boolean(result?.liked)
  detail.value.likeCount = Math.max(0, (detail.value.likeCount || 0) + (liked.value ? 1 : -1))
}

async function handleFavorite() {
  if (!requireLogin()) {
    return
  }
  if (favorited.value) {
    await removeFavorite(FAVORITE_TYPE.TRAVEL_GUIDE, id.value)
    favorited.value = false
  } else {
    await addFavorite(FAVORITE_TYPE.TRAVEL_GUIDE, id.value)
    favorited.value = true
  }
  uni.showToast({ title: favorited.value ? '已收藏' : '已取消收藏', icon: 'success' })
}

async function submitComment() {
  if (!requireLogin()) {
    return
  }
  const content = commentText.value.trim()
  if (!content) {
    uni.showToast({ title: '请输入评论内容', icon: 'none' })
    return
  }
  await postComment({ targetId: id.value, targetType: COMMENT_TARGET_TYPE.POST, content })
  commentText.value = ''
  uni.showToast({ title: '评论成功', icon: 'success' })
  await loadComments()
}

async function loadComments() {
  const result = await getCommentList({
    targetId: id.value,
    targetType: COMMENT_TARGET_TYPE.POST,
    page: 1,
    size: 20,
  })
  comments.value = result?.list || []
  commentTotal.value = result?.total || comments.value.length
  if (detail.value) {
    detail.value.commentCount = commentTotal.value
  }
}

function openImages(current) {
  previewImage({ urls: images.value, current })
}

function goEdit() {
  uni.navigateTo({ url: `/pages/guide/publish?id=${id.value}` })
}

function handleDelete() {
  uni.showModal({
    title: '删除攻略',
    content: '删除后将无法恢复，确定要删除吗？',
    success: async result => {
      if (!result.confirm) {
        return
      }
      await deleteMyGuide(id.value)
      uni.showToast({ title: '删除成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 500)
    },
  })
}

async function handlePrivate() {
  const next = Number(detail.value.isPrivate) !== 1
  await setGuidePrivate(id.value, next)
  detail.value.isPrivate = next ? 1 : 0
  uni.showToast({ title: next ? '已设为私密' : '已设为公开', icon: 'success' })
}

function statusText(status) {
  return ({ 0: '草稿', 1: '已发布', 2: '审核中', 3: '已下架' })[status] || '未知状态'
}

onMounted(() => {
  const options = getCurrentPages().slice(-1)[0]?.options || {}
  id.value = options.id
  uni.setNavigationBarTitle({ title: '攻略详情' })
  loadDetail()
})
</script>

<template>
  <view class="detail-page">
    <view v-if="loading" class="state">{{ t('common.loading') }}</view>
    <view v-else-if="loadError" class="state">
      <text>攻略不存在或暂时无法查看</text>
      <button class="back-btn" @tap="uni.navigateBack()">返回上一页</button>
    </view>
    <view v-else-if="detail" class="detail-content">
      <SafeImage class="hero-image" :src="detail.coverImg" mode="aspectFill" />
      <view class="article-card">
        <view class="article-meta">
          <text class="type-tag">{{ detail.postType === 1 ? '官方攻略' : '游客攻略' }}</text>
          <text v-if="isOwner || isAdmin" class="status-tag">{{ statusText(detail.status) }}</text>
          <text v-if="Number(detail.isPrivate) === 1" class="private-tag">🔒 私密</text>
        </view>
        <text class="article-title">{{ detail.displayTitle || detail.title }}</text>
        <text v-if="detail.titleEn" class="article-title-en">{{ detail.titleEn }}</text>
        <view class="author-row">
          <view class="author-avatar"><SafeImage :src="detail.authorAvatar" mode="aspectFill" /></view>
          <text>{{ detail.authorNickname || '沁湖游客' }}</text>
          <text class="author-time">{{ (detail.createTime || '').slice(0, 16) }}</text>
        </view>
        <view class="article-stats">
          <text>👁 {{ detail.viewCount || 0 }}</text>
          <text>♥ {{ detail.likeCount || 0 }}</text>
          <text>💬 {{ detail.commentCount || 0 }}</text>
        </view>
        <rich-text class="rich-content" :nodes="detail.content" />
        <view v-if="images.length" class="image-grid">
          <SafeImage
            v-for="image in images"
            :key="image"
            class="detail-image"
            :src="image"
            mode="aspectFill"
            @tap="openImages(image)"
          />
        </view>
      </view>

      <view v-if="isOwner" class="owner-actions">
        <button v-if="canEdit" class="action-btn action-btn--primary" @tap="goEdit">编辑正文</button>
        <button v-else class="action-btn action-btn--disabled" disabled>已发布内容不可编辑</button>
        <button class="action-btn" @tap="handlePrivate">{{ Number(detail.isPrivate) === 1 ? '设为公开' : '设为私密' }}</button>
        <button class="action-btn action-btn--danger" @tap="handleDelete">删除</button>
      </view>

      <view class="interaction-bar">
        <view :class="{ active: liked }" @tap="handleLike">{{ liked ? '♥' : '♡' }} 点赞</view>
        <view :class="{ active: favorited }" @tap="handleFavorite">{{ favorited ? '★' : '☆' }} 收藏</view>
      </view>

      <view class="comment-card">
        <text class="section-title">评论（{{ commentTotal }}）</text>
        <view v-for="comment in comments" :key="comment.id" class="comment-item">
          <view class="comment-avatar"><SafeImage :src="comment.userAvatar" mode="aspectFill" /></view>
          <view class="comment-main">
            <view><text class="comment-name">{{ comment.userNickname || '游客' }}</text><text class="comment-time">{{ (comment.createTime || '').slice(0, 16) }}</text></view>
            <text class="comment-text">{{ comment.content }}</text>
          </view>
        </view>
        <view v-if="comments.length === 0" class="comment-empty">还没有评论，来留下第一条吧</view>
        <view class="comment-input"><input v-model="commentText" placeholder="说说你的看法..." maxlength="500" /><button @tap="submitComment">发送</button></view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.detail-page { min-height: 100vh; padding-bottom: 40rpx; background: $color-bg-page; }
.state { display: flex; flex-direction: column; align-items: center; padding: 180rpx 0; text-align: center; color: $color-text-secondary; font-size: 27rpx; }
.back-btn { width: 240rpx; height: 70rpx; margin-top: 28rpx; line-height: 70rpx; border-radius: 35rpx; color: #fff; background: $color-primary; font-size: 25rpx; }
.hero-image { width: 100%; height: 420rpx; }
.article-card, .comment-card { margin: -24rpx 24rpx 22rpx; position: relative; padding: 28rpx; background: #fff; border-radius: 24rpx; box-shadow: 0 5rpx 18rpx rgba(108,71,49,.07); }
.article-meta { display: flex; align-items: center; gap: 12rpx; }
.type-tag, .status-tag, .private-tag { padding: 7rpx 14rpx; border-radius: 8rpx; font-size: 22rpx; }
.type-tag { color: $color-primary; background: $color-primary-light; }.status-tag { color: #9b6a28; background: #fff2d9; }.private-tag { color: #806b5d; background: #f4eee8; }
.article-title { display: block; margin-top: 22rpx; color: $color-text-primary; font-size: 42rpx; font-weight: 700; line-height: 1.35; }.article-title-en { display: block; margin-top: 8rpx; color: $color-text-secondary; font-size: 24rpx; }
.author-row { display: flex; align-items: center; gap: 12rpx; margin-top: 24rpx; color: $color-text-primary; font-size: 25rpx; }.author-avatar, .comment-avatar { overflow: hidden; flex: 0 0 54rpx; width: 54rpx; height: 54rpx; border-radius: 50%; }.author-time { margin-left: auto; color: $color-text-hint; font-size: 22rpx; }.article-stats { display: flex; gap: 30rpx; margin: 24rpx 0; color: $color-text-hint; font-size: 23rpx; }
.rich-content { color: $color-text-primary; font-size: 29rpx; line-height: 1.8; word-break: break-word; }.image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 28rpx; }.detail-image { width: 100%; height: 190rpx; }
.owner-actions { margin: 0 24rpx 22rpx; }.action-btn { display: inline-flex; width: 31%; height: 72rpx; align-items: center; justify-content: center; margin: 0 1% 0 0; padding: 0 4rpx; border: 0; border-radius: 14rpx; color: $color-text-secondary; background: #fff; font-size: 23rpx; }.action-btn--primary { color: #fff; background: $color-primary; }.action-btn--disabled { width: 100%; color: $color-text-hint; background: #f1ebe5; }.action-btn--danger { color: #d65c4c; }
.interaction-bar { display: flex; justify-content: space-around; margin: 0 24rpx 22rpx; padding: 26rpx; color: $color-text-secondary; background: #fff; border-radius: 18rpx; }.interaction-bar .active { color: $color-primary; font-weight: 650; }
.comment-card { margin: 0 24rpx; }.section-title { display: block; margin-bottom: 22rpx; color: $color-text-primary; font-size: 30rpx; font-weight: 650; }.comment-item { display: flex; gap: 14rpx; padding: 18rpx 0; border-bottom: 2rpx solid $color-divider; }.comment-main { flex: 1; }.comment-name { color: $color-text-primary; font-size: 25rpx; }.comment-time { margin-left: 14rpx; color: $color-text-hint; font-size: 20rpx; }.comment-text { display: block; margin-top: 10rpx; color: $color-text-secondary; font-size: 25rpx; line-height: 1.5; }.comment-empty { padding: 30rpx 0; text-align: center; color: $color-text-hint; font-size: 24rpx; }.comment-input { display: flex; gap: 12rpx; margin-top: 22rpx; }.comment-input input { flex: 1; height: 72rpx; padding: 0 20rpx; border-radius: 36rpx; background: $color-bg-page; font-size: 24rpx; }.comment-input button { width: 120rpx; height: 72rpx; line-height: 72rpx; padding: 0; border-radius: 36rpx; color: #fff; background: $color-primary; font-size: 24rpx; }
</style>
