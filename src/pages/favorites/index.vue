<!--
  收藏列表页
  展示用户收藏的餐厅和译员
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAllFavorites, removeFavorite, FAVORITE_TYPE } from '@/utils/favorites'
import { t } from '@/utils/i18n'
import TabBar from '@/components/TabBar/index.vue'
import SafeImage from '@/components/SafeImage/index.vue'

/** 收藏类型筛选 */
const filterType = ref('all')

/** 收藏列表 */
const favorites = ref([])

/** 加载状态 */
const loading = ref(false)

/** 是否删除确认弹窗 */
const showDeleteConfirm = ref(false)
/** 待删除项 */
const itemToDelete = ref(null)

/** 收藏列表（按类型筛选） */
const filteredFavorites = computed(() => {
  if (filterType.value === 'all') {
    return favorites.value
  }
  return favorites.value.filter(item => item.type === filterType.value)
})

/** 筛选标签 */
const filterLabels = computed(() => [
  { key: 'all', label: t('favorites.filter.all') },
  { key: FAVORITE_TYPE.RESTAURANT, label: t('favorites.filter.restaurant') },
  { key: FAVORITE_TYPE.INTERPRETER, label: t('favorites.filter.interpreter') },
  { key: FAVORITE_TYPE.SCENIC, label: '景点' },
])

/**
 * 加载收藏列表
 */
function loadFavorites() {
  loading.value = true
  try {
    favorites.value = getAllFavorites()
  } finally {
    loading.value = false
  }
}

/**
 * 切换筛选类型
 */
function switchFilter(type) {
  filterType.value = type
}

/**
 * 确认删除
 */
function confirmDelete(item) {
  itemToDelete.value = item
  showDeleteConfirm.value = true
}

/**
 * 取消删除
 */
function cancelDelete() {
  itemToDelete.value = null
  showDeleteConfirm.value = false
}

/**
 * 执行删除
 */
function handleDelete() {
  if (!itemToDelete.value) return
  removeFavorite(itemToDelete.value.id, itemToDelete.value.type)
  loadFavorites()
  cancelDelete()
  uni.showToast({ title: t('favorites.removed'), icon: 'success' })
}

/**
 * 跳转详情页
 */
function goToDetail(item) {
  if (item.type === FAVORITE_TYPE.RESTAURANT) {
    uni.navigateTo({ url: `/pages/restaurant/detail?id=${item.id}` })
  } else if (item.type === FAVORITE_TYPE.INTERPRETER) {
    uni.navigateTo({ url: `/pages/interpreter/detail?id=${item.id}` })
  } else if (item.type === FAVORITE_TYPE.SCENIC) {
    uni.navigateTo({ url: `/pages/scenic/detail?id=${item.id}` })
  }
}

onMounted(loadFavorites)
</script>

