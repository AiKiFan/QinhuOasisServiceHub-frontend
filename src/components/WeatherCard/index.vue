<!--
  景区天气卡片组件
  显示明月山景区实时天气 + 未来3天预报
  @author AiKiFan
-->
<script setup>
import { ref, onMounted } from 'vue'
import { getRealtimeWeather, getWeatherForecast } from '@/api/weather'
import { t } from '@/utils/i18n'

/** 实时天气数据 */
const weather = ref(null)
/** 未来3天预报 */
const forecast = ref([])
/** 加载状态 */
const loading = ref(true)
/** 加载失败 */
const hasError = ref(false)

/** 天气图标映射（和风天气 icon code → Emoji） */
const WEATHER_ICONS = {
  // 晴
  '100': '☀️',
  // 多云
  '101': '🌤️', '102': '⛅', '103': '🌥️',
  // 阴
  '104': '☁️',
  // 风
  '200': '🌪️', '201': '🌫️', '202': '🌫️', '203': '🌫️', '204': '🌫️', '205': '💨',
  // 雷
  '206': '⛈️', '207': '⚡️', '208': '⛈️', '209': '⛈️',
  // 暴雨
  '210': '🌧️', '211': '🌧️', '212': '🌧️', '213': '🌧️',
  // 雨
  '300': '🌦️', '301': '🌧️', '302': '⛈️', '303': '🌧️', '304': '🌧️', '305': '🌧️', '306': '🌧️', '307': '🌧️', '308': '🌧️', '309': '🌧️',
  // 雪
  '400': '🌨️', '401': '🌨️', '402': '❄️', '403': '❄️', '404': '🌨️', '405': '🌨️', '406': '🌨️', '407': '🌨️', '408': '❄️', '409': '❄️',
  // 雾霾
  '500': '🌫️', '501': '🌫️', '502': '🌫️', '503': '🌫️', '504': '🌫️', '505': '🌫️', '506': '🌫️', '507': '🌫️', '508': '🌫️', '509': '🌫️', '510': '🌫️', '511': '🌫️', '512': '🌫️', '513': '🌫️', '514': '🌫️', '515': '🌫️', '516': '🌫️', '517': '🌫️', '518': '🌫️', '519': '🌫️',
  // 晴/阴/多云
  '800': '☀️', '801': '🌤️', '802': '⛅', '803': '🌥️', '804': '☁️',
  // 其他
  '900': '🌨️', '901': '🌧️', '902': '❄️', '903': '☀️', '904': '🌤️', '905': '💨', '906': '🌨️', '907': '🌫️', '908': '🌫️', '909': '🌪️', '999': '☀️',
}

/** 星期映射（带国际化） */
const WEEK_DAYS = ['weather.sun', 'weather.mon', 'weather.tue', 'weather.wed', 'weather.thu', 'weather.fri', 'weather.sat']

/** 风向映射 */
const WIND_DIR_MAP = {
  '北风': 'weather.north',
  '东北风': 'weather.northeast',
  '东风': 'weather.east',
  '东南风': 'weather.southeast',
  '南风': 'weather.south',
  '西南风': 'weather.southwest',
  '西风': 'weather.west',
  '西北风': 'weather.northwest',
  '无风': 'weather.calm',
}

/** 获取星期几（带国际化） */
function getWeekDay(dateStr) {
  const dayIndex = new Date(dateStr).getDay()
  return t(WEEK_DAYS[dayIndex])
}

/** 获取风向翻译 */
function getWindDir(dir) {
  const key = WIND_DIR_MAP[dir]
  return key ? t(key) : dir
}

/** 获取天气 Emoji */
function getWeatherEmoji(icon) {
  return WEATHER_ICONS[icon] || '🌈'
}

/** 加载天气数据 */
async function loadWeather() {
  loading.value = true
  hasError.value = false
  try {
    const [now, fore] = await Promise.all([
      getRealtimeWeather(),
      getWeatherForecast(),
    ])
    weather.value = now
    forecast.value = fore
  } catch {
    hasError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadWeather)
</script>

<template>
  <view class="weather">
    <!-- 加载状态 -->
    <view v-if="loading" class="weather__loading">
      <text class="weather__loading-text">{{ t('common.loading') }}</text>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="hasError" class="weather__error">
      <text class="weather__error-text">{{ t('common.loadFailed') }}</text>
      <text class="weather__retry" @tap="loadWeather">{{ t('common.retry') }}</text>
    </view>

    <!-- 天气内容 -->
    <view v-else-if="weather" class="weather__content">
      <!-- 实时天气 -->
      <view class="weather__now">
        <view class="weather__now-left">
          <text class="weather__icon-big">{{ getWeatherEmoji(weather.icon) }}</text>
          <view class="weather__info">
            <text class="weather__temp">{{ weather.temp }}°C</text>
          </view>
        </view>
        <view class="weather__now-right">
          <text class="weather__scenic">{{ t('weather.location') }}</text>
          <text class="weather__detail">{{ getWindDir(weather.windDir) }} {{ weather.windScale }}{{ t('weather.level') }} · {{ t('weather.humidity') }} {{ weather.humidity }}%</text>
        </view>
      </view>

      <!-- 未来3天预报 -->
      <view v-if="forecast.length > 0" class="weather__forecast">
        <view
          v-for="day in forecast"
          :key="day.date"
          class="weather__day"
        >
          <text class="weather__day-name">{{ getWeekDay(day.date) }}</text>
          <text class="weather__day-icon">{{ getWeatherEmoji(day.icon) }}</text>
          <text class="weather__day-temp">{{ day.tempMin }}/{{ day.tempMax }}°C</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
@import '@/uni.scss';

.weather {
  margin: 20rpx 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.3);
  overflow: hidden;

  &__loading,
  &__error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120rpx;
  }

  &__loading-text,
  &__error-text {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.8);
  }

  &__retry {
    margin-left: 16rpx;
    font-size: 26rpx;
    color: #fff;
    text-decoration: underline;
  }

  &__content {
    display: flex;
    flex-direction: column;
  }

  &__now {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 20rpx;
    border-bottom: 2rpx solid rgba(255, 255, 255, 0.2);
  }

  &__now-left {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__icon-big {
    font-size: 64rpx;
  }

  &__info {
    display: flex;
    flex-direction: column;
  }

  &__temp {
    font-size: 48rpx;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.2;
  }

  &__now-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  &__scenic {
    font-size: 28rpx;
    font-weight: 600;
    color: #ffffff;
  }

  &__detail {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.75);
    margin-top: 4rpx;
    text-align: right;
  }

  &__forecast {
    display: flex;
    justify-content: space-around;
    padding-top: 20rpx;
  }

  &__day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
  }

  &__day-name {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.8);
  }

  &__day-icon {
    font-size: 36rpx;
  }

  &__day-temp {
    font-size: 24rpx;
    color: #ffffff;
    font-weight: 500;
  }
}
</style>