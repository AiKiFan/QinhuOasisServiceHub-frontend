<!--
  餐厅列表页 - 支持分类筛选 + 下拉刷新 + 上拉加载更多
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { getRestaurantList } from '@/api/restaurant'
import TabBar from '@/components/TabBar/index.vue'

/** 分类筛选选项 */
const CATEGORIES = ['全部', '中餐', '西餐', '快餐', '甜品', '小吃', '茶饮']

/** 当前选中分类，空字符串代表"全部" */
const activeCategory = ref('')
/** 餐厅列表 */
const restaurantList = ref([])
/** 加载状态 */
const loading = ref(false)
/** 是否加载失败 */
const hasError = ref(false)
/** 当前页码 */
const currentPage = ref(1)
/** 是否还有更多数据 */
const hasMore = ref(true)
/** 总记录数 */
const total = ref(0)

const PAGE_SIZE = 10

/**
 * 加载餐厅列表（重置模式：清空列表从第1页开始）
 */
async function loadList() {
  loading.value = true
  hasError.value = false
  currentPage.value = 1
  try {
    const res = await getRestaurantList(activeCategory.value, 1, PAGE_SIZE)
    restaurantList.value = res.list
    total.value = res.total
    hasMore.value = res.list.length < res.total
  } catch {
    hasError.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多（追加到列表末尾）
 */
async function loadMore() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  const nextPage = currentPage.value + 1
  try {
    const res = await getRestaurantList(activeCategory.value, nextPage, PAGE_SIZE)
    restaurantList.value = [...restaurantList.value, ...res.list]
    currentPage.value = nextPage
    hasMore.value = restaurantList.value.length < res.total
  } catch {
    // 加载更多失败静默处理，保留已有数据
  } finally {
    loading.value = false
  }
}

/**
 * 切换分类，重新加载
 * @param {string} cat
 */
function switchCategory(cat) {
  activeCategory.value = cat === '全部' ? '' : cat
  loadList()
}

/** 下拉刷新 */
function onPullDownRefresh() {
  loadList().finally(() => uni.stopPullDownRefresh())
}

/** 触底加载更多 */
function onReachBottom() {
  loadMore()
}

/**
 * 跳转餐厅详情
 * @param {number} id
 */
function goDetail(id) {
  uni.navigateTo({ url: `/pages/restaurant/detail?id=${id}` })
}

onMounted(loadList)
</script>

<template>
  <view class="list-page">
    <!-- 分类筛选栏 -->
    <view class="list-filter">
      <scroll-view class="list-filter__scroll" scroll-x>
        <view class="list-filter__inner">
          <view
            v-for="cat in CATEGORIES"
            :key="cat"
            class="list-filter__tag"
            :class="{ 'list-filter__tag--active': (cat === '全部' && activeCategory === '') || activeCategory === cat }"
            @tap="switchCategory(cat)"
          >
            {{ cat }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 加载中骨架 -->
    <view v-if="loading && restaurantList.length === 0" class="list-skeleton">
      <view v-for="i in 5" :key="i" class="list-skeleton__item">
        <view class="list-skeleton__img" />
        <view class="list-skeleton__lines">
          <view class="list-skeleton__line list-skeleton__line--title" />
          <view class="list-skeleton__line list-skeleton__line--sub" />
          <view class="list-skeleton__line list-skeleton__line--sub" />
        </view>
      </view>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="hasError" class="list-status">
      <text class="list-status__text">加载失败，请重试</text>
      <button class="list-status__retry-btn" @tap="loadList">重新加载</button>
    </view>

    <!-- 列表 -->
    <view v-else class="list-content">
      <view
        v-for="item in restaurantList"
        :key="item.id"
        class="rest-card"
        @tap="goDetail(item.id)"
      >
        <!-- 封面图 -->
        <image
          class="rest-card__cover"
          :src="item.coverImg"
          mode="aspectFill"
          lazy-load
        />
        <!-- 信息区 -->
        <view class="rest-card__info">
          <text class="rest-card__name">{{ item.displayName }}</text>
          <view class="rest-card__meta">
            <text class="rest-card__category">{{ item.category }}</text>
            <text class="rest-card__hours">{{ item.businessHours }}</text>
          </view>
          <view class="rest-card__bottom">
            <view class="rest-card__rating">
              <text class="rest-card__star">★</text>
              <text class="rest-card__score">{{ item.rating }}</text>
              <text class="rest-card__reviews">（{{ item.reviewCount }}条）</text>
            </view>
            <text class="rest-card__price">¥{{ item.avgPrice }}/人</text>
          </view>
        </view>
      </view>

      <!-- 加载更多区域 -->
      <view class="list-footer">
        <view v-if="loading && restaurantList.length > 0" class="list-footer__loading">
          <text class="list-footer__text">加载中...</text>
        </view>
        <view v-else-if="!hasMore && restaurantList.length > 0" class="list-footer__end">
          <text class="list-footer__text">— 共 {{ total }} 家餐厅 —</text>
        </view>
        <button
          v-else-if="hasMore"
          class="list-footer__more-btn"
          @tap="loadMore"
        >
          加载更多
        </button>
      </view>
    </view>

    <TabBar active="restaurant" />
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.list-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding-bottom: 120rpx;
}

/* ── 分类筛选栏 ── */
.list-filter {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: $color-bg-card;
  border-bottom: 2rpx solid $color-divider;

  &__scroll {
    white-space: nowrap;
  }

  &__inner {
    display: inline-flex;
    padding: 16rpx 24rpx;
    gap: 16rpx;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    height: 56rpx;
    padding: 0 28rpx;
    border-radius: 28rpx;
    background-color: $color-bg-page;
    font-size: 26rpx;
    color: $color-text-secondary;
    white-space: nowrap;
    transition: all 0.2s;

    &--active {
      background-color: $color-primary;
      color: #ffffff;
      font-weight: 600;
    }
  }
}

/* ── 骨架屏 ── */
.list-skeleton {
  padding: 24rpx;

  &__item {
    display: flex;
    background-color: $color-bg-card;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    padding: 20rpx;
    gap: 20rpx;
  }

  &__img {
    flex-shrink: 0;
    width: 160rpx;
    height: 120rpx;
    border-radius: 12rpx;
    background-color: $color-divider;
    animation: skeleton-pulse 1.4s ease-in-out infinite;
  }

  &__lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    padding-top: 8rpx;
  }

  &__line {
    border-radius: 6rpx;
    background-color: $color-divider;
    animation: skeleton-pulse 1.4s ease-in-out infinite;

    &--title {
      height: 32rpx;
      width: 70%;
    }

    &--sub {
      height: 24rpx;
      width: 50%;
    }
  }
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ── 失败状态 ── */
.list-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }

  &__retry-btn {
    margin-top: 32rpx;
    padding: 16rpx 48rpx;
    background-color: $color-primary;
    color: #ffffff;
    font-size: 28rpx;
    border-radius: 40rpx;
    border: none;
    line-height: 1.5;
  }
}

