<!--
  收藏夹分组管理页
  支持创建、编辑、删除收藏夹分组，管理分组内的收藏
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { t } from '@/utils/i18n'
import {
  getFavoriteFolders,
  createFavoriteFolder,
  updateFavoriteFolder,
  deleteFavoriteFolder,
  getFolderFavorites,
  moveFavoriteToFolder,
  batchMoveFavorites,
  getFavoriteTags,
  createFavoriteTag,
  deleteFavoriteTag,
} from '@/api/favorite-folder'
import { removeFavorite } from '@/api/favorites'

/** 当前选中的标签页 */
const activeTab = ref('folders')
/** 收藏夹分组列表 */
const folders = ref([])
/** 标签列表 */
const tags = ref([])
/** 选中的分组ID */
const selectedFolderId = ref(null)
/** 分组内的收藏列表 */
const folderFavorites = ref([])
/** 加载状态 */
const loading = ref(false)
/** 显示创建分组弹窗 */
const showCreateFolderDialog = ref(false)
/** 显示编辑分组弹窗 */
const showEditFolderDialog = ref(false)
/** 显示创建标签弹窗 */
const showCreateTagDialog = ref(false)
/** 编辑中的分组 */
const editingFolder = ref(null)
/** 新建分组表单 */
const newFolderForm = ref({
  name: '',
  description: '',
  color: '#E8956D',
  icon: '📁',
})
/** 新建标签表单 */
const newTagForm = ref({
  name: '',
  color: '#E8956D',
})
/** 批量选择模式 */
const batchMode = ref(false)
/** 选中的收藏项 */
const selectedFavorites = ref(new Set())
/** 显示移动到分组弹窗 */
const showMoveDialog = ref(false)
/** 目标分组ID */
const targetFolderId = ref(null)

/** 颜色选项 */
const colorOptions = [
  '#E8956D', // 橙色
  '#FFB22C', // 黄色
  '#43A047', // 绿色
  '#2196F3', // 蓝色
  '#9C27B0', // 紫色
  '#E91E63', // 粉色
  '#607D8B', // 灰色
]

/** 图标选项 */
const iconOptions = ['📁', '❤️', '⭐', '🏞️', '🍽️', '🗺️', '📍', '📷']

/** 是否有选中的项 */
const hasSelected = computed(() => selectedFavorites.value.size > 0)

/** 加载收藏夹分组 */
async function loadFolders() {
  loading.value = true
  try {
    const res = await getFavoriteFolders()
    folders.value = res.list || []
  } catch (error) {
  } finally {
    loading.value = false
  }
}

/** 加载标签列表 */
async function loadTags() {
  try {
    const res = await getFavoriteTags()
    tags.value = res.list || []
  } catch (error) {
  }
}

/** 加载分组内的收藏 */
async function loadFolderFavorites(folderId) {
  loading.value = true
  try {
    const res = await getFolderFavorites(folderId)
    folderFavorites.value = res.list || []
  } catch (error) {
  } finally {
    loading.value = false
  }
}

/** 创建分组 */
async function handleCreateFolder() {
  if (!newFolderForm.value.name.trim()) {
    uni.showToast({ title: '请输入分组名称', icon: 'none' })
    return
  }
  try {
    await createFavoriteFolder(newFolderForm.value)
    uni.showToast({ title: '创建成功', icon: 'success' })
    showCreateFolderDialog.value = false
    newFolderForm.value = {
      name: '',
      description: '',
      color: '#E8956D',
      icon: '📁',
    }
    loadFolders()
  } catch (error) {
  }
}

/** 编辑分组 */
async function handleUpdateFolder() {
  if (!editingFolder.value.name.trim()) {
    uni.showToast({ title: '请输入分组名称', icon: 'none' })
    return
  }
  try {
    await updateFavoriteFolder(editingFolder.value.id, {
      name: editingFolder.value.name,
      description: editingFolder.value.description,
      color: editingFolder.value.color,
      icon: editingFolder.value.icon,
    })
    uni.showToast({ title: '更新成功', icon: 'success' })
    showEditFolderDialog.value = false
    editingFolder.value = null
    loadFolders()
  } catch (error) {
  }
}

