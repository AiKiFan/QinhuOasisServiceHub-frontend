<!--
  译员列表页
  @author AiKiFan
-->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { getInterpreterList } from '@/api/interpreter'
import { t } from '@/utils/i18n'
import TabBar from '@/components/TabBar/index.vue'
import SafeImage from '@/components/SafeImage/index.vue'

/** 服务类型：1=个人 2=团队 */
const SERVICE_TYPE = {
  PERSONAL: 1,
  TEAM: 2,
}

/** 每页条数 */
const PAGE_SIZE = 10

/** 英语等级枚举及显示映射（函数形式，支持国际化） */
function getEnglishLevelLabel(value) {
  const map = {
    0: { label: t('interpreter.level.cet4'), color: '#9BA3AF' },
    1: { label: t('interpreter.level.cet6'), color: '#E8956D' },
    2: { label: t('interpreter.level.tem4'), color: '#FFB22C' },
    3: { label: t('interpreter.level.tem8'), color: '#C87941' },
    4: { label: t('interpreter.level.other'), color: '#7A6055' },
  }
  return map[value] || { label: t('common.unknown'), color: '#9BA3AF' }
}

/** 当前筛选的服务类型：0=全部 1=个人 2=团队 */
const filterType = ref(0)

/** 服务器端当前页码 */
const currentPage = ref(1)
/** 服务器端数据总数 */
const serverTotal = ref(0)
/** 是否还有更多数据可加载（服务端判断） */
const hasMoreServer = ref(true)

/** 存储从服务端拉取的全部原始数据（未筛选） */
const allData = ref([])

/** 加载状态 */
const loading = ref(false)
/** 是否正在加载更多（追加模式） */
const loadingMore = ref(false)
/** 是否加载失败 */
const hasError = ref(false)

/**
 * 基于已加载数据的筛选结果
 * 对 allData 做服务类型筛选
 */
const filteredList = computed(() => {
  if (filterType.value === 0) return allData.value
  const hasPersonal = (item) => (item.serviceTypes & 1) !== 0
  const hasTeam = (item) => (item.serviceTypes & 2) !== 0
  return allData.value.filter(item => {
    if (filterType.value === SERVICE_TYPE.PERSONAL) return hasPersonal(item)
    if (filterType.value === SERVICE_TYPE.TEAM) return hasTeam(item)
    return true
  })
})

/**
 * 跳转译员详情页
 * @param {number} id
 */
function goToDetail(id) {
  uni.navigateTo({ url: `/pages/interpreter/detail?id=${id}` })
}

/**
 * 从服务端加载一页数据（追加到 allData）
 * @param {boolean} refresh - 是否刷新（重置为第一页）
 */
