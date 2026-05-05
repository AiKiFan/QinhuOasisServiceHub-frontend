/**
 * 天气接口模块
 * 通过后端代理调用和风天气 API，避免小程序跨域限制及 API Key 泄露
 * 后端接口：GET /api/weather/now?lon=114.37&lat=27.62
 * @author AiKiFan
 */

import { get } from '@/utils/request'

/** 明月山景区经纬度（江西宜春） */
const LON = 114.37
const LAT = 27.62

/**
 * 获取景区当前天气（含3日预报）
 * 后端已做 Redis 缓存（30 分钟）和降级 Mock，前端无需额外降级处理
 *
 * @returns {Promise<{
 *   temp: string,
 *   feelsLike: string,
 *   icon: string,
 *   text: string,
 *   windDir: string,
 *   windScale: string,
 *   humidity: string,
 *   obsTime: string,
 *   forecast: Array<{date:string, tempMax:string, tempMin:string, icon:string, text:string}>
 * }>}
 */
export async function getRealtimeWeather() {
  const data = await get('/weather/now', { lon: LON, lat: LAT })
  return {
    temp: data.temp,
    feelsLike: data.feelsLike,
    icon: data.icon,
    text: data.text,
    windDir: data.windDir,
    windScale: data.windScale,
    humidity: data.humidity,
    obsTime: data.obsTime,
  }
}

/**
 * 获取未来3天天气预报
 * 数据来自后端 /api/weather/now 响应的 forecast 字段（同一次请求）
 *
 * @returns {Promise<Array<{date:string, tempMax:string, tempMin:string, icon:string, text:string}>>}
 */
export async function getWeatherForecast() {
  const data = await get('/weather/now', { lon: LON, lat: LAT })
  return (data.forecast || []).map((day) => ({
    date: day.date,
    tempMax: day.tempMax,
    tempMin: day.tempMin,
    icon: day.icon,
    text: day.text,
  }))
}