/** 删除分组 */
function handleDeleteFolder(folder) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除分组"${folder.name}"吗？分组内的收藏将移至默认分组。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteFavoriteFolder(folder.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadFolders()
        } catch (error) {
        }
      }
    },
  })
}

/** 打开编辑分组弹窗 */
function openEditDialog(folder) {
  editingFolder.value = { ...folder }
  showEditFolderDialog.value = true
}

/** 选择分组 */
function selectFolder(folder) {
  selectedFolderId.value = folder.id
  loadFolderFavorites(folder.id)
}

/** 创建标签 */
async function handleCreateTag() {
  if (!newTagForm.value.name.trim()) {
    uni.showToast({ title: '请输入标签名称', icon: 'none' })
    return
  }
  try {
    await createFavoriteTag(newTagForm.value)
    uni.showToast({ title: '创建成功', icon: 'success' })
    showCreateTagDialog.value = false
    newTagForm.value = {
      name: '',
      color: '#E8956D',
    }
    loadTags()
  } catch (error) {
  }
}

/** 删除标签 */
function handleDeleteTag(tag) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除标签"${tag.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteFavoriteTag(tag.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadTags()
        } catch (error) {
        }
      }
    },
  })
}

/** 切换批量选择模式 */
function toggleBatchMode() {
  batchMode.value = !batchMode.value
  selectedFavorites.value.clear()
}

/** 选择/取消选择收藏项 */
function toggleSelectFavorite(id) {
  if (selectedFavorites.value.has(id)) {
    selectedFavorites.value.delete(id)
  } else {
    selectedFavorites.value.add(id)
  }
}

/** 全选 */
function selectAll() {
  folderFavorites.value.forEach(item => {
    selectedFavorites.value.add(item.id)
  })
}

/** 取消全选 */
function deselectAll() {
  selectedFavorites.value.clear()
}

