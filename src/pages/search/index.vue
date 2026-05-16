<!--
  搜索页面
  支持餐厅、译员、景点搜索 + 搜索建议
  @author AiKiFan
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { searchRestaurants, searchInterpreters } from '@/api/search'
import { searchScenicSpots } from '@/api/scenic'
import { getLanguage, t } from '@/utils/i18n'
import TabBar from '@/components/TabBar/index.vue'
import SafeImage from '@/components/SafeImage/index.vue'

/** 搜索类型 */
const SEARCH_TYPES = {
  ALL: 'all',
  RESTAURANT: 'restaurant',
  INTERPRETER: 'interpreter',
  SCENIC: 'scenic',
}

/** 餐厅分类中英文映射（双向匹配） */
const CATEGORY_MAP = {
  // 英文 → 中文
  'chinese food': '中餐',
  'chinese': '中餐',
  'chinese cuisine': '中餐',
  'western food': '西餐',
  'western': '西餐',
  'western cuisine': '西餐',
  'cafe': '咖啡',
  'coffee': '咖啡',
  'dessert': '甜品',
  'desserts': '甜品',
  'sweets': '甜品',
  'hotpot': '火锅',
  'bbq': '烧烤',
  'noodles': '面馆',
  'noodle': '面馆',
  'seafood': '海鲜',
  'vegetarian': '素食',
  'fast food': '快餐',
  'japanese': '日料',
  'japanese food': '日料',
  'korean': '韩餐',
  'korean food': '韩餐',
  'buffet': '自助餐',
  // 中文 → 英文
  '中餐': 'Chinese Food',
  '西餐': 'Western Food',
  '咖啡': 'Coffee',
  '甜品': 'Dessert',
  '火锅': 'Hotpot',
  '烧烤': 'BBQ',
  '面馆': 'Noodles',
  '海鲜': 'Seafood',
  '素食': 'Vegetarian',
  '快餐': 'Fast Food',
  '日料': 'Japanese',
  '韩餐': 'Korean',
  '自助餐': 'Buffet',
}

/**
 * 检查关键词是否与分类标签匹配（支持中英文互查）
 * 例如搜 "Chinese Food" 能匹配 "中餐"，搜 "中餐" 也能匹配
 */
function categoryMatch(category, keyword) {
  if (!category) return false
  const cat = category.toLowerCase()
  const kw = keyword.toLowerCase().trim()
  // 直接匹配
  if (cat.includes(kw)) return true
  // 通过映射表互查
  const mappedCat = CATEGORY_MAP[cat]
  const mappedKw = CATEGORY_MAP[kw]
  if (mappedCat && mappedCat.toLowerCase().includes(kw)) return true
  if (mappedKw && mappedKw.toLowerCase().includes(cat)) return true
  if (mappedCat && mappedKw && mappedCat === mappedKw) return true
  return false
}

/** 当前搜索类型 */
const searchType = ref(SEARCH_TYPES.ALL)
/** 搜索关键词 */
const keyword = ref('')
/** 搜索历史 */
const searchHistory = ref([])
/** 热门搜索关键词（根据语言返回对应版本） */
const hotSearchKeywords = computed(() => {
  return getLanguage() === 'en-US'
    ? ['Chinese Food', 'Western Food', 'Personal Guide', 'Coffee', 'Dessert']
    : ['中餐', '西餐', '个人译员', '咖啡', '甜品']
})
/** 搜索建议 */
const suggestions = ref([])
/** 是否显示搜索建议 */
const showSuggestions = ref(false)
/** 加载状态 */
const loading = ref(false)
/** 是否加载失败 */
const hasError = ref(false)
/** 搜索结果 */
const searchResults = ref([])
/** 搜索总数 */
const searchTotal = ref(0)
/** 当前页码 */
const currentPage = ref(1)
/** 每页条数 */
const PAGE_SIZE = 10
/** 是否还有更多 */
const hasMore = ref(true)
/** 是否正在加载更多 */
const loadingMore = ref(false)

