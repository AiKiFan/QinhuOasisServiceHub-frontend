<!--
  收藏列表页
  展示用户收藏的餐厅、译员和景点
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAllFavorites, removeFavorite } from '@/api/favorites'
import { t } from '@/utils/i18n'
import { isLoggedIn } from '@/utils/auth'
import TabBar from '@/components/TabBar/index.vue'
import SafeImage from '@/components/SafeImage/index.vue'

/** 收藏类型筛选 */
const filterType = ref('all')

/** 餐厅收藏列表 */
const restaurantFavorites = ref([])
/** 译员收藏列表 */
const interpreterFavorites = ref([])
/** 景点收藏列表 */
const scenicFavorites = ref([])

/** 加载状态 */
const loading = ref(false)

/** 是否删除确认弹窗 */
const showDeleteConfirm = ref(false)
/** 待删除项 */
const itemToDelete = ref(null)
/** 登录引导弹窗 */
const showLoginHint = ref(false)

/** 跳转登录页 */
function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}

/** 筛选标签 */
const filterLabels = computed(() => [
  { key: 'all', label: t('favorites.filter.all') },
  { key: 'restaurant', label: t('favorites.filter.restaurant') },
  { key: 'interpreter', label: t('favorites.filter.interpreter') },
  { key: 'scenic', label: t('favorites.filter.scenic') },
])

/** 总收藏数（用于判断空状态） */
const totalCount = computed(() =>
  restaurantFavorites.value.length +
  interpreterFavorites.value.length +
  scenicFavorites.value.length
)

/**
 * 加载收藏列表
 */
