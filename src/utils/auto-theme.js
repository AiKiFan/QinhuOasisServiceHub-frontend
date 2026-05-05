/**
 * 夜间模式自动切换工具
 * 支持定时切换、跟随系统、日落模式等
 * @author AiKiFan
 */

import theme from './theme'
import { showToast } from './common'

/**
 * 主题切换模式
 */
const THEME_MODES = {
  MANUAL: 'manual',       // 手动切换
  AUTO: 'auto',           // 自动跟随系统
  SCHEDULED: 'scheduled',  // 定时切换
  SUNSET: 'sunset',       // 日落模式
}

/**
 * 定时配置
 */
const SCHEDULE_CONFIG = {
  // 白天模式开始时间 (格式: HH:MM)
  dayStart: '06:00',
  // 夜间模式开始时间 (格式: HH:MM)
  nightStart: '20:00',
}

/**
 * 日落配置
 */
const SUNSET_CONFIG = {
  // 城市代码，用于获取当地日出日落时间
  city: 'qinhuangdao',
  // 日落前多少分钟切换到夜间模式
  sunsetOffset: 30, // 30分钟
}

/**
 * 自动主题管理器
 */
class AutoThemeManager {
  constructor() {
    this.mode = uni.getStorageSync('theme_mode') || THEME_MODES.MANUAL
    this.timer = null
    this.sunsetTime = null
    this.sunriseTime = null
  }
  
  /**
   * 初始化
   */
  init() {
    this.loadScheduleConfig()
    this.loadSunsetConfig()
    
    switch (this.mode) {
      case THEME_MODES.AUTO:
        this.followSystemTheme()
        break
      case THEME_MODES.SCHEDULED:
        this.startScheduledSwitch()
        break
      case THEME_MODES.SUNSET:
        this.startSunsetSwitch()
        break
      case THEME_MODES.MANUAL:
      default:
        // 手动模式，不做任何处理
        break
    }
  }
  
  /**
   * 设置切换模式
   * @param {string} mode 模式
   */
  setMode(mode) {
    this.stopAutoSwitch()
   
    
    this.mode = mode
    uni.setStorageSync('theme_mode', mode)
    
    switch (mode) {
      case THEME_MODES.AUTO:
        this.followSystemTheme()
        break
      case THEME_MODES.SCHEDULED:
        this.startScheduledSwitch()
        break
      case THEME_MODES.SUNSET:
        this.startSunsetSwitch()
        break
      case THEME_MODES.MUAL:
      default:
        showToast('已切换到手动模式')
        break
    }
    
    return this
  }
  
  /**
   * 获取当前模式
   */
  getMode() {
    return this.mode
  }
  
  /**
   * 跟随系统主题
   */
  followSystemTheme() {
    // #ifdef MP-WEIXIN
    wx.getSystemInfo({
      success: (res) => {
        if (res.theme === 'dark') {
          theme.setTheme('dark')
        } else {
          theme.setTheme('light')
        }
      },
    })
    
    // 监听系统主题变化
    wx.onThemeChange((res) => {
      if (res.theme === 'dark') {
        theme.setTheme('dark')
      } else {
        theme.setTheme('light')
      }
    })
    // #endif
    
    // #ifndef MP-WEIXIN
    // 非小程序环境，默认使用白天模式
    theme.setTheme('light')
    // #endif
    
    showToast('已切换到跟随系统模式')
  }
  
  /**
   * 开始定时切换
   */
  startScheduledSwitch() {
    this.stopAutoSwitch()
    
    // 立即检查并切换
    this.checkScheduledTime()
    
    // 每分钟检查一次
    this.timer = setInterval(() => {
      this.checkScheduledTime()
    }, 60000) // 1分钟
    
    showToast('已切换到定时模式')
  }
  
  /**
   * 检查定时时间
   */
  checkScheduledTime() {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    const isNight = this.isTimeInRange(currentTime, SCHEDULE_CONFIG.nightStart, SCHEDULE_CONFIG.dayStart)
    
    if (isNight) {
      theme.setTheme('dark')
    } else {
      theme.setTheme('light')
    }
  }
  
  /**
   * 判断时间是否在范围内（跨夜）
   * @param {string} currentTime 当前时间 HH:MM
   * @param {string} startTime 开始时间 HH:MM
   * @param {string} endTime 结束时间 HH:MM
   */
  isTimeInRange(currentTime, startTime, endTime) {
    const current = this.timeToMinutes(currentTime)
    const start = this.timeToMinutes(startTime)
    const end = this.timeToMinutes(endTime)
    
    // 跨夜情况：例如 20:00 到 06:00
    if (start > end) {
      return current >= start || current < end
    }
    
    // 普通情况
    return current >= start && current < end
  }
  
  /**
   * 时间转换为分钟数
   * @param {string} time HH:MM
   */
  timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  
  /**
   * 开始日落模式切换
   */
  async startSunsetSwitch() {
    this.stopAutoSwitch()
    
    // 获取日出日落时间
    await this.fetchSunsetTime()
    
    if (!this.sunsetTime || !this.sunriseTime) {
      showToast('无法获取日出日落时间，切换到定时模式')
      this.setMode(THEME_MODES.SCHEDULED)
      return
    }
    
    // 立即检查
    this.checkSunsetTime()
    
    // 每分钟检查一次
    this.timer = setInterval(() => {
      this.checkSunsetTime()
    }, 60000)
    
    showToast('已切换到日落模式')
  }
  