<template>
  <view class="favorites-page">
    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view
        v-for="tab in filterLabels"
        :key="tab.key"
        class="filter-tab"
        :class="{ 'filter-tab--active': filterType === tab.key }"
        @tap="switchFilter(tab.key)"
      >
        <text class="filter-tab__text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && filteredFavorites.length === 0" class="empty">
      <text class="empty__text">{{ t('favorites.empty') }}</text>
      <button class="empty__btn" @tap="() => uni.navigateBack()">{{ t('favorites.goBrowse') }}</button>
    </view>

    <!-- 收藏列表 -->
    <view v-else class="favorites-list">
      <!-- 餐厅卡片 -->
      <view
        v-for="item in filteredFavorites.filter(i => i.type === FAVORITE_TYPE.RESTAURANT)"
        :key="item.key"
        class="favorite-card restaurant-card"
        @tap="goToDetail(item)"
      >
        <SafeImage
          class="favorite-card__cover"
          :src="item.data.coverImg"
          mode="aspectFill"
        />
        <view class="favorite-card__info">
          <text class="favorite-card__name">{{ item.data.displayName }}</text>
          <text class="favorite-card__category">{{ item.data.category }}</text>
          <view class="favorite-card__meta">
            <text class="favorite-card__rating">★ {{ item.data.rating }}</text>
            <text class="favorite-card__price">¥{{ item.data.avgPrice }}/人</text>
          </view>
        </view>
        <view class="favorite-card__actions" @tap.stop="confirmDelete(item)">
          <text class="favorite-card__delete">🗑</text>
        </view>
      </view>

      <!-- 译员卡片 -->
      <view
        v-for="item in filteredFavorites.filter(i => i.type === FAVORITE_TYPE.INTERPRETER)"
        :key="item.key"
        class="favorite-card interpreter-card"
        @tap="goToDetail(item)"
      >
        <SafeImage
          class="favorite-card__avatar"
          :src="item.data.avatar"
          mode="aspectFill"
        />
        <view class="favorite-card__info">
          <text class="favorite-card__name">{{ item.data.realName || item.data.nickname }}</text>
          <text class="favorite-card__school">{{ item.data.school }}</text>
          <view class="favorite-card__meta">
            <text class="favorite-card__rating">★ {{ item.data.rating }}</text>
            <text class="favorite-card__price">¥{{ item.data.hourlyRate }}/小时</text>
          </view>
        </view>
        <view class="favorite-card__actions" @tap.stop="confirmDelete(item)">
          <text class="favorite-card__delete">🗑</text>
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <view v-if="showDeleteConfirm" class="modal-mask" @tap="cancelDelete">
      <view class="modal" @tap.stop>
        <text class="modal__title">{{ t('favorites.deleteConfirmTitle') }}</text>
        <text class="modal__content">{{ t('favorites.deleteConfirmContent') }}</text>
        <view class="modal__actions">
          <button class="modal__btn modal__btn--cancel" @tap="cancelDelete">
            {{ t('common.cancel') }}
          </button>
          <button class="modal__btn modal__btn--confirm" @tap="handleDelete">
            {{ t('common.confirm') }}
          </button>
        </view>
      </view>
    </view>

    <TabBar active="favorites" />
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.favorites-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding-bottom: 120rpx;
}

/* ── 筛选标签 ── */
.filter-tabs {
  display: flex;
  padding: 24rpx 32rpx;
  gap: 16rpx;
  border-bottom: 2rpx solid $color-divider;
  background-color: $color-bg-card;
}

.filter-tab {
  padding: 16rpx 32rpx;
  border-radius: 32rpx;
  border: 2rpx solid transparent;

  &__text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;

    & .filter-tab__text {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

/* ── 空状态 ── */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
    margin-bottom: 32rpx;
  }

  &__btn {
    padding: 16rpx 48rpx;
    background-color: $color-primary;
    color: #ffffff;
    font-size: 28rpx;
    border-radius: 40rpx;
    border: none;
  }
}

/* ── 收藏列表 ── */
.favorites-list {
  padding: 24rpx;
}

.favorite-card {
  display: flex;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
  position: relative;

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__name {
    font-size: 30rpx;
    font-weight: 600;
    color: $color-text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__category,
  &__school {
    font-size: 22rpx;
    color: $color-text-hint;
  }

  &__meta {
    display: flex;
    gap: 16rpx;
  }

  &__rating {
    font-size: 24rpx;
    color: $color-rank-gold;
  }

  &__price {
    font-size: 22rpx;
    color: $color-primary;
    font-weight: 500;
  }

  &__actions {
    flex-shrink: 0;
    margin-left: 12rpx;
  }

  &__delete {
    font-size: 40rpx;
    color: $color-text-hint;
  }
}

/* 餐厅卡片样式 */
.favorite-card.restaurant-card {
  &__cover {
    flex-shrink: 0;
    width: 140rpx;
    height: 100rpx;
    border-radius: 12rpx;
    margin-right: 16rpx;
  }
}

/* 译员卡片样式 */
.favorite-card.interpreter-card {
  &__avatar {
    flex-shrink: 0;
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    margin-right: 16rpx;
  }
}

/* ── 删除确认弹窗 ── */
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
}

.modal {
  width: 560rpx;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  padding: 40rpx 32rpx;

  &__title {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
    text-align: center;
    margin-bottom: 20rpx;
  }

  &__content {
    display: block;
    font-size: 26rpx;
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
    height: 72rpx;
    font-size: 28rpx;
    border-radius: 36rpx;
    border: none;

    &--cancel {
      background-color: $color-bg-page;
      color: $color-text-primary;
    }

    &--confirm {
      background-color: $color-primary;
      color: #ffffff;
    }
  }
}
</style>