/** 搜索类型标签 */
const typeLabels = computed(() => [
  { key: SEARCH_TYPES.ALL, label: t('search.type.all') },
  { key: SEARCH_TYPES.RESTAURANT, label: t('search.type.restaurant') },
  { key: SEARCH_TYPES.INTERPRETER, label: t('search.type.interpreter') },
  { key: SEARCH_TYPES.SCENIC, label: t('search.type.scenic') },
])

/** 验证餐厅结果是否匹配关键词 */
function isValidRestaurantResult(item, keyword) {
  return categoryMatch(item.category, keyword) ||
         (item.displayName && item.displayName.toLowerCase().includes(keyword.toLowerCase()))
}

/** 验证译员结果是否匹配关键词 */
function isValidInterpreterResult(item, keyword) {
  const kw = keyword.toLowerCase()
  return (item.realName && item.realName.toLowerCase().includes(kw)) ||
         (item.nickname && item.nickname.toLowerCase().includes(kw)) ||
         (item.school && item.school.toLowerCase().includes(kw))
}

/** 验证景点结果是否匹配关键词 */
function isValidScenicResult(item, keyword) {
  const kw = keyword.toLowerCase()
  return (item.displayName && item.displayName.toLowerCase().includes(kw)) ||
         (item.name && item.name.toLowerCase().includes(kw)) ||
         (item.address && item.address.toLowerCase().includes(kw)) ||
         (item.desc && item.desc.toLowerCase().includes(kw))
}

/** 加载搜索历史 */
function loadSearchHistory() {
  try {
    searchHistory.value = uni.getStorageSync('search_history') || []
  } catch {
    searchHistory.value = []
  }
}

/** 保存搜索历史 */
function saveSearchHistory(word) {
  if (!word || !word.trim()) return
  const history = [word, ...searchHistory.value.filter(h => h !== word)].slice(0, 10)
  uni.setStorageSync('search_history', history)
  searchHistory.value = history
}

/** 切换搜索类型 */
function switchType(type) {
  searchType.value = type
  if (keyword.value.trim()) performSearch(true)
}