  /**
   * 获取日出日落时间
   */
  async fetchSunsetTime() {
    try {
      // 调用API获取日出日落时间
      const response = await uni.request({
        url: `/api/weather/sun-time?city=${SUNSET_CONFIG.city}`,
        method: 'GET',
      })
      
      if (response.data.code === 200) {
        this.sunriseTime = response.data.data.sunrise
        this.sunsetTime = response.data.data.sunset
      }
    } catch (error) {
      console.error('获取日出日落时间失败:', error)
    }
    
    // 如果API失败，使用固定的默认值
    if (!this.sunriseTime || !this.sunsetTime) {
      this.sunriseTime = '05:30'
      this.sunsetTime = '19:30'
    }
  }
  
  /**
   * 检查日落时间
   */
  checkSunsetTime() {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    // 计算日落切换时间（日落前 offset 分钟）
    const sunsetSwitchTime = this.calculateSunsetSwitchTime()
    
    const isNight = this.isTimeInRange(currentTime, sunsetSwitchTime, this.sunriseTime)
    
    if (isNight) {
      theme.setTheme('dark')
    } else {
      theme.setTheme('light')
    }
  }
  
  /**
   * 计算日落切换时间
   */
  calculateSunsetSwitchTime() {
    if (!this.sunsetTime) return '19:00'
    
    const sunsetMinutes = this.timeToMinutes(this.sunsetTime)
    const offsetMinutes = SUNSET_CONFIG.sunsetOffset
    
    const switchMinutes = sunsetMinutes - offsetMinutes
    
    if (switchMinutes < 0) {
      switchMinutes += 24 * 60 // 跨天
    }
    
    const hours = Math.floor(switchMinutes / 60)
    const minutes = switchMinutes % 60
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  
  /**
   * 停止自动切换
   */
  stopAutoSwitch() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    
    // #ifdef MP-WEIXIN
    wx.offThemeChange()
    // #endif
  }
  
  /**
   * 加载定时配置
   */
  loadScheduleConfig() {
    const customConfig = uni.getStorageSync('schedule_config')
    if (customConfig) {
      Object.assign(SCHEDULE_CONFIG, customConfig)
    }
  }
  
  /**
   * 保存定时配置
   * @param {Object} config 配置
   */
  saveScheduleConfig(config) {
    Object.assign(SCHEDULE_CONFIG, config)
    uni.setStorageSync('schedule_config', SCHEDULE_CONFIG)
    
    // 如果当前是定时模式，重新应用
    if (this.mode === THEME_MODES.SCHEDULED) {
      this.startScheduledSwitch()
    }
  }
  
  /**
   * 加载日落配置
   */
  loadSunsetConfig() {
    const customConfig = uni.getStorageSync('sunset_config')
    if (customConfig) {
      Object.assign(SUNSET_CONFIG, customConfig)
    }
  }
  
  /**
   * 保存日落配置
   * @param {Object} config 配置
   */
  saveSunsetConfig(config) {
    Object.assign(SUNSET_CONFIG, config)
    uni.setStorageSync('sunset_config', SUNSET_CONFIG)
    
    // 如果当前是日落模式，重新应用
    if (this.mode === THEME_MODES.SUNSET) {
      this.startSunsetSwitch()
    }
  }
  
  /**
   * 获取定时配置
   */
  getScheduleConfig() {
    return { ...SCHEDULE_CONFIG }
  }
  
  /**
   * 获取日落配置
   */
  getSunsetConfig() {
    return { ...SUNSET_CONFIG }
  }
  
  /**
   * 获取下一个切换时间
   */
  getNextSwitchTime() {
    switch (this.mode) {
      case THEME_MODES.SCHEDULED:
        return this.getNextScheduledSwitchTime()
      case THEME_MODES.SUNSET:
        return this.getNextSunsetSwitchTime()
      default:
        return null
    }
  }
  
  /**
   * 获取下一个定时切换时间
   */
  getNextScheduledSwitchTime() {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    const isNight = this.isTimeInRange(currentTime, SCHEDULE_CONFIG.nightStart, SCHEDULE_CONFIG.dayStart)
    
    // 如果现在是夜间模式，下一个切换点是白天开始时间
    if (isNight) {
      return SCHEDULE_CONFIG.dayStart
    }
    // 如果现在是白天模式，下一个切换点是夜间开始时间
    else {
      return SCHEDULE_CONFIG.nightStart
    }
  }
  
  /**
   * 获取下一个日落切换时间
   */
  getNextSunsetSwitchTime() {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    const sunsetSwitchTime = this.calculateSunsetSwitchTime()
    const isNight = this.isTimeInRange(currentTime, sunsetSwitchTime, this.sunriseTime)
    
    // 如果现在是夜间模式，下一个切换点是日出时间
    if (isNight) {
      return this.sunriseTime
    }
    // 如果现在是白天模式，下一个切换点是日落时间
    else {
      return sunsetSwitchTime
    }
  }
}

// 创建全局实例
const autoTheme = new AutoThemeManager()

export {
  THEME_MODES,
  SCHEDULE_CONFIG,
  SUNSET_CONFIG,
  AutoThemeManager,
  autoTheme,
}

export default autoTheme