async function loadPage(refresh = false) {
  if (refresh) {
    currentPage.value = 1
    allData.value = []
    hasMoreServer.value = true
    loading.value = true
  } else {
    loadingMore.value = true
  }

  hasError.value = false

  try {
    const result = await getInterpreterList(currentPage.value, PAGE_SIZE)
    serverTotal.value = result.total
    const list = result.list || []

    if (refresh) {
      allData.value = list
    } else {
      allData.value = [...allData.value, ...list]
    }

    // 判断服务端是否还有更多数据
    hasMoreServer.value = allData.value.length < serverTotal.value
  } catch {
    hasError.value = true
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

/**
 * 加载更多（翻下一页）
 */
function loadMore() {
  if (loadingMore.value || !hasMoreServer.value) return
  currentPage.value++
  loadPage(false)
}

/**
 * 切换服务类型筛选
 * @param {number} type - 0=全部 1=个人 2=团队
 */
function switchFilter(type) {
  filterType.value = type
  // 筛选不触发重新加载，仅 computed 重新计算
}

/** 下拉刷新 */
function onPullDownRefresh() {
  loadPage(true).finally(() => uni.stopPullDownRefresh())
}

onMounted(() => {
  uni.setNavigationBarTitle({ title: t('page.interpreterList.title') })
  loadPage(true)
})
</script>


<template>
  <view class="interpreter-list-page">
    <!-- 顶部分类筛选栏 -->
    <view class="filter-bar">
      <view
        class="filter-item"
        :class="{ 'filter-item--active': filterType === 0 }"
        @tap="switchFilter(0)"
      >
        <text class="filter-item__text">{{ t('interpreter.type.all') }}</text>
      </view>
      <view
        class="filter-item"
        :class="{ 'filter-item--active': filterType === SERVICE_TYPE.PERSONAL }"
        @tap="switchFilter(SERVICE_TYPE.PERSONAL)"
      >
        <text class="filter-item__text">{{ t('interpreter.type.personal') }}</text>
      </view>
      <view
        class="filter-item"
        :class="{ 'filter-item--active': filterType === SERVICE_TYPE.TEAM }"
        @tap="switchFilter(SERVICE_TYPE.TEAM)"
      >
        <text class="filter-item__text">{{ t('interpreter.type.team') }}</text>
      </view>
    </view>

    <!-- 加载中骨架屏 -->
    <view v-if="loading" class="skeleton-wrap">
      <view v-for="i in 4" :key="i" class="skeleton-card">
        <view class="skeleton-card__avatar" />
        <view class="skeleton-card__lines">
          <view class="skeleton-card__line skeleton-card__line--name" />
          <view class="skeleton-card__line skeleton-card__line--school" />
          <view class="skeleton-card__line skeleton-card__line--stats" />
          <view class="skeleton-card__line skeleton-card__line--price" />
        </view>
      </view>
    </view>

    <!-- 加载失败状态 -->
    <view v-else-if="hasError" class="status">
      <text class="status__text">{{ t('common.loadFailed') }}</text>
      <button class="status__retry-btn" @tap="loadPage(true)">{{ t('common.retry') }}</button>
    </view>

    <!-- 译员列表 -->
    <view v-else class="list">
      <view
        v-for="item in filteredList"
        :key="item.id"
        class="interpreter-card"
        @tap="goToDetail(item.id)"
      >
        <!-- 左侧头像区 -->
        <view class="card-avatar-wrap">
          <SafeImage
            class="card-avatar"
            :src="item.avatar"
            mode="aspectFill"
          />
        </view>

        <!-- 右侧信息区 -->
        <view class="card-info">
          <!-- 姓名 + 英语等级标签 -->
          <view class="card-header">
            <text class="card-name">{{ item.realName || item.nickname }}</text>
            <view
              class="level-badge"
              :style="{ backgroundColor: getEnglishLevelLabel(item.englishLevel).color }"
            >
              <text class="level-badge__text">
                {{ getEnglishLevelLabel(item.englishLevel).label }}
              </text>
            </view>
          </view>

          <!-- 学校 -->
          <text class="card-school">{{ item.school }}</text>

          <!-- 评分 + 接单数 -->
          <view class="card-stats">
            <view class="card-rating">
              <text class="card-rating-star">★</text>
              <text class="card-rating-val">{{ item.rating.toFixed(1) }}</text>
            </view>
            <text class="card-orders">{{ item.totalOrders }} {{ t('interpreter.orders') }}</text>
          </view>

          <!-- 时薪 + 服务类型标签 -->
          <view class="card-footer">
            <text class="card-price">¥{{ item.hourlyRate.toFixed(0) }}{{ t('interpreter.priceUnit') }}</text>
            <view class="service-tags">
              <view
                v-if="item.serviceTypes & 1"
                class="service-tag"
              >
                <text class="service-tag__text">{{ t('interpreter.type.personalTag') }}</text>
              </view>
              <view
                v-if="item.serviceTypes & 2"
                class="service-tag"
              >
                <text class="service-tag__text">{{ t('interpreter.type.teamTag') }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && filteredList.length === 0" class="empty">
        <text class="empty__text">{{ t('interpreter.noData') }}</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMoreServer && !loading" class="load-more" @tap="loadMore">
        <text class="load-more__text">{{ loadingMore ? t('common.loading') : t('common.loadMore') }}</text>
      </view>
      <view v-if="!hasMoreServer && allData.length > 0" class="no-more">
        <text class="no-more__text">{{ t('common.noMore') }}</text>
      </view>
    </view>


    <!-- 底部 TabBar -->
    <TabBar active="interpreter" />
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.interpreter-list-page {
  min-height: 100vh;
  background-color: $color-bg-page;
  padding-bottom: 120rpx;
}

/* ── 筛选栏 ── */
.filter-bar {
  display: flex;
  background-color: $color-bg-card;
  padding: 24rpx 32rpx;
  gap: 16rpx;
  border-bottom: 2rpx solid $color-divider;
}

.filter-item {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  border: 2rpx solid $color-divider;

  &__text {
    font-size: 28rpx;
    color: $color-text-secondary;
  }

  &--active {
    border-color: $color-primary;
    background-color: $color-primary-light;

    & .filter-item__text {
      color: $color-primary;
      font-weight: 600;
    }
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

  &__text {
    font-size: 24rpx;
    color: $color-text-hint;
  }
}

/* ── 状态占位 ── */
.status {
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
  }
}

.empty {
  display: flex;
  justify-content: center;
  padding-top: 120rpx;

  &__text {
    font-size: 28rpx;
    color: $color-text-hint;
  }
}

/* ── 列表容器 ── */
.list {
  padding: 24rpx;
}

/* ── 译员卡片 ── */
.interpreter-card {
  display: flex;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.card-avatar-wrap {
  flex-shrink: 0;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 24rpx;
}

.card-avatar {
  width: 100%;
  height: 100%;
}

.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.card-name {
  font-size: 32rpx;
  font-weight: 600;
  color: $color-text-primary;
}

.level-badge {
  padding: 4rpx 12rpx;
  border-radius: 16rpx;

  &__text {
    font-size: 20rpx;
    color: #ffffff;
    font-weight: 500;
  }
}

.card-school {
  font-size: 24rpx;
  color: $color-text-hint;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.card-rating {
  display: flex;
  align-items: center;
  gap: 4rpx;

  &__star {
    font-size: 24rpx;
    color: $color-rank-gold;
  }

  &__val {
    font-size: 26rpx;
    font-weight: 600;
    color: $color-text-primary;
  }
}

.card-orders {
  font-size: 22rpx;
  color: $color-text-hint;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
}

.card-price {
  font-size: 28rpx;
  font-weight: 600;
  color: $color-primary;
}

.service-tags {
  display: flex;
  gap: 8rpx;
}

.service-tag {
  padding: 4rpx 10rpx;
  background-color: $color-divider;
  border-radius: 12rpx;

  &__text {
    font-size: 18rpx;
    color: $color-text-secondary;
  }
}

/* ── 骨架屏 ── */
.skeleton-wrap {
  padding: 24rpx;
}

.skeleton-card {
  display: flex;
  background-color: $color-bg-card;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(232, 149, 109, 0.08);
}

.skeleton-card__avatar {
  flex-shrink: 0;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: $color-divider;
  animation: skeleton-pulse 1.4s ease-in-out infinite;
  margin-right: 24rpx;
}

.skeleton-card__lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.skeleton-card__line {
  border-radius: 6rpx;
  background-color: $color-divider;
  animation: skeleton-pulse 1.4s ease-in-out infinite;

  &--name {
    height: 32rpx;
    width: 50%;
  }

  &--school {
    height: 24rpx;
    width: 70%;
  }

  &--stats {
    height: 24rpx;
    width: 40%;
  }

  &--price {
    height: 28rpx;
    width: 35%;
  }
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
