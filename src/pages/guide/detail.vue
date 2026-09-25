<!-- 攻略详情页 -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getGuideDetail, toggleGuideLike, getGuideLikeStatus, deleteMyGuide, setGuidePrivate } from '@/api/guide'
import { getCommentList, postComment, deleteComment, COMMENT_TARGET_TYPE } from '@/api/comment'
import { addFavorite, removeFavorite, checkFavorite, FAVORITE_TYPE } from '@/api/favorites'
import { getUser, isLoggedIn, requireLogin } from '@/utils/auth'
import { getLanguage, t } from '@/utils/i18n'
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
const showDeleteConfirm = ref(false)
const currentLang = ref(getLanguage())
const replyTarget = ref(null)
const submittingComment = ref(false)
const deletingCommentId = ref(null)
const expandedCommentIds = ref(new Set())
const currentUserId = computed(() => {
  const user = getUser()
  return Number(user?.userId || user?.id || 0)
})

const isOwner = computed(() => {
  const user = getUser()
  return Boolean(user && detail.value && Number(user.userId || user.id) === Number(detail.value.userId))
})
const isAdmin = computed(() => {
  const user = getUser()
  return Boolean(user && (user.role === 2 || user.role === 'admin'))
})
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

function refreshLanguage() {
  currentLang.value = getLanguage()
  uni.setNavigationBarTitle({ title: t('guide.detail.title') })
}

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
    if (isLoggedIn()) {
      const [likeState, favoriteState] = await Promise.allSettled([
        getGuideLikeStatus(id.value),
        checkFavorite(FAVORITE_TYPE.TRAVEL_GUIDE, id.value),
      ])
      liked.value = likeState.status === 'fulfilled' && Boolean(likeState.value?.liked)
      favorited.value = favoriteState.status === 'fulfilled' && Boolean(favoriteState.value)
    } else {
      liked.value = false
      favorited.value = false
    }
    await loadComments()
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
  const previousLiked = liked.value
  liked.value = !previousLiked
  detail.value.likeCount = Math.max(0, (detail.value.likeCount || 0) + (liked.value ? 1 : -1))
  try {
    const result = await toggleGuideLike(id.value)
    liked.value = Boolean(result?.liked)
    await loadDetail()
  } catch {
    liked.value = previousLiked
    detail.value.likeCount = Math.max(0, (detail.value.likeCount || 0) + (previousLiked ? 1 : -1))
  }
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
  uni.showToast({ title: favorited.value ? t('guide.detail.favoriteAdded') : t('guide.detail.favoriteRemoved'), icon: 'success' })
}

