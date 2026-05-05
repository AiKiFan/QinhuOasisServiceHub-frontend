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
  '100': '☀️', // 晴
  '101': '🌤', // 多云
  '102': '⛅', // 少云
  '103': '🌥', // 晴间多云
  '104': '☁️', // 阴
  '300': '🌦', // 阵雨
  '301': '🌧', // 强阵雨
  '302': '⛈', // 雷阵雨
  '305': '🌧', // 小雨
  '306': '🌧', // 中雨
  '307': '🌧', // 大雨
  '400': '🌨', // 小雪
  '401': '🌨', // 中雪
  '402': '❄️', // 大雪
  '501': '🌫', // 雾
  '502': '🌫', // 霾
  '999': '🌈', // 未知
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

/** 获取星期几 */
function getWeekDay(dateStr) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const date = new Date(dateStr)
  return days[date.getDay()]
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
            <text class="weather__desc">{{ weather.text }}</text>
          </view>
        </view>
        <view class="weather__now-right">
          <text class="weather__scenic">明月山景区</text>
          <text class="weather__detail">体感 {{ weather.feelsLike }}°C · {{ weather.windDir }}{{ weather.windScale }}级 · 湿度 {{ weather.humidity }}%</text>
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
          <text class="weather__day-desc">{{ day.text }}</text>
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

  &__desc {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.85);
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
    color: rgba(255, 255, 255, 0.85);
  }

  &__day-icon {
    font-size: 36rpx;
  }

  &__day-desc {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.75);
  }

  &__day-temp {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}
</style>