/** 执行搜索 */
async function performSearch(refresh = true) {
  const word = keyword.value.trim()
  if (!word) { searchResults.value = []; return }

  if (refresh) {
    currentPage.value = 1
    searchResults.value = []
    hasMore.value = true
    loading.value = true
  } else {
    loadingMore.value = true
  }
  hasError.value = false

  try {
    let result
    if (searchType.value === SEARCH_TYPES.RESTAURANT) {
      const res = await searchRestaurants(word, currentPage.value, PAGE_SIZE).catch(() => ({ list: [] }))
      const filtered = (res.list || [])
        .filter(item => isValidRestaurantResult(item, word))
        .map(item => ({ ...item, type: SEARCH_TYPES.RESTAURANT }))
      result = { list: filtered, total: filtered.length }
    } else if (searchType.value === SEARCH_TYPES.INTERPRETER) {
      const res = await searchInterpreters(word, currentPage.value, PAGE_SIZE).catch(() => ({ list: [] }))
      const filtered = (res.list || [])
        .filter(item => isValidInterpreterResult(item, word))
        .map(item => ({ ...item, type: SEARCH_TYPES.INTERPRETER }))
      result = { list: filtered, total: filtered.length }
    } else if (searchType.value === SEARCH_TYPES.SCENIC) {
      const res = await searchScenicSpots(word, currentPage.value, PAGE_SIZE).catch(() => ({ list: [] }))
      const filtered = (res.list || [])
        .filter(item => isValidScenicResult(item, word))
        .map(item => ({ ...item, type: SEARCH_TYPES.SCENIC }))
      result = { list: filtered, total: filtered.length }
    } else {
      // 并行搜索所有类型，用try-catch包裹避免单个失败影响全部
      const [rRes, iRes, sRes] = await Promise.all([
        searchRestaurants(word, currentPage.value, PAGE_SIZE).catch(() => ({ list: [] })),
        searchInterpreters(word, currentPage.value, PAGE_SIZE).catch(() => ({ list: [] })),
        searchScenicSpots(word, currentPage.value, PAGE_SIZE).catch(() => ({ list: [] })),
      ])
      const rItems = (rRes.list || [])
        .filter(item => isValidRestaurantResult(item, word))
        .map(i => ({ ...i, type: SEARCH_TYPES.RESTAURANT }))
      const iItems = (iRes.list || [])
        .filter(item => isValidInterpreterResult(item, word))
        .map(i => ({ ...i, type: SEARCH_TYPES.INTERPRETER }))
      const sItems = (sRes.list || [])
        .filter(item => isValidScenicResult(item, word))
        .map(i => ({ ...i, type: SEARCH_TYPES.SCENIC }))
      const items = [...rItems, ...iItems, ...sItems]
      result = { list: items, total: items.length }
    }

    searchTotal.value = result.total
    searchResults.value = refresh ? result.list : [...searchResults.value, ...result.list]
    if (word) saveSearchHistory(word)
    hasMore.value = searchResults.value.length < searchTotal.value
  } catch {
    hasError.value = true
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

/** 加载更多 */
function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  currentPage.value++
  performSearch(false)
}

/** 点击历史标签 */
function searchHistoryWord(word) {
  keyword.value = word
  suggestions.value = []
  showSuggestions.value = false
  performSearch(true)
}

/** 跳转详情 */
function goToDetail(item) {
  if (item.type === SEARCH_TYPES.RESTAURANT) {
    uni.navigateTo({ url: `/pages/restaurant/detail?id=${item.id}` })
  } else if (item.type === SEARCH_TYPES.INTERPRETER) {
    uni.navigateTo({ url: `/pages/interpreter/detail?id=${item.id}` })
  } else if (item.type === SEARCH_TYPES.SCENIC) {
    uni.navigateTo({ url: `/pages/scenic/detail?id=${item.id}` })
  }
}

/** 搜索建议 */
function updateSuggestions(value) {
  if (!value || !value.trim()) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }
  const allKeywords = [...hotSearchKeywords.value, ...searchHistory.value]
  // 去重：使用 Set 去除重复词汇
  const uniqueKeywords = Array.from(new Set(allKeywords))
  const filtered = uniqueKeywords.filter(k => k.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
  suggestions.value = filtered
  showSuggestions.value = filtered.length > 0
}

/** 选择建议 */
function selectSuggestion(word) {
  keyword.value = word
  suggestions.value = []
  showSuggestions.value = false
  performSearch(true)
}

/** 是否显示清空确认弹窗 */
const showClearConfirm = ref(false)

/** 删除单条搜索历史 */
function removeHistoryWord(word) {
  const history = searchHistory.value.filter(h => h !== word)
  uni.setStorageSync('search_history', history)
  searchHistory.value = history
}

/** 清空全部搜索历史 */
function clearAllHistory() {
  showClearConfirm.value = true
}

/** 确认清空 */
function confirmClearHistory() {
  uni.removeStorageSync('search_history')
  searchHistory.value = []
  showClearConfirm.value = false
}

/** 搜索按钮点击 */
function handleSearch() {
  suggestions.value = []
  showSuggestions.value = false
  performSearch(true)
}

/** 清空搜索 */
function clearSearch() {
  keyword.value = ''
  searchResults.value = []
  searchTotal.value = 0
  suggestions.value = []
  showSuggestions.value = false
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.search.title') })
  loadSearchHistory()
})
</script>