async function submitComment() {
  if (!requireLogin()) {
    return
  }
  const content = commentText.value.trim()
  if (!content) {
    uni.showToast({ title: t('guide.detail.commentEmptyInput'), icon: 'none' })
    return
  }
  if (submittingComment.value) return
  submittingComment.value = true
  try {
    await postComment({
      targetId: id.value,
      targetType: COMMENT_TARGET_TYPE.POST,
      content,
      parentId: replyTarget.value?.id || null,
      replyToUserId: replyTarget.value?.userId || null,
    })
    commentText.value = ''
    replyTarget.value = null
    uni.showToast({ title: t('guide.detail.commentSuccess'), icon: 'success' })
    await loadComments()
  } finally {
    submittingComment.value = false
  }
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

function startReply(comment) {
  replyTarget.value = comment
}

function visibleReplies(comment) {
  const replies = comment.replies || []
  return expandedCommentIds.value.has(comment.id) ? replies : replies.slice(0, 2)
}

function toggleReplies(comment) {
  const next = new Set(expandedCommentIds.value)
  if (next.has(comment.id)) next.delete(comment.id)
  else next.add(comment.id)
  expandedCommentIds.value = next
}

function cancelReply() {
  replyTarget.value = null
}

async function removeComment(comment) {
  if (deletingCommentId.value) return
  deletingCommentId.value = comment.id
  try {
    await deleteComment(comment.id)
    uni.showToast({ title: t('guide.detail.commentDeleted'), icon: 'success' })
    await loadComments()
  } finally {
    deletingCommentId.value = null
  }
}

function commentTime(value) {
  return (value || '').slice(0, 16)
}

function statusClass(status) {
  return `status-tag--${status}`
}

function openImages(current) {
  previewImage({ urls: images.value, current })
}

function goEdit() {
  uni.navigateTo({ url: `/pages/guide/publish?id=${id.value}` })
}

function goBack() {
  uni.navigateBack()
}

function openDeleteConfirm() {
  showDeleteConfirm.value = true
}

async function handleDelete() {
  try {
    await deleteMyGuide(id.value)
    showDeleteConfirm.value = false
    uni.showToast({ title: t('guide.detail.deleteSuccess'), icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch {
    showDeleteConfirm.value = false
  }
}

async function handlePrivate() {
  const next = Number(detail.value.isPrivate) !== 1
  await setGuidePrivate(id.value, next)
  detail.value.isPrivate = next ? 1 : 0
  uni.showToast({ title: next ? t('guide.detail.privateSuccessPrivate') : t('guide.detail.privateSuccessPublic'), icon: 'success' })
}

function statusText(status) {
  return ({
    0: t('guide.detail.status.draft'),
    1: t('guide.detail.status.published'),
    2: t('guide.detail.status.reviewing'),
    3: t('guide.detail.status.takenDown'),
  })[status] || t('guide.detail.status.unknown')
}

function typeText(type) {
  return type === 1 ? t('guide.detail.official') : t('guide.detail.tourist')
}

onMounted(() => {
  const options = getCurrentPages().slice(-1)[0]?.options || {}
  id.value = options.id
  uni.setNavigationBarTitle({ title: t('guide.detail.title') })
  loadDetail()
})

onShow(() => {
  refreshLanguage()
})
</script>

<template>
  <view class="detail-page" :data-lang="currentLang">
    <view v-if="loading" class="state">{{ t('common.loading') }}</view>
    <view v-else-if="loadError" class="state">
      <text>{{ t('guide.detail.notFound') }}</text>
      <button class="back-btn" @tap="goBack">{{ t('guide.detail.back') }}</button>
    </view>
    <view v-else-if="detail" class="detail-content">
      <SafeImage class="hero-image" :src="detail.coverImg" mode="aspectFill" />
      <view class="article-card">
        <view class="article-meta">
          <text class="type-tag">{{ typeText(detail.postType) }}</text>
          <text v-if="isOwner || isAdmin" class="status-tag" :class="statusClass(detail.status)">{{ statusText(detail.status) }}</text>
          <text v-if="Number(detail.isPrivate) === 1" class="private-tag">🔒 {{ t('guide.detail.privatePrivate') }}</text>
        </view>
        <text class="article-title">{{ detail.displayTitle || detail.title }}</text>
        <text v-if="detail.titleEn" class="article-title-en">{{ detail.titleEn }}</text>
        <view class="author-row">
          <view class="author-avatar"><SafeImage :src="detail.authorAvatar" mode="aspectFill" /></view>
          <text>{{ detail.authorNickname || t('guide.detail.authorFallback') }}</text>
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
        <button class="action-btn action-btn--primary" @tap="goEdit">{{ t('guide.detail.edit') }}</button>
        <button class="action-btn" @tap="handlePrivate">{{ Number(detail.isPrivate) === 1 ? t('guide.detail.privatePublic') : t('guide.detail.privatePrivate') }}</button>
        <button class="action-btn action-btn--danger" @tap="openDeleteConfirm">{{ t('guide.detail.delete') }}</button>
        <text v-if="Number(detail.status) === 1" class="edit-tip">{{ t('guide.detail.editHint') }}</text>
      </view>

      <view class="interaction-bar">
        <view :class="{ active: liked }" @tap="handleLike">{{ liked ? '♥' : '♡' }} {{ t('guide.detail.like') }}</view>
        <view :class="{ active: favorited }" @tap="handleFavorite">{{ favorited ? '★' : '☆' }} {{ t('guide.detail.favorite') }}</view>
      </view>

      <view class="comment-card">
        <text class="section-title">{{ t('guide.detail.commentTitle', { count: commentTotal }) }}</text>
        <view v-for="comment in comments" :key="comment.id" class="comment-thread">
          <view class="comment-item">
          <view class="comment-avatar"><SafeImage :src="comment.userAvatar" mode="aspectFill" /></view>
          <view class="comment-main">
            <view>
              <text class="comment-name">{{ comment.userNickname || t('guide.detail.authorFallback') }}</text>
              <text v-if="comment.replyToNickname" class="reply-to">{{ t('guide.detail.replyTo', { name: comment.replyToNickname }) }}</text>
              <text class="comment-time">{{ commentTime(comment.createTime) }}</text>
            </view>
            <text class="comment-text">{{ comment.content }}</text>
            <view class="comment-actions">
              <text @tap="startReply(comment)">{{ t('guide.detail.reply') }}</text>
              <text v-if="Number(comment.userId) === currentUserId" class="comment-delete" @tap="removeComment(comment)">{{ t('guide.detail.commentDelete') }}</text>
            </view>
          </view>
          </view>
          <view v-for="reply in visibleReplies(comment)" :key="reply.id" class="comment-item comment-item--reply">
            <view class="comment-avatar"><SafeImage :src="reply.userAvatar" mode="aspectFill" /></view>
            <view class="comment-main">
              <view>
                <text class="comment-name">{{ reply.userNickname || t('guide.detail.authorFallback') }}</text>
                <text v-if="reply.replyToNickname" class="reply-to">{{ t('guide.detail.replyTo', { name: reply.replyToNickname }) }}</text>
                <text class="comment-time">{{ commentTime(reply.createTime) }}</text>
              </view>
              <text class="comment-text">{{ reply.content }}</text>
              <view class="comment-actions">
                <text @tap="startReply(reply)">{{ t('guide.detail.reply') }}</text>
                <text v-if="Number(reply.userId) === currentUserId" class="comment-delete" @tap="removeComment(reply)">{{ t('guide.detail.commentDelete') }}</text>
              </view>
            </view>
          </view>
          <view v-if="(comment.replies || []).length > 2" class="reply-toggle" @tap="toggleReplies(comment)">
            {{ expandedCommentIds.has(comment.id) ? t('guide.detail.collapseReplies') : t('guide.detail.moreReplies', { count: comment.replies.length - 2 }) }}
          </view>
        </view>
        <view v-if="comments.length === 0" class="comment-empty">{{ t('guide.detail.commentEmpty') }}</view>
        <view class="comment-input">
          <view v-if="replyTarget" class="replying-to">
            <text>{{ t('guide.detail.replyingTo', { name: replyTarget.userNickname || t('guide.detail.authorFallback') }) }}</text>
            <text class="reply-cancel" @tap="cancelReply">×</text>
          </view>
          <input v-model="commentText" :placeholder="replyTarget ? t('guide.detail.replyPlaceholder') : t('guide.detail.commentPlaceholder')" maxlength="500" />
          <button :disabled="submittingComment" @tap="submitComment">{{ t('guide.detail.commentSend') }}</button>
        </view>
      </view>
    </view>

    <!-- 删除确认 -->
    <view v-if="showDeleteConfirm" class="confirm-mask" @tap.self="showDeleteConfirm = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('guide.detail.deleteTitle') }}</text>
        <text class="confirm-dialog__content">{{ t('guide.detail.deleteContent') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--cancel" @tap="showDeleteConfirm = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="confirm-dialog__btn confirm-dialog__btn--confirm" @tap="handleDelete">
            <text>{{ t('guide.detail.delete') }}</text>
          </view>
        </view>
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
.type-tag { color: $color-primary; background: $color-primary-light; }.status-tag { color: #526173; background: #edf1f5; }.status-tag--0 { color: #526173; background: #edf1f5; }.status-tag--1 { color: #237a55; background: #e5f5ec; }.status-tag--2 { color: #9b6a28; background: #fff2d9; }.status-tag--3 { color: #b24943; background: #fde9e7; }.private-tag { color: #806b5d; background: #f4eee8; }
.article-title { display: block; margin-top: 22rpx; color: $color-text-primary; font-size: 42rpx; font-weight: 700; line-height: 1.35; }.article-title-en { display: block; margin-top: 8rpx; color: $color-text-secondary; font-size: 24rpx; }
.author-row { display: flex; align-items: center; gap: 12rpx; margin-top: 24rpx; color: $color-text-primary; font-size: 25rpx; }.author-avatar, .comment-avatar { overflow: hidden; flex: 0 0 54rpx; width: 54rpx; height: 54rpx; border-radius: 50%; }.author-time { margin-left: auto; color: $color-text-hint; font-size: 22rpx; }.article-stats { display: flex; gap: 30rpx; margin: 24rpx 0; color: $color-text-hint; font-size: 23rpx; }
.rich-content { color: $color-text-primary; font-size: 29rpx; line-height: 1.8; word-break: break-word; }.image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 28rpx; }.detail-image { width: 100%; height: 190rpx; }
.owner-actions { margin: 0 24rpx 22rpx; display: flex; flex-wrap: wrap; gap: 14rpx; }.action-btn { flex: 1; min-width: 0; height: 72rpx; padding: 0 12rpx; border: 0; border-radius: 14rpx; color: $color-text-secondary; background: #fff; font-size: 23rpx; }.action-btn--primary { color: #fff; background: $color-primary; }.action-btn--danger { color: #d65c4c; background: #fff7f5; }.edit-tip { display: block; width: 100%; margin-top: 4rpx; color: $color-text-hint; font-size: 21rpx; line-height: 1.4; }
.interaction-bar { display: flex; justify-content: space-around; margin: 0 24rpx 22rpx; padding: 26rpx; color: $color-text-secondary; background: #fff; border-radius: 18rpx; }.interaction-bar .active { color: $color-primary; font-weight: 650; }
.comment-card { margin: 0 24rpx; }.section-title { display: block; margin-bottom: 22rpx; color: $color-text-primary; font-size: 30rpx; font-weight: 650; }.comment-thread { border-bottom: 2rpx solid $color-divider; }.comment-item { display: flex; gap: 14rpx; padding: 18rpx 0; }.comment-item--reply { margin-left: 58rpx; padding-top: 10rpx; border-bottom: 0; }.comment-main { flex: 1; min-width: 0; }.comment-name { color: $color-text-primary; font-size: 25rpx; }.reply-to { margin-left: 8rpx; color: $color-text-hint; font-size: 21rpx; }.comment-time { margin-left: 14rpx; color: $color-text-hint; font-size: 20rpx; }.comment-text { display: block; margin-top: 10rpx; color: $color-text-secondary; font-size: 25rpx; line-height: 1.5; word-break: break-word; }.comment-actions { display: flex; gap: 24rpx; margin-top: 12rpx; color: $color-primary; font-size: 22rpx; }.comment-delete { color: #c85a4c; }.reply-toggle { margin: 0 0 16rpx 58rpx; color: $color-primary; font-size: 22rpx; }.comment-empty { padding: 30rpx 0; text-align: center; color: $color-text-hint; font-size: 24rpx; }.comment-input { position: relative; display: flex; gap: 12rpx; margin-top: 22rpx; }.comment-input input { flex: 1; min-width: 0; height: 72rpx; padding: 0 20rpx; border-radius: 36rpx; background: $color-bg-page; font-size: 24rpx; }.comment-input button { flex: 0 0 120rpx; width: 120rpx; height: 72rpx; line-height: 72rpx; padding: 0; border-radius: 36rpx; color: #fff; background: $color-primary; font-size: 24rpx; }.comment-input button[disabled] { opacity: .6; }.replying-to { position: absolute; bottom: 82rpx; left: 12rpx; display: flex; align-items: center; gap: 10rpx; color: $color-text-hint; font-size: 22rpx; }.reply-cancel { color: $color-primary; font-size: 30rpx; }

/* 删除确认弹窗 */
.confirm-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
}

.confirm-dialog {
  width: 560rpx;
  padding: 40rpx 32rpx;
  overflow: hidden;
  background-color: $color-bg-card;
  border-radius: 24rpx;

  &__title {
    display: block;
    margin-bottom: 16rpx;
    color: $color-text-primary;
    font-size: 32rpx;
    font-weight: 600;
    text-align: center;
  }

  &__content {
    display: block;
    margin-bottom: 32rpx;
    color: $color-text-secondary;
    font-size: 28rpx;
    line-height: 1.5;
    text-align: center;
  }

  &__actions {
    display: flex;
    gap: 16rpx;
  }

  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    font-weight: 500;

    &--cancel {
      color: $color-text-secondary;
      background-color: $color-bg-page;
      border: 2rpx solid $color-divider;
    }

    &--confirm {
      color: #ffffff;
      background-color: $uni-color-error;
    }
  }
}
</style>
