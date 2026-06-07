<!--
  餐厅管理页（管理员专用）
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { getAdminRestaurantList, createRestaurant, updateRestaurant, deleteRestaurant } from '@/api/admin'
import { uploadImage } from '@/api/admin'
import { getUser } from '@/utils/auth'
import { t } from '@/utils/i18n'
import SafeImage from '@/components/SafeImage/index.vue'
import { previewImage } from '@/utils/image'

/** 分类选项 */
const CATEGORIES = ['中餐', '西餐', '快餐', '甜品', '小吃', '茶饮', '其他']

/** 状态选项 */
const STATUS_MAP = [
  { value: 1, labelKey: 'admin.restaurant.status.open' },
  { value: 0, labelKey: 'admin.restaurant.status.closed' },
]

/** 搜索关键词 */
const keyword = ref('')
/** 列表数据 */
const list = ref([])
/** 总数 */
const total = ref(0)
/** 加载状态 */
const loading = ref(false)
/** 当前页码 */
const page = ref(1)
/** 每页条数 */
const PAGE_SIZE = 20
/** 是否有更多 */
const hasMore = ref(false)

/** 表单弹窗 */
const showForm = ref(false)
/** 是否编辑模式 */
const isEdit = ref(false)
/** 编辑中的餐厅ID */
const editingId = ref(null)
/** 表单数据 */
const form = ref({
  name: '',
  nameEn: '',
  category: '',
  coverImg: '',
  images: '',
  address: '',
  phone: '',
  businessHours: '',
  avgPrice: '',
  lat: '',
  lng: '',
  tags: '',
  status: 1,
})
/** 上传中的图片列表（临时URL） */
const uploadingImages = ref([])
const uploadingCover = ref(false)
/** 删除确认弹窗 */
const showDeleteConfirm = ref(false)
const deletingId = ref(null)

/**
 * 加载列表
 * @param {boolean} refresh
 */
async function loadList(refresh = false) {
  if (refresh) {
    page.value = 1
    list.value = []
    hasMore.value = false
  }
  loading.value = true
  try {
    const result = await getAdminRestaurantList({
      keyword: keyword.value,
      page: page.value,
      size: PAGE_SIZE,
    })
    total.value = result.total
    if (refresh) {
      list.value = result.list || []
    } else {
      list.value = [...list.value, ...(result.list || [])]
    }
    hasMore.value = list.value.length < total.value
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
 */
function handleSearch() {
  loadList(true)
}

/**
 * 加载更多
 */
function loadMore() {
  if (loading.value || !hasMore.value) return
  page.value++
  loadList(false)
}

/**
 * 打开新增弹窗
 */
function openAdd() {
  isEdit.value = false
  editingId.value = null
  form.value = {
    name: '',
    nameEn: '',
    category: '',
    coverImg: '',
    images: '',
    address: '',
    phone: '',
    businessHours: '',
    avgPrice: '',
    lat: '',
    lng: '',
    tags: '',
    status: 1,
  }
  uploadingImages.value = []
  showForm.value = true
}

/**
 * 打开编辑弹窗
 * @param {Object} item
 */
function openEdit(item) {
  isEdit.value = true
  editingId.value = item.id
  // 解析图片数组
  let imagesArr = []
  if (item.images) {
    try { imagesArr = JSON.parse(item.images) } catch { imagesArr = [] }
  }
  uploadingImages.value = imagesArr
  // 解析 tags 标签
  let tagsStr = ''
  if (item.tags) {
    try { tagsStr = JSON.stringify(JSON.parse(item.tags)) } catch { tagsStr = '' }
  }
  form.value = {
    name: item.name || '',
    nameEn: item.nameEn || '',
    category: item.category || '',
    coverImg: item.coverImg || '',
    images: item.images || '',
    address: item.address || '',
    phone: item.phone || '',
    businessHours: item.businessHours || '',
    avgPrice: item.avgPrice != null ? String(item.avgPrice) : '',
    lat: item.lat != null ? String(item.lat) : '',
    lng: item.lng != null ? String(item.lng) : '',
    tags: tagsStr,
    status: item.status ?? 1,
  }
  showForm.value = true
}

/**
 * 上传封面图
 */
async function handleUploadCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    async success(res) {
      const filePath = res.tempFilePaths[0]
      uploadingCover.value = true
      try {
        const result = await uploadImage(filePath)
        form.value.coverImg = result.url
        uni.showToast({ title: t('admin.restaurant.saveSuccess'), icon: 'success' })
      } catch {
        uni.showToast({ title: t('common.uploadFailed'), icon: 'none' })
      } finally {
        uploadingCover.value = false
      }
    },
  })
}