<template>
  <view class="search-page">
    <!-- 搜索类型筛选 -->
    <view class="type-filter-wrapper">
      <scroll-view class="type-filter" scroll-x enable-flex scroll-with-animation>
        <view
          v-for="type in typeLabels"
          :key="type.key"
          class="type-item"
          :class="{ 'type-item--active': searchType === type.key }"
          @tap="switchType(type.key)"
        >
          <text class="type-item__text">{{ type.label }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 搜索框 -->
    <view class="search-bar">
      <view class="search-bar__input-wrap">
        <text class="search-bar__icon">🔍</text>
        <input
          class="search-bar__input"
          v-model="keyword"
          :placeholder="t('search.placeholder')"
          placeholder-class="search-placeholder"
          confirm-type="search"
          @confirm="handleSearch"
          @input="updateSuggestions(keyword)"
          @focus="updateSuggestions(keyword)"
        />
        <text v-if="keyword" class="search-bar__clear" @tap="clearSearch">✕</text>
      </view>
    </view>

    <!-- 搜索建议 -->
    <view v-if="showSuggestions && keyword && !loading && searchResults.length === 0" class="suggestions-section">
      <view
        v-for="word in suggestions"
        :key="word"
        class="suggestion-item"
        @tap="selectSuggestion(word)"
      >
        <text class="suggestion-item__icon">🔍</text>
        <text class="suggestion-item__text">{{ word }}</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading && searchResults.length === 0" class="status">
      <text class="status__text">{{ t('common.loading') }}</text>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="hasError" class="status">
      <text class="status__text">{{ t('common.loadFailed') }}</text>
      <button class="status__retry-btn" @tap="performSearch(true)">{{ t('common.retry') }}</button>
    </view>

    <!-- 热门搜索 -->
    <view v-if="!keyword && searchResults.length === 0 && !showSuggestions" class="hot-section">
      <text class="hot-title">🔥 {{ t('search.hotSearch') }}</text>
      <view class="hot-list">
        <view v-for="word in hotSearchKeywords" :key="word" class="hot-item" @tap="searchHistoryWord(word)">
          <text class="hot-item__icon">🔍</text>
          <text class="hot-item__text">{{ word }}</text>
        </view>
      </view>
    </view>

    <!-- 搜索历史 -->
    <view v-if="!keyword && searchHistory.length > 0 && searchResults.length === 0 && !showSuggestions" class="history-section">
      <view class="history-header">
        <text class="history-title">{{ t('search.history') }}</text>
        <text class="history-clear" @tap="clearAllHistory">{{ t('search.clearAll') }}</text>
      </view>
      <view class="history-list">
        <view v-for="word in searchHistory" :key="word" class="history-item">
          <text class="history-item__text" @tap="searchHistoryWord(word)">{{ word }}</text>
          <text class="history-item__delete" @tap.stop="removeHistoryWord(word)">✕</text>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-else-if="searchResults.length > 0" class="result-list">
      <!-- 餐厅卡片 -->
      <template v-for="item in searchResults.filter(i => i.type === 'restaurant')" :key="item.id">
        <view class="restaurant-card" @tap="goToDetail(item)">
          <SafeImage class="restaurant-card__cover" :src="item.coverImg" mode="aspectFill" />
          <view class="restaurant-card__info">
            <text class="restaurant-card__name">{{ item.displayName }}</text>
            <view class="restaurant-card__meta">
              <text class="restaurant-card__category">{{ item.category }}</text>
              <text class="restaurant-card__rating">★ {{ item.rating }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 译员卡片 -->
      <template v-for="item in searchResults.filter(i => i.type === 'interpreter')" :key="item.id">
        <view class="interpreter-card" @tap="goToDetail(item)">
          <SafeImage class="interpreter-card__avatar" :src="item.avatar" mode="aspectFill" />
          <view class="interpreter-card__info">
            <text class="interpreter-card__name">{{ item.realName || item.nickname }}</text>
            <text class="interpreter-card__school">{{ item.school }}</text>
            <view class="interpreter-card__meta">
              <text class="interpreter-card__rating">★ {{ item.rating }}</text>
              <text class="interpreter-card__price">¥{{ item.hourlyRate }}/小时</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 景点卡片 -->
      <template v-for="item in searchResults.filter(i => i.type === 'scenic')" :key="item.id">
        <view class="scenic-card" @tap="goToDetail(item)">
          <SafeImage class="scenic-card__cover" :src="item.coverImg" mode="aspectFill" />
          <view class="scenic-card__info">
            <text class="scenic-card__name">{{ item.displayName || item.name }}</text>
            <text class="scenic-card__desc">{{ item.openingHours || item.address || '' }}</text>
            <view class="scenic-card__meta">
              <text class="scenic-card__rating">★ {{ item.rating }}</text>
              <text class="scenic-card__price">{{ item.ticketPrice === 0 ? t('scenic.free') : '¥' + item.ticketPrice }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @tap="loadMore">
        <text class="load-more__text">{{ loadingMore ? t('common.loading') : t('common.loadMore') }}</text>
      </view>
      <view v-else class="no-more">
        <text class="no-more__text">{{ t('common.noMore') }}</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && !hasError && keyword && searchResults.length === 0 && !showSuggestions" class="empty">
      <text class="empty__text">{{ t('search.noResults') }}</text>
    </view>

    <TabBar active="search" />

    <!-- 自定义清空确认弹窗 -->
    <view v-if="showClearConfirm" class="confirm-mask" @tap.self="showClearConfirm = false">
      <view class="confirm-dialog">
        <text class="confirm-dialog__title">{{ t('search.clearHistoryTitle') }}</text>
        <text class="confirm-dialog__content">{{ t('search.clearHistoryConfirm') }}</text>
        <view class="confirm-dialog__actions">
          <view class="confirm-dialog__btn confirm-dialog__btn--cancel" @tap="showClearConfirm = false">
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view class="confirm-dialog__btn confirm-dialog__btn--confirm" @tap="confirmClearHistory">
            <text>{{ t('search.clearAll') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.search-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding-bottom: 120rpx;
}

/* ── 类型筛选 ── */
.type-filter-wrapper {
  background-color: $color-bg-card;
  border-bottom: 2rpx solid $color-divider;
  padding: 20rpx 0;
}

.type-filter {
  display: flex;
  padding: 0 24rpx;
  white-space: nowrap;

  /* 隐藏滚动条但保持滚动功能 */
  &::-webkit-scrollbar {
    display: none;
  }
}

.type-item {
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

    & .type-item__text {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

/* ── 搜索框 ── */
.search-bar {
  padding: 24rpx 32rpx;
  background-color: $color-bg-card;
  border-bottom: 2rpx solid $color-divider;

  &__input-wrap {
    display: flex;
    align-items: center;
    background-color: $color-bg-page;
    border-radius: 44rpx;
    padding: 0 24rpx;
    gap: 12rpx;
  }

  &__icon { font-size: 32rpx; }

  &__input { flex: 1; height: 72rpx; font-size: 28rpx; }

  &__clear { font-size: 32rpx; color: $color-text-hint; padding: 8rpx; }
}

.search-placeholder { color: $color-text-hint; }

/* ── 搜索建议 ── */
.suggestions-section { background-color: $color-bg-card; }
.suggestion-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid $color-divider;
  &__icon { font-size: 26rpx; color: $color-text-hint; }
  &__text { font-size: 26rpx; color: $color-text-primary; }
}

/* ── 状态占位 ── */
.status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;

  &__text { font-size: 28rpx; color: $color-text-hint; }

  &__retry-btn {
    margin-top: 32rpx;
    padding: 16rpx 48rpx;
    background-color: $color-primary;
    color: #ffffff;
    font-size: 28rpx;
    border-radius: 40rpx;
    border: none;
  }
}

.empty {
  display: flex;
  justify-content: center;
  padding-top: 120rpx;
  &__text { font-size: 28rpx; color: $color-text-hint; }
}

/* ── 热门搜索 ── */
.hot-section { padding: 32rpx; }
.hot-title {
  display: block;
  font-size: 24rpx;
  color: $color-text-hint;
  margin-bottom: 16rpx;
}
.hot-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.hot-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 20rpx;
  background-color: $color-bg-card;
  border-radius: 32rpx;
  border: 2rpx solid $color-divider;
  &__icon { font-size: 22rpx; }
  &__text { font-size: 26rpx; color: $color-text-secondary; }
}

/* ── 搜索历史 ── */
.history-section { padding: 32rpx; }
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.history-title {
  font-size: 24rpx;
  color: $color-text-hint;
  font-weight: 500;
}
.history-clear {
  font-size: 22rpx;
  color: $color-text-hint;
  padding: 4rpx 12rpx;
  border: 1rpx solid $color-divider;
  border-radius: 20rpx;
}
.history-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
.history-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background-color: $color-bg-card;
  border-radius: 32rpx;
  border: 2rpx solid $color-divider;

  &__text { font-size: 26rpx; color: $color-text-secondary; }
  &__delete { font-size: 20rpx; color: $color-text-hint; padding-left: 4rpx; }
}

/* ── 自定义确认弹窗 ── */
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

    &--cancel {
      color: $color-text-secondary;
      border-right: 2rpx solid $color-divider;
    }

    &--confirm {
      color: #E05252;
      font-weight: 600;
    }
  }
}