async function loadFavorites() {
  loading.value = true
  try {
    const res = await getAllFavorites()
    restaurantFavorites.value = res.restaurants || []
    interpreterFavorites.value = res.interpreters || []
    scenicFavorites.value = res.scenicSpots || []
  } catch {
    uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
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
async function handleDelete() {
  if (!itemToDelete.value) return
  try {
    await removeFavorite(itemToDelete.value.type, itemToDelete.value.id)
    // 删除成功后重新加载
    await loadFavorites()
    cancelDelete()
    uni.showToast({ title: t('favorites.removed'), icon: 'success' })
  } catch {
    // 错误已在 request.js 中处理
  }
}

/**
 * 跳转详情页
 */
function goToDetail(type, id) {
  if (type === 'restaurant') {
    uni.navigateTo({ url: `/pages/restaurant/detail?id=${id}` })
  } else if (type === 'interpreter') {
    uni.navigateTo({ url: `/pages/interpreter/detail?id=${id}` })
  } else if (type === 'scenic') {
    uni.navigateTo({ url: `/pages/scenic/detail?id=${id}` })
  }
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.favorites.title') })
  if (!isLoggedIn()) {
    showLoginHint.value = true
    return
  }
  loadFavorites()
})
</script>

<template>
  <view class="favorites-page">
    <!-- 筛选标签 -->
    <view class="filter-tabs-wrapper">
      <scroll-view class="filter-tabs" scroll-x enable-flex scroll-with-animation>
        <view
          v-for="tab in filterLabels"
          :key="tab.key"
          class="filter-tab"
          :class="{ 'filter-tab--active': filterType === tab.key }"
          @tap="switchFilter(tab.key)"
        >
          <text class="filter-tab__text">{{ tab.label }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading">
      <text class="loading__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="totalCount === 0" class="empty">
      <text class="empty__text">{{ t('favorites.empty') }}</text>
      <button class="empty__btn" @tap="() => uni.reLaunch({ url: '/pages/index/index' })">
        {{ t('favorites.goBrowse') }}
      </button>
    </view>

    <!-- 收藏列表 -->
    <view v-else class="favorites-list">
      <!-- 餐厅卡片 -->
      <view
        v-for="item in (filterType === 'all' || filterType === 'restaurant') ? restaurantFavorites : []"
        :key="item.id"
        class="favorite-card restaurant-card"
        @tap="goToDetail('restaurant', item.id)"
      >
        <SafeImage
          class="favorite-card__cover"
          :src="item.coverImg"
          mode="aspectFill"
        />
        <view class="favorite-card__info">
          <text class="favorite-card__name">{{ item.displayName }}</text>
          <text class="favorite-card__category">{{ item.category }}</text>
          <view class="favorite-card__meta">
            <text class="favorite-card__rating">★ {{ item.rating }}</text>
            <text class="favorite-card__price">¥{{ item.avgPrice }}/人</text>
          </view>
        </view>
        <view class="favorite-card__actions" @tap.stop="confirmDelete({ type: 'restaurant', id: item.id })">
          <text class="favorite-card__delete">🗑</text>
        </view>
      </view>

      <!-- 译员卡片 -->
      <view
        v-for="item in (filterType === 'all' || filterType === 'interpreter') ? interpreterFavorites : []"
        :key="item.id"
        class="favorite-card interpreter-card"
        @tap="goToDetail('interpreter', item.id)"
      >
        <SafeImage
          class="favorite-card__avatar"
          :src="item.avatar"
          mode="aspectFill"
        />
        <view class="favorite-card__info">
          <text class="favorite-card__name">{{ item.realName || item.nickname }}</text>
          <text class="favorite-card__school">{{ item.school }}</text>
          <view class="favorite-card__meta">
            <text class="favorite-card__rating">★ {{ item.rating }}</text>
            <text class="favorite-card__price">¥{{ item.hourlyRate }}/小时</text>
          </view>
        </view>
        <view class="favorite-card__actions" @tap.stop="confirmDelete({ type: 'interpreter', id: item.id })">
          <text class="favorite-card__delete">🗑</text>
        </view>
      </view>

      <!-- 景点卡片 -->
      <view
        v-for="item in (filterType === 'all' || filterType === 'scenic') ? scenicFavorites : []"
        :key="item.id"
        class="favorite-card scenic-card"
        @tap="goToDetail('scenic', item.id)"
      >
        <SafeImage
          class="favorite-card__cover"
          :src="item.coverImg"
          mode="aspectFill"
        />
        <view class="favorite-card__info">
          <text class="favorite-card__name">{{ item.displayName }}</text>
          <text class="favorite-card__category">{{ item.openingHours || '' }}</text>
          <view class="favorite-card__meta">
            <text class="favorite-card__rating">★ {{ item.rating }}</text>
            <text class="favorite-card__price">{{ item.ticketPrice === 0 ? t('scenic.free') : '¥' + item.ticketPrice }}</text>
          </view>
        </view>
        <view class="favorite-card__actions" @tap.stop="confirmDelete({ type: 'scenic', id: item.id })">
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

    <!-- 登录引导弹窗 -->
    <view v-if="showLoginHint" class="login-overlay" @tap.self="showLoginHint = false">
      <view class="login-dialog" @tap.stop>
        <view class="login-dialog__icon">!</view>
        <text class="login-dialog__title">{{ t('common.loginRequired') }}</text>
        <text class="login-dialog__msg">{{ t('favorites.loginRequired') }}</text>
        <view class="login-dialog__btn login-dialog__btn--primary" @tap="goLogin">{{ t('auth.login') }}</view>
        <view class="login-dialog__btn login-dialog__btn--cancel" @tap="showLoginHint = false">{{ t('common.cancel') }}</view>
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
.filter-tabs-wrapper {
  background-color: $color-bg-card;
  border-bottom: 2rpx solid $color-divider;
  padding: 20rpx 0;
}

.filter-tabs {
  display: flex;
  padding: 0 24rpx;
  white-space: nowrap;

  /* 隐藏滚动条但保持滚动功能 */
  &::-webkit-scrollbar {
    display: none;
  }
}

.filter-tab {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  border: 1rpx solid transparent;
  margin-right: 12rpx;
  flex-shrink: 0;

  &:last-child {
    margin-right: 0;
  }

  &__text {
    font-size: 26rpx;
    color: $color-text-secondary;
    white-space: nowrap;
    line-height: 1.4;
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

/* ── 加载状态 ── */
.loading {
  display: flex;
  justify-content: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
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
  align-items: flex-start;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  /* 左侧图片/头像 */
  .favorite-card__cover,
  .favorite-card__avatar {
    flex-shrink: 0;
    border-radius: 12rpx;
    margin-right: 16rpx;
  }

  .favorite-card__cover {
    width: 140rpx;
    height: 100rpx;
  }

  .favorite-card__avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
  }

  /* 中间信息区 */
  .favorite-card__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  .favorite-card__name {
    font-size: 30rpx;
    font-weight: 600;
    color: $color-text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .favorite-card__category,
  .favorite-card__school {
    font-size: 22rpx;
    color: $color-text-hint;
  }

  .favorite-card__meta {
    display: flex;
    gap: 16rpx;
    align-items: center;
  }

  .favorite-card__rating {
    font-size: 24rpx;
    color: $color-rank-gold;
  }

  .favorite-card__price {
    font-size: 22rpx;
    color: $color-primary;
    font-weight: 500;
  }

  /* 右侧删除按钮 */
  .favorite-card__actions {
    flex-shrink: 0;
    margin-left: 12rpx;
    display: flex;
    align-items: center;
  }

  .favorite-card__delete {
    font-size: 40rpx;
    color: $color-text-hint;
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

/* ── 登录引导弹窗 ── */
.login-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 32rpx;
}

.login-dialog {
  width: 100%;
  max-width: 600rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  padding: 60rpx 32rpx 48rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  text-align: center;

  &__icon {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%);
    color: #fff;
    font-size: 48rpx;
    font-weight: 700;
    line-height: 100rpx;
    text-align: center;
    margin: 0 auto 24rpx;
  }

  &__title {
    display: block;
    font-size: 34rpx;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: 12rpx;
  }

  &__msg {
    display: block;
    font-size: 26rpx;
    color: $color-text-secondary;
    line-height: 1.5;
    margin-bottom: 36rpx;
  }

  &__btn {
    display: block;
    width: 100%;
    height: 80rpx;
    border-radius: 40rpx;
    border: none;
    font-size: 28rpx;
    font-weight: 600;
    line-height: 80rpx;
    text-align: center;
    margin-top: 8rpx;

    &--primary {
      background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
      color: #ffffff;
    }

    &--cancel {
      background-color: $color-bg-page;
      color: $color-text-secondary;
    }
  }
}
</style>