/* ── 餐厅卡片 ── */
.list-content {
  padding: 20rpx 24rpx 0;
}

.rest-card {
  display: flex;
  background-color: $color-bg-card;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(232, 149, 109, 0.08);

  &__cover {
    flex-shrink: 0;
    width: 160rpx;
    height: 140rpx;
    background-color: $color-divider;
  }

  &__info {
    flex: 1;
    min-width: 0;
    padding: 20rpx 24rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  &__name {
    font-size: 30rpx;
    font-weight: 600;
    color: $color-text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__category {
    font-size: 22rpx;
    color: $color-primary;
    background-color: $color-primary-light;
    padding: 4rpx 12rpx;
    border-radius: 20rpx;
  }

  &__hours {
    font-size: 22rpx;
    color: $color-text-hint;
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__rating {
    display: flex;
    align-items: center;
    gap: 4rpx;
  }

  &__star {
    font-size: 24rpx;
    color: $color-rank-gold;
  }

  &__score {
    font-size: 28rpx;
    font-weight: 600;
    color: $color-text-primary;
  }

  &__reviews {
    font-size: 22rpx;
    color: $color-text-hint;
  }

  &__price {
    font-size: 26rpx;
    color: $color-primary;
    font-weight: 600;
  }
}

/* ── 底部区域 ── */
.list-footer {
  padding: 24rpx 0 8rpx;
  display: flex;
  justify-content: center;

  &__text {
    font-size: 24rpx;
    color: $color-text-hint;
  }

  &__loading {
    display: flex;
    justify-content: center;
  }

  &__end {
    display: flex;
    justify-content: center;
  }

  &__more-btn {
    padding: 0 48rpx;
    height: 72rpx;
    background-color: $color-bg-card;
    border: 2rpx solid $color-divider;
    color: $color-text-secondary;
    font-size: 26rpx;
    border-radius: 36rpx;
    line-height: 72rpx;
  }
}
</style>