/* ── 搜索结果 ── */
.result-list { padding: 24rpx; }

/* 餐厅卡片 */
.restaurant-card {
  display: flex;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__cover {
    flex-shrink: 0;
    width: 140rpx;
    height: 100rpx;
    border-radius: 12rpx;
    margin-right: 16rpx;
  }

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

  &__meta { display: flex; gap: 16rpx; }

  &__category {
    font-size: 22rpx;
    color: $color-primary;
    background-color: $color-primary-light;
    padding: 4rpx 12rpx;
    border-radius: 16rpx;
  }

  &__rating { font-size: 24rpx; color: $color-rank-gold; }
}

/* 译员卡片 */
.interpreter-card {
  display: flex;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);

  &__avatar {
    flex-shrink: 0;
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    margin-right: 16rpx;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__name { font-size: 28rpx; font-weight: 600; color: $color-text-primary; }
  &__school { font-size: 22rpx; color: $color-text-hint; }
  &__meta { display: flex; gap: 16rpx; }
  &__rating { font-size: 22rpx; color: $color-rank-gold; }
  &__price { font-size: 22rpx; color: $color-primary; font-weight: 500; }
}

/* 景点卡片 */
.scenic-card {
  display: flex;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(67, 160, 71, 0.1);

  &__cover {
    flex-shrink: 0;
    width: 140rpx;
    height: 100rpx;
    border-radius: 12rpx;
    margin-right: 16rpx;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__name {
    font-size: 28rpx;
    font-weight: 600;
    color: $color-text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__desc {
    font-size: 22rpx;
    color: $color-text-secondary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta { display: flex; gap: 16rpx; }
  &__rating { font-size: 22rpx; color: $color-rank-gold; }
  &__price { font-size: 22rpx; color: #43A047; font-weight: 500; }
}

/* ── 加载更多 ── */
.load-more {
  display: flex;
  justify-content: center;
  padding: 32rpx 0;
  &__text {
    font-size: 26rpx;
    color: $color-primary;
    font-weight: 500;
    padding: 12rpx 48rpx;
    border: 2rpx solid $color-primary;
    border-radius: 40rpx;
  }
}

.no-more {
  display: flex;
  justify-content: center;
  padding: 24rpx 0;
  &__text { font-size: 24rpx; color: $color-text-hint; }
}
</style>