/**
 * 上传图片集（最多9张）
 */
async function handleUploadImages() {
  const remaining = 9 - uploadingImages.value.length
  if (remaining <= 0) {
    uni.showToast({ title: t('admin.restaurant.imageCountTip', { current: 9 }), icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remaining,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    async success(res) {
      for (const filePath of res.tempFilePaths) {
        try {
          const result = await uploadImage(filePath)
          uploadingImages.value.push(result.url)
        } catch {
          // 单张失败不影响其他
        }
      }
    },
  })
}

/**
 * 删除图片集中的某张
 * @param {number} index
 */
function removeImage(index) {
  uploadingImages.value.splice(index, 1)
}

/**
 * 预览图片
 * @param {string} url
 */
function previewRestaurantImage(url) {
  previewImage({ urls: [url], current: url })
}

/**
 * 验证表单
 */
function validateForm() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: t('admin.restaurant.nameRequired'), icon: 'none' })
    return false
  }
  if (!form.value.category) {
    uni.showToast({ title: t('admin.restaurant.categoryRequired'), icon: 'none' })
    return false
  }
  return true
}

/**
 * 保存（新增或更新）
 */
async function handleSave() {
  if (!validateForm()) return
  // 空字符串转 null，避免 MySQL JSON 列报 "Invalid JSON text: empty"
  const nullIfEmpty = (v) => (v !== null && v !== undefined && v !== '' ? v : null)
  const payload = {
    name: form.value.name,
    nameEn: nullIfEmpty(form.value.nameEn),
    category: form.value.category,
    coverImg: nullIfEmpty(form.value.coverImg),
    images: uploadingImages.value.length > 0 ? JSON.stringify(uploadingImages.value) : null,
    address: nullIfEmpty(form.value.address),
    phone: nullIfEmpty(form.value.phone),
    businessHours: nullIfEmpty(form.value.businessHours),
    avgPrice: form.value.avgPrice ? Number(form.value.avgPrice) : null,
    lat: form.value.lat ? Number(form.value.lat) : null,
    lng: form.value.lng ? Number(form.value.lng) : null,
    tags: form.value.tags ? JSON.stringify(JSON.parse(form.value.tags)) : null,
    status: form.value.status ?? 1,
  }
  if (isEdit.value) {
    payload.id = editingId.value
  }
  try {
    if (isEdit.value) {
      await updateRestaurant(payload)
    } else {
      await createRestaurant(payload)
    }
    uni.showToast({ title: t('admin.restaurant.saveSuccess'), icon: 'success' })
    showForm.value = false
    loadList(true)
  } catch {
    // 错误已在 request.js 中处理
  }
}

/**
 * 打开删除确认
 * @param {number} id
 */
function openDeleteConfirm(id) {
  deletingId.value = id
  showDeleteConfirm.value = true
}

/**
 * 确认删除
 */
async function handleDelete() {
  try {
    await deleteRestaurant(deletingId.value)
    uni.showToast({ title: t('admin.restaurant.deleteSuccess'), icon: 'success' })
    showDeleteConfirm.value = false
    loadList(true)
  } catch {
    // 错误已在 request.js 中处理
  }
}

/**
 * 获取状态标签
 * @param {number} status
 */
function getStatusLabel(status) {
  const item = STATUS_MAP.find(s => s.value === status)
  return item ? t(item.labelKey) : '-'
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('admin.restaurant.title') })
  // 权限检查：非管理员则跳转回首页
  const user = getUser()
  if (!user || user.role !== 2) {
    uni.showToast({ title: t('admin.feedback.noPermission'), icon: 'none' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/rank/index' })
    }, 1000)
    return
  }
  loadList(true)
})
</script>