/** 删除选中的收藏 */
async function deleteSelectedFavorites() {
  if (selectedFavorites.value.size === 0) return
  
  uni.showModal({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedFavorites.value.size} 个收藏吗？`,
    success: async (res) => {
      if (res.confirm) {
        for (const id of selectedFavorites.value) {
          const item = folderFavorites.value.find(f => f.id === id)
          if (item) {
            await removeFavorite(item.type, id)
          }
        }
        uni.showToast({ title: '删除成功', icon: 'success' })
        selectedFavorites.value.clear()
        loadFolderFavorites(selectedFolderId.value)
      }
    },
  })
}

/** 显示移动弹窗 */
function showMoveToFolder() {
  if (selectedFavorites.value.size === 0) return
  targetFolderId.value = folders.value[0]?.id || null
  showMoveDialog.value = true
}

/** 移动收藏到分组 */
async function moveToFolder() {
  if (!targetFolderId.value) return
  
  try {
    const ids = Array.from(selectedFavorites.value)
    await batchMoveFavorites(ids, targetFolderId.value)
    uni.showToast({ title: '移动成功', icon: 'success' })
    showMoveDialog.value = false
    selectedFavorites.value.clear()
    loadFolderFavorites(selectedFolderId.value)
  } catch (error) {
  }
}

/** 跳转详情页 */
function goToDetail(item) {
  if (item.type === 'restaurant') {
    uni.navigateTo({ url: `/pages/restaurant/detail?id=${item.id}` })
  } else if (item.type === 'interpreter') {
    uni.navigateTo({ url: `/pages/interpreter/detail?id=${item.id}` })
  } else if (item.type === 'scenic') {
    uni.navigateTo({ url: `/pages/scenic/detail?id=${item.id}` })
  }
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.favoritesFolders.title') })
  loadFolders()
  loadTags()
})
</script>

<template>
  <view class="folders-page">
    <!-- 顶部标签页 -->
    <view class="tabs">
      <view
        class="tab-item"
        :class="{ 'tab-item--active': activeTab === 'folders' }"
        @tap="activeTab = 'folders'"
      >
        <text class="tab-item__text">收藏夹分组</text>
      </view>
      <view
        class="tab-item"
        :class="{ 'tab-item--active': activeTab === 'tags' }"
        @tap="activeTab = 'tags'"
      >
        <text class="tab-item__text">标签管理</text>
      </view>
    </view>

    <!-- 收藏夹分组 -->
    <view v-if="activeTab === 'folders'" class="content">
      <!-- 操作栏 -->
      <view class="action-bar">
        <button class="action-btn" @tap="showCreateFolderDialog = true">
          <text class="action-btn__icon">+</text>
          <text class="action-btn__text">新建分组</text>
        </button>
      </view>

      <!-- 分组列表 -->
      <view v-if="folders.length === 0 && !loading" class="empty">
        <text class="empty__text">暂无分组，点击"新建分组"创建</text>
      </view>

      <view v-else class="folder-list">
        <view
          v-for="folder in folders"
          :key="folder.id"
          class="folder-item"
          :class="{ 'folder-item--active': selectedFolderId === folder.id }"
          @tap="selectFolder(folder)"
        >
          <view class="folder-item__header">
            <view class="folder-item__info">
              <text class="folder-item__icon">{{ folder.icon }}</text>
              <view class="folder-item__details">
                <text class="folder-item__name">{{ folder.name }}</text>
                <text class="folder-item__desc">{{ folder.description || '无描述' }}</text>
              </view>
            </view>
            <view class="folder-item__count">
              <text class="folder-item__count-text">{{ folder.count || 0 }}</text>
            </view>
          </view>
          <view class="folder-item__color-bar" :style="{ backgroundColor: folder.color }"></view>
          <view class="folder-item__actions">
            <text class="folder-item__action" @tap.stop="openEditDialog(folder)">编辑</text>
            <text class="folder-item__action folder-item__action--delete" @tap.stop="handleDeleteFolder(folder)">删除</text>
          </view>
        </view>
      </view>

      <!-- 分组内的收藏 -->
      <view v-if="selectedFolderId" class="folder-content">
        <!-- 分组标题 -->
        <view class="folder-header">
          <text class="folder-header__title">{{ folders.find(f => f.id === selectedFolderId)?.name }}</text>
          <view class="folder-header__actions">
            <text class="folder-header__action" @tap="toggleBatchMode">
              {{ batchMode ? '取消选择' : '批量管理' }}
            </text>
          </view>
        </view>

        <!-- 批量操作栏 -->
        <view v-if="batchMode" class="batch-actions">
          <text class="batch-actions__count">已选择 {{ selectedFavorites.size }} 项</text>
          <view class="batch-actions__buttons">
            <text class="batch-actions__btn" @tap="selectAll">全选</text>
            <text class="batch-actions__btn" @tap="deselectAll">取消</text>
            <text class="batch-actions__btn batch-actions__btn--primary" @tap="showMoveToFolder">移动</text>
            <text class="batch-actions__btn batch-actions__btn--danger" @tap="deleteSelectedFavorites">删除</text>
          </view>
        </view>

        <!-- 收藏列表 -->
        <view v-if="folderFavorites.length === 0 && !loading" class="empty">
          <text class="empty__text">此分组暂无收藏</text>
        </view>

        <view v-else class="favorites-grid">
          <view
            v-for="item in folderFavorites"
            :key="item.id"
            class="favorite-card"
            :class="{ 'favorite-card--selected': batchMode && selectedFavorites.has(item.id) }"
            @tap="batchMode ? toggleSelectFavorite(item.id) : goToDetail(item)"
          >
            <image v-if="!batchMode" class="favorite-card__cover" :src="item.cover" mode="aspectFill" />
            <view v-if="batchMode" class="favorite-card__checkbox">
              <text v-if="selectedFavorites.has(item.id)" class="checkbox-icon">✓</text>
            </view>
            <view class="favorite-card__info">
              <text class="favorite-card__name">{{ item.name }}</text>
              <text class="favorite-card__type">{{ item.type }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 标签管理 -->
    <view v-if="activeTab === 'tags'" class="content">
      <!-- 操作栏 -->
      <view class="action-bar">
        <button class="action-btn" @tap="showCreateTagDialog = true">
          <text class="action-btn__icon">+</text>
          <text class="action-btn__text">新建标签</text>
        </button>
      </view>

      <!-- 标签列表 -->
      <view v-if="tags.length === 0 && !loading" class="empty">
        <text class="empty__text">暂无标签，点击"新建标签"创建</text>
      </view>

      <view v-else class="tag-list">
        <view
          v-for="tag in tags"
          :key="tag.id"
          class="tag-item"
          :style="{ backgroundColor: tag.color + '20', borderColor: tag.color }"
        >
          <text class="tag-item__name" :style="{ color: tag.color }">{{ tag.name }}</text>
          <text class="tag-item__delete" @tap="handleDeleteTag(tag)">×</text>
        </view>
      </view>
    </view>

    <!-- 新建分组弹窗 -->
    <view v-if="showCreateFolderDialog" class="modal-mask" @tap="showCreateFolderDialog = false">
      <view class="modal" @tap.stop>
        <text class="modal__title">新建分组</text>
        <view class="modal__form">
          <view class="form-item">
            <text class="form-item__label">分组名称</text>
            <input class="form-item__input" v-model="newFolderForm.name" placeholder="请输入分组名称" />
          </view>
          <view class="form-item">
            <text class="form-item__label">描述</text>
            <input class="form-item__input" v-model="newFolderForm.description" placeholder="请输入描述（选填）" />
          </view>
          <view class="form-item">
            <text class="form-item__label">图标</text>
            <view class="icon-selector">
              <view
                v-for="icon in iconOptions"
                :key="icon"
                class="icon-option"
                :class="{ 'icon-option--active': newFolderForm.icon === icon }"
                @tap="newFolderForm.icon = icon"
              >
                <text class="icon-option__text">{{ icon }}</text>
              </view>
            </view>
          </view>
          <view class="form-item">
            <text class="form-item__label">颜色</text>
            <view class="color-selector">
              <view
                v-for="color in colorOptions"
                :key="color"
                class="color-option"
                :class="{ 'color-option--active': newFolderForm.color === color }"
                :style="{ backgroundColor: color }"
                @tap="newFolderForm.color = color"
              />
            </view>
          </view>
        </view>
        <view class="modal__actions">
          <button class="modal__btn modal__btn--cancel" @tap="showCreateFolderDialog = false">取消</button>
          <button class="modal__btn modal__btn--confirm" @tap="handleCreateFolder">确定</button>
        </view>
      </view>
    </view>

    <!-- 编辑分组弹窗 -->
    <view v-if="showEditFolderDialog" class="modal-mask" @tap="showEditFolderDialog = false">
      <view class="modal" @tap.stop>
        <text class="modal__title">编辑分组</text>
        <view class="modal__form">
          <view class="form-item">
            <text class="form-item__label">分组名称</text>
            <input class="form-item__input" v-model="editingFolder.name" placeholder="请输入分组名称" />
          </view>
          <view class="form-item">
            <text class="form-item__label">描述</text>
            <input class="form-item__input" v-model="editingFolder.description" placeholder="请输入描述（选填）" />
          </view>
          <view class="form-item">
            <text class="form-item__label">图标</text>
            <view class="icon-selector">
              <view
                v-for="icon in iconOptions"
                :key="icon"
                class="icon-option"
                :class="{ 'icon-option--active': editingFolder.icon === icon }"
                @tap="editingFolder.icon = icon"
              >
                <text class="icon-option__text">{{ icon }}</text>
              </view>
            </view>
          </view>
          <view class="form-item">
            <text class="form-item__label">颜色</text>
            <view class="color-selector">
              <view
                v-for="color in colorOptions"
                :key="color"
                class="color-option"
                :class="{ 'color-option--active': editingFolder.color === color }"
                :style="{ backgroundColor: color }"
                @tap="editingFolder.color = color"
              />
            </view>
          </view>
        </view>
        <view class="modal__actions">
          <button class="modal__btn modal__btn--cancel" @tap="showEditFolderDialog = false">取消</button>
          <button class="modal__btn modal__btn--confirm" @tap="handleUpdateFolder">确定</button>
        </view>
      </view>
    </view>

    <!-- 新建标签弹窗 -->
    <view v-if="showCreateTagDialog" class="modal-mask" @tap="showCreateTagDialog = false">
      <view class="modal" @tap.stop>
        <text class="modal__title">新建标签</text>
        <view class="modal__form">
          <view class="form-item">
            <text class="form-item__label">标签名称</text>
            <input class="form-item__input" v-model="newTagForm.name" placeholder="请输入标签名称" />
          </view>
          <view class="form-item">
            <text class="form-item__label">颜色</text>
            <view class="color-selector">
              <view
                v-for="color in colorOptions"
                :key="color"
                class="color-option"
                :class="{ 'color-option--active': newTagForm.color === color }"
                :style="{ backgroundColor: color }"
                @tap="newTagForm.color = color"
              />
            </view>
          </view>
        </view>
        <view class="modal__actions">
          <button class="modal__btn modal__btn--cancel" @tap="showCreateTagDialog = false">取消</button>
          <button class="modal__btn modal__btn--confirm" @tap="handleCreateTag">确定</button>
        </view>
      </view>
    </view>

    <!-- 移动到分组弹窗 -->
    <view v-if="showMoveDialog" class="modal-mask" @tap="showMoveDialog = false">
      <view class="modal modal--small" @tap.stop>
        <text class="modal__title">移动到分组</text>
        <view class="modal__form">
          <view class="form-item">
            <text class="form-item__label">选择目标分组</text>
            <picker mode="selector" :value="0" :range="folders" range-key="name" @change="e => targetFolderId = folders[e.detail.value].id">
              <view class="picker-text">{{ folders.find(f => f.id === targetFolderId)?.name || '请选择' }}</view>
            </picker>
          </view>
        </view>
        <view class="modal__actions">
          <button class="modal__btn modal__btn--cancel" @tap="showMoveDialog = false">取消</button>
          <button class="modal__btn modal__btn--confirm" @tap="moveToFolder">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.folders-page {
  min-height: 100vh;
  background-color: $color-bg-page;
}

/* ── 标签页 ── */
.tabs {
  display: flex;
  background-color: $color-bg-card;
  border-bottom: 2rpx solid $color-divider;
  padding: 24rpx 32rpx;
  gap: 32rpx;
}

.tab-item {
  position: relative;
  padding-bottom: 16rpx;

  &__text {
    font-size: 30rpx;
    color: $color-text-secondary;
  }

  &--active {
    & .tab-item__text {
      color: $color-primary;
      font-weight: 600;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4rpx;
      background-color: $color-primary;
      border-radius: 2rpx;
    }
  }
}

/* ── 内容区 ── */
.content {
  padding: 24rpx;
}

/* ── 操作栏 ── */
.action-bar {
  margin-bottom: 24rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  width: 100%;
  height: 80rpx;
  background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
  color: #ffffff;
  border-radius: 40rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 500;

  &__icon {
    font-size: 32rpx;
  }

  &__text {
    font-size: 28rpx;
  }
}

/* ── 空状态 ── */
.empty {
  display: flex;
  justify-content: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}

/* ── 分组列表 ── */
.folder-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.folder-item {
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 24rpx;
  position: relative;
  overflow: hidden;

  &--active {
    box-shadow: 0 0 0 4rpx rgba(232, 149, 109, 0.2);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex: 1;
  }

  &__icon {
    font-size: 48rpx;
  }

  &__details {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    flex: 1;
  }

  &__name {
    font-size: 30rpx;
    font-weight: 600;
    color: $color-text-primary;
  }

  &__desc {
    font-size: 22rpx;
    color: $color-text-hint;
  }

  &__count {
    padding: 8rpx 16rpx;
    background-color: $color-bg-page;
    border-radius: 20rpx;

    &-text {
      font-size: 22rpx;
      color: $color-text-secondary;
    }
  }

  &__color-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4rpx;
  }

  &__actions {
    display: flex;
    gap: 24rpx;
    margin-top: 16rpx;
  }

  &__action {
    font-size: 24rpx;
    color: $color-primary;

    &--delete {
      color: #E05252;
    }
  }
}

/* ── 分组内容 ── */
.folder-content {
  margin-top: 32rpx;
}

.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
  }

  &__action {
    font-size: 26rpx;
    color: $color-primary;
  }
}

/* ── 批量操作 ── */
.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background-color: $color-bg-card;
  border-radius: 16rpx;
  margin-bottom: 20rpx;

  &__count {
    font-size: 24rpx;
    color: $color-text-secondary;
  }

  &__buttons {
    display: flex;
    gap: 16rpx;
  }

  &__btn {
    padding: 8rpx 20rpx;
    font-size: 24rpx;
    color: $color-text-secondary;
    background-color: $color-bg-page;
    border-radius: 20rpx;

    &--primary {
      color: #ffffff;
      background-color: $color-primary;
    }

    &--danger {
      color: #ffffff;
      background-color: #E05252;
    }
  }
}

/* ── 收藏网格 ── */
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.favorite-card {
  position: relative;
  background-color: $color-bg-card;
  border-radius: 16rpx;
  overflow: hidden;

  &__cover {
    width: 100%;
    height: 160rpx;
    background-color: $color-divider;
  }

  &__checkbox {
    position: absolute;
    top: 12rpx;
    left: 12rpx;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background-color: $color-bg-page;
    border: 2rpx solid $color-divider;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &--selected {
    & .favorite-card__checkbox {
      background-color: $color-primary;
      border-color: $color-primary;
    }
  }

  .checkbox-icon {
    color: #ffffff;
    font-size: 24rpx;
    font-weight: 600;
  }

  &__info {
    padding: 12rpx;
  }

  &__name {
    display: block;
    font-size: 26rpx;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: 4rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__type {
    display: block;
    font-size: 22rpx;
    color: $color-text-hint;
  }
}

/* ── 标签列表 ── */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  position: relative;
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid;
  display: flex;
  align-items: center;
  gap: 12rpx;

  &__name {
    font-size: 26rpx;
    font-weight: 500;
  }

  &__delete {
    font-size: 32rpx;
    color: $color-text-hint;
    line-height: 1;
  }
}

/* ── 弹窗 ── */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 32rpx;
}

.modal {
  width: 100%;
  max-width: 600rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;

  &--small {
    max-width: 480rpx;
  }

  &__title {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
    text-align: center;
    margin-bottom: 32rpx;
  }

  &__form {
    margin-bottom: 32rpx;
  }

  &__actions {
    display: flex;
    gap: 16rpx;
  }

  &__btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    border: none;
    font-size: 28rpx;
    font-weight: 500;

    &--cancel {
      background-color: $color-bg-page;
      color: $color-text-secondary;
    }

    &--confirm {
      background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
      color: #ffffff;
    }
  }
}

/* ── 表单项 ── */
.form-item {
  margin-bottom: 24rpx;

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
    border: 2rpx solid transparent;
    font-size: 26rpx;
    color: $color-text-primary;

    &:focus {
      border-color: $color-primary;
    }
  }
}

.picker-text {
  height: 80rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: $color-text-primary;
}

/* ── 图标选择器 ── */
.icon-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.icon-option {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-bg-page;
  border-radius: 12rpx;
  border: 2rpx solid transparent;

  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;
  }

  &__text {
    font-size: 36rpx;
  }
}

/* ── 颜色选择器 ── */
.color-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.color-option {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  position: relative;

  &--active::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #ffffff;
    font-size: 24rpx;
    font-weight: 600;
  }
}
</style>