<template>
  <view class="restaurant-admin-page">
    <!-- 顶部操作栏 -->
    <view class="top-bar">
      <view class="search-wrap">
        <input
          class="search-input"
          v-model="keyword"
          :placeholder="t('admin.restaurant.searchPlaceholder')"
          @confirm="handleSearch"
        />
        <view class="search-btn" @tap="handleSearch">
          <text>🔍</text>
        </view>
      </view>
      <button class="add-btn" @tap="openAdd">{{ t('admin.restaurant.addBtn') }}</button>
    </view>

    <!-- 加载中 -->
    <view v-if="loading && list.length === 0" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 列表 -->
    <view v-else class="list">
      <view v-if="list.length === 0" class="empty">
        <text class="empty__text">{{ t('common.noData') }}</text>
      </view>

      <view v-for="item in list" :key="item.id" class="card">
        <view class="card__header">
          <view class="card__cover-wrap">
            <SafeImage class="card__cover" :src="item.coverImg" mode="aspectFill" />
          </view>
          <view class="card__info">
            <text class="card__name">{{ item.name }}</text>
            <text class="card__category">{{ item.category }}</text>
            <view class="card__meta">
              <text class="card__rating">⭐ {{ (item.rating || 0).toFixed(1) }}</text>
              <text class="card__status" :class="{ 'card__status--closed': item.status === 0 }">
                {{ getStatusLabel(item.status) }}
              </text>
            </view>
          </view>
        </view>
        <view class="card__actions">
          <view class="action-btn action-btn--edit" @tap="openEdit(item)">
            <text>{{ t('admin.restaurant.editBtn') }}</text>
          </view>
          <view class="action-btn action-btn--delete" @tap="openDeleteConfirm(item.id)">
            <text>{{ t('admin.restaurant.deleteBtn') }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @tap="loadMore">
        <text class="load-more__text">{{ t('common.loadMore') }}</text>
      </view>
      <view v-else-if="list.length > 0" class="no-more">
        <text class="no-more__text">{{ t('common.noMore') }}</text>
      </view>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view v-if="showForm" class="form-mask" @tap.self="showForm = false">
      <view class="form-panel">
        <view class="form-panel__header">
          <text class="form-panel__title">
            {{ isEdit ? t('admin.restaurant.formTitle.edit') : t('admin.restaurant.formTitle.add') }}
          </text>
          <view class="form-panel__close" @tap="showForm = false">✕</view>
        </view>

        <scroll-view scroll-y class="form-panel__body">
          <!-- 餐厅名称 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.name') }} *</text>
            <input class="form-item__input" v-model="form.name" :placeholder="t('admin.restaurant.nameRequired')" />
          </view>

          <!-- 英文名称 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.nameEn') }}</text>
            <input class="form-item__input" v-model="form.nameEn" placeholder="English name (optional)" />
          </view>

          <!-- 分类 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.category') }} *</text>
            <view class="category-selector">
              <view
                v-for="cat in CATEGORIES"
                :key="cat"
                class="category-option"
                :class="{ 'category-option--active': form.category === cat }"
                @tap="form.category = cat"
              >
                <text class="category-option__text">{{ cat }}</text>
              </view>
            </view>
          </view>

          <!-- 封面图 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.coverImg') }} *</text>
            <view v-if="form.coverImg" class="cover-preview" @tap="previewRestaurantImage(form.coverImg)">
              <SafeImage class="cover-preview__img" :src="form.coverImg" mode="aspectFill" />
              <view class="cover-preview__change" @tap.stop="handleUploadCover">
                <text>更换</text>
              </view>
            </view>
            <view v-else class="upload-box upload-box--cover" @tap="handleUploadCover">
              <text v-if="uploadingCover" class="upload-box__loading">{{ t('common.uploading') }}</text>
              <text v-else class="upload-box__tip">+ {{ t('admin.restaurant.uploadCover') }}</text>
            </view>
          </view>

          <!-- 图片集 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.images') }}</text>
            <view class="images-grid">
              <view
                v-for="(img, idx) in uploadingImages"
                :key="idx"
                class="images-grid__item"
                @tap="previewRestaurantImage(img)"
              >
                <SafeImage class="images-grid__img" :src="img" mode="aspectFill" />
                <view class="images-grid__remove" @tap.stop="removeImage(idx)">✕</view>
              </view>
              <view v-if="uploadingImages.length < 9" class="images-grid__add" @tap="handleUploadImages">
                <text class="images-grid__add-icon">+</text>
                <text class="images-grid__add-text">{{ t('admin.restaurant.uploadImages') }}</text>
              </view>
            </view>
            <text class="form-item__hint">
              {{ t('admin.restaurant.imageCountTip', { current: uploadingImages.length }) }} · {{ t('admin.restaurant.uploadTip') }}
            </text>
          </view>

          <!-- 地址 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.address') }}</text>
            <input class="form-item__input" v-model="form.address" placeholder="Restaurant address" />
          </view>

          <!-- 电话 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.phone') }}</text>
            <input class="form-item__input" v-model="form.phone" type="tel" placeholder="Phone number" />
          </view>

          <!-- 营业时间 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.businessHours') }}</text>
            <input class="form-item__input" v-model="form.businessHours" placeholder="e.g. 10:00-21:00" />
          </view>

          <!-- 人均价格 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.avgPrice') }} (¥)</text>
            <input class="form-item__input" v-model="form.avgPrice" type="digit" placeholder="e.g. 50" />
          </view>

          <!-- 经纬度 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.latLng') }}</text>
            <view class="latlng-row">
              <input class="form-item__input form-item__input--half" v-model="form.lat" type="digit" placeholder="Latitude" />
              <input class="form-item__input form-item__input--half" v-model="form.lng" type="digit" placeholder="Longitude" />
            </view>
          </view>

          <!-- 状态 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.status') }}</text>
            <view class="status-selector">
              <view
                v-for="s in STATUS_MAP"
                :key="s.value"
                class="status-option"
                :class="{ 'status-option--active': form.status === s.value }"
                @tap="form.status = s.value"
              >
                <text class="status-option__text">{{ t(s.labelKey) }}</text>
              </view>
            </view>
          </view>

          <!-- 标签 -->
          <view class="form-item">
            <text class="form-item__label">{{ t('admin.restaurant.tags') }}</text>
            <input
              class="form-item__input"
              v-model="form.tags"
              :placeholder="t('admin.restaurant.tagsPlaceholder')"
            />
          </view>
        </scroll-view>

        <view class="form-panel__footer">
          <button class="form-btn form-btn--cancel" @tap="showForm = false">{{ t('common.cancel') }}</button>
          <button class="form-btn form-btn--confirm" @tap="handleSave">{{ t('common.confirm') }}</button>
        </view>
      </view>
    </view>

    <!-- 删除确认 -->
    <view v-if="showDeleteConfirm" class="confirm-mask" @tap.self="showDeleteConfirm = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('common.confirm') }}</text>
        <text class="confirm-dialog__content">{{ t('admin.restaurant.deleteConfirm') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--cancel" @tap="showDeleteConfirm = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="confirm-dialog__btn confirm-dialog__btn--confirm" @tap="handleDelete">
            <text>{{ t('admin.restaurant.deleteBtn') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.restaurant-admin-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding: 24rpx;
}

/* ── 顶部操作栏 ── */
.top-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  align-items: center;
}

.search-wrap {
  flex: 1;
  display: flex;
  background-color: $color-bg-card;
  border-radius: 40rpx;
  overflow: hidden;
  border: 2rpx solid $color-divider;
}

.search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: $color-text-primary;
}

.search-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.add-btn {
  height: 72rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
  border-radius: 36rpx;
  border: none;
  line-height: 72rpx;
  white-space: nowrap;
}

/* ── 列表卡片 ── */
.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.card {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__header {
    display: flex;
    gap: 20rpx;
    margin-bottom: 20rpx;
  }

  &__cover-wrap {
    width: 160rpx;
    height: 120rpx;
    border-radius: 12rpx;
    overflow: hidden;
    flex-shrink: 0;
    background-color: $color-divider;
  }

  &__cover {
    width: 100%;
    height: 100%;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8rpx;
  }

  &__name {
    font-size: 30rpx;
    font-weight: 600;
    color: $color-text-primary;
  }

  &__category {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-top: 8rpx;
  }

  &__rating {
    font-size: 24rpx;
    color: $color-rank-gold;
  }

  &__status {
    font-size: 22rpx;
    padding: 4rpx 12rpx;
    border-radius: 20rpx;
    background-color: $color-primary-light;
    color: $color-primary;

    &--closed {
      background-color: rgba(0, 0, 0, 0.06);
      color: $color-text-hint;
    }
  }

  &__actions {
    display: flex;
    gap: 16rpx;
    border-top: 2rpx solid $color-divider;
    padding-top: 16rpx;
  }
}

.action-btn {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 32rpx;
  font-size: 26rpx;
  font-weight: 500;

  &--edit {
    background-color: $color-primary-light;
    color: $color-primary;
  }

  &--delete {
    background-color: rgba(221, 82, 77, 0.1);
    color: $uni-color-error;
  }
}

/* ── 加载更多 ── */
.load-more {
  display: flex;
  justify-content: center;
  padding: 32rpx 0;

  &__text {
    font-size: 26rpx;
    color: $color-primary;
    padding: 12rpx 48rpx;
    border: 2rpx solid $color-primary;
    border-radius: 40rpx;
  }
}

.no-more {
  display: flex;
  justify-content: center;
  padding: 24rpx 0;

  &__text {
    font-size: 24rpx;
    color: $color-text-hint;
  }
}

/* ── 空状态 ── */
.status,
.empty {
  display: flex;
  justify-content: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}

/* ── 表单弹窗 ── */
.form-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.form-panel {
  width: 100%;
  max-height: 90vh;
  background-color: $color-bg-card;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx;
    border-bottom: 2rpx solid $color-divider;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
  }

  &__close {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    color: $color-text-hint;
  }

  &__body {
    flex: 1;
    padding: 24rpx 32rpx;
    max-height: 70vh;
  }

  &__footer {
    display: flex;
    gap: 16rpx;
    padding: 24rpx 32rpx;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    border-top: 2rpx solid $color-divider;
  }
}

.form-item {
  margin-bottom: 28rpx;

  &__label {
    display: block;
    font-size: 26rpx;
    color: $color-text-secondary;
    margin-bottom: 12rpx;
  }

  &__input {
    width: 100%;
    height: 80rpx;
    padding: 0 20rpx;
    background-color: $color-bg-page;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: $color-text-primary;
    box-sizing: border-box;

    &--half {
      flex: 1;
    }
  }

  &__hint {
    display: block;
    font-size: 22rpx;
    color: $color-text-hint;
    margin-top: 8rpx;
  }
}

.latlng-row {
  display: flex;
  gap: 16rpx;
}

.category-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.category-option {
  padding: 10rpx 20rpx;
  border-radius: 20rpx;
  border: 2rpx solid $color-divider;
  background-color: $color-bg-page;

  &__text {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;

    .category-option__text {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

.status-selector {
  display: flex;
  gap: 16rpx;
}

.status-option {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 32rpx;
  border: 2rpx solid $color-divider;
  background-color: $color-bg-page;

  &__text {
    font-size: 26rpx;
    color: $color-text-secondary;
  }

  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;

    .status-option__text {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

.cover-preview {
  position: relative;
  width: 200rpx;
  height: 150rpx;
  border-radius: 12rpx;
  overflow: hidden;

  &__img {
    width: 100%;
    height: 100%;
  }

  &__change {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 48rpx;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 22rpx;
      color: #ffffff;
    }
  }
}

.upload-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  border: 2rpx dashed $color-divider;

  &--cover {
    width: 200rpx;
    height: 150rpx;
  }

  &__tip {
    font-size: 24rpx;
    color: $color-text-hint;
    text-align: center;
  }

  &__loading {
    font-size: 24rpx;
    color: $color-primary;
  }
}

.images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  &__item {
    position: relative;
    width: 150rpx;
    height: 150rpx;
    border-radius: 8rpx;
    overflow: hidden;
  }

  &__img {
    width: 100%;
    height: 100%;
  }

  &__remove {
    position: absolute;
    top: 0;
    right: 0;
    width: 40rpx;
    height: 40rpx;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
    color: #ffffff;
  }

  &__add {
    width: 150rpx;
    height: 150rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: $color-bg-page;
    border-radius: 8rpx;
    border: 2rpx dashed $color-divider;
    gap: 4rpx;
  }

  &__add-icon {
    font-size: 40rpx;
    color: $color-text-hint;
  }

  &__add-text {
    font-size: 20rpx;
    color: $color-text-hint;
    text-align: center;
  }
}

.form-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  line-height: 80rpx;

  &--cancel {
    background-color: $color-bg-page;
    color: $color-text-secondary;
    border: 2rpx solid $color-divider;
  }

  &--confirm {
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
  }
}

/* ── 确认弹窗 ── */
.confirm-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-dialog {
  width: 560rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;

  &__title {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
    text-align: center;
    margin-bottom: 16rpx;
  }

  &__content {
    display: block;
    font-size: 28rpx;
    color: $color-text-secondary;
    text-align: center;
    margin-bottom: 32rpx;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    gap: 16rpx;
  }

  &__btn {
    flex: 1;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 40rpx;
    font-size: 28rpx;
    font-weight: 500;

    &--cancel {
      background-color: $color-bg-page;
      color: $color-text-secondary;
      border: 2rpx solid $color-divider;
    }

    &--confirm {
      background-color: $uni-color-error;
      color: #ffffff;
    }
  }
}
</style>
