/**
 * 数据统计埋点工具
 * 支持页面访问统计、用户行为埋点、事件上报、性能监控
 * @author AiKiFan
 */

/**
 * 事件类型枚举
 */
const EVENT_TYPES = {
  // 页面访问
  PAGE_VIEW: 'page_view',
  PAGE_LEAVE: 'page_leave',
  
  // 用户行为
  CLICK: 'click',
  SEARCH: 'search',
  SCROLL: 'scroll',
  
  // 收藏
  FAVORITE_ADD: 'favorite_add',
  FAVORITE_REMOVE: 'favorite_remove',
  
  // 分享
  SHARE: 'share',
  
  // 订单
  ORDER_CREATE: 'order_create',
  ORDER_CANCEL: 'order_cancel',
  ORDER_COMPLETE: 'order_complete',
  
  // 景点
  SCENIC_VIEW: 'scenic_view',
  SCENIC_COMMENT: 'scenic_comment',
  
  // 讲解员
  INTERPRETER_VIEW: 'interpreter_view',
  INTERPRETER_BOOK: 'interpreter_book',
  
  // 餐厅
  RESTAURANT_VIEW: 'restaurant_view',
  
  // 错误
  ERROR: 'error',
  API_ERROR: 'api_error',
  
  // 性能
  PERFORMANCE: 'performance',
}

/**
 * 事件数据结构
 */
class AnalyticsEvent {
  constructor({ type, name, params = {}, userId = null }) {
    this.type = type
    this.name = name
    this.params = params
    this.userId = userId
    this.timestamp = Date.now()
    this.sessionId = getSessionId()
    this.deviceInfo = getDeviceInfo()
  }
}

// 会话ID
let sessionId = null

/**
 * 获取或生成会话ID
 */
function getSessionId() {
  if (!sessionId) {
    sessionId = uni.getStorageSync('analytics_session_id')
    
    if (!sessionId) {
      sessionId = generateId()
      uni.setStorageSync('analytics_session_id', sessionId)
    }
  }
  
  return sessionId
}

/**
 * 生成唯一ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 获取设备信息
 */
let _deviceInfo = null
function getDeviceInfo() {
  if (_deviceInfo) return _deviceInfo
  
  try {
    const info = uni.getSystemInfoSync()
    _deviceInfo = {
      platform: info.platform,
      system: info.system,
      model: info.model,
      screenWidth: info.screenWidth,
      screenHeight: info.screenHeight,
      version: info.version,
    }
  } catch (e) {
    _deviceInfo = {}
  }
  
  return _deviceInfo
}

/**
 * 事件队列
 */
const eventQueue = []
let isFlushing = false

/**
 * 分析管理器
 */
class AnalyticsManager {
  constructor() {
    this.enabled = true
    this.userId = null
    this.flushInterval = 10000 // 10秒批量上报
    this.maxQueueSize = 50
    
    // 定时上报
    setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }
  
  /**
   * 设置用户ID
   * @param {string|number} id 用户ID
   */
  setUserId(id) {
    this.userId = id
  }
  
  /**
   * 清除用户ID
   */
  clearUserId() {
    this.userId = null
  }
  
  /**
   * 记录事件
   * @param {string} type 事件类型
   * @param {string} name 事件名称
   * @param {Object} params 事件参数
   */
  track(type, name, params = {}) {
    if (!this.enabled) return
    
    const event = new AnalyticsEvent({
      type,
      name,
      params,
      userId: this.userId,
    })
    
    eventQueue.push(event)
    
    // 队列满了立即上报
    if (eventQueue.length >= this.maxQueueSize) {
      this.flush()
    }
  }
  
  /**
   * 记录页面访问
   * @param {string} pageName 页面名称
   * @param {Object} params 页面参数
   */
  trackPageView(pageName, params = {}) {
    this.track(EVENT_TYPES.PAGE_VIEW, 'page_view', { pageName, ...params })
  }
  
  /**
   * 记录点击事件
   * @param {string} elementName 元素名称
   * @param {Object} params 额外参数
   */
  trackClick(elementName, params = {}) {
    this.track(EVENT_TYPES.CLICK, 'click', { elementName, ...params })
  }
  
  /**
   * 记录搜索事件
   * @param {string} keyword 搜索关键词
   * @param {number} resultCount 结果数量
   */
  trackSearch(keyword, resultCount = 0) {
    this.track(EVENT_TYPES.SEARCH, 'search', { keyword, resultCount })
  }
  
  /**
   * 记录收藏操作
   * @param {string} itemType 内容类型
   * @param {string|number} itemId 内容ID
   * @param {boolean} isFavorite 是否收藏
   */
  trackFavorite(itemType, itemId, isFavorite) {
    const eventType = isFavorite ? EVENT_TYPES.FAVORITE_ADD : EVENT_TYPES.FAVORITE_REMOVE
    this.track(eventType, 'favorite', { itemType, itemId, isFavorite })
  }
  
  /**
   * 记录分享操作
   * @param {string} itemType 内容类型
   * @param {string|number} itemId 内容ID
   * @param {string} platform 分享平台
   */
  trackShare(itemType, itemId, platform) {
    this.track(EVENT_TYPES.SHARE, 'share', { itemType, itemId, platform })
  }
  
  /**
   * 记录订单事件
   * @param {string} action 订单操作
   * @param {Object} orderInfo 订单信息
   */
  trackOrder(action, orderInfo = {}) {
    const eventTypeMap = {
      create: EVENT_TYPES.ORDER_CREATE,
      cancel: EVENT_TYPES.ORDER_CANCEL,
      complete: EVENT_TYPES.ORDER_COMPLETE,
    }
    
    this.track(eventTypeMap[action] || EVENT_TYPES.ORDER_CREATE, `order_${action}`, orderInfo)
  }
  
  /**
   * 记录景点访问
   * @param {string|number} scenicId 景点ID
   * @param {string} scenicName 景点名称
   */
  trackScenicView(scenicId, scenicName) {
    this.track(EVENT_TYPES.SCENIC_VIEW, 'scenic_view', { scenicId, scenicName })
  }
  
  /**
   * 记录讲解员访问
   * @param {string|number} interpreterId 讲解员ID
   * @param {string} interpreterName 讲解员名称
   */
  trackInterpreterView(interpreterId, interpreterName) {
    this.track(EVENT_TYPES.INTERPRETER_VIEW, 'interpreter_view', { interpreterId, interpreterName })
  }
  
  /**
   * 记录餐厅访问
   * @param {string|number} restaurantId 餐厅ID
   * @param {string} restaurantName 餐厅名称
   */
  trackRestaurantView(restaurantId, restaurantName) {
    this.track(EVENT_TYPES.RESTAURANT_VIEW, 'restaurant_view', { restaurantId, restaurantName })
  }
  
  /**
   * 记录错误
   * @param {string} errorType 错误类型
   * @param {string} errorMessage 错误信息
   * @param {Object} extra 额外信息
   */
  trackError(errorType, errorMessage, extra = {}) {
    this.track(EVENT_TYPES.ERROR, 'error', { errorType, errorMessage, ...extra })
    
    // 错误立即上报
    this.flush()
  }
  
  /**
   * 记录API错误
   * @param {string} url 请求URL
   * @param {number} statusCode 状态码
   * @param {string} message 错误信息
   */
  trackApiError(url, statusCode, message) {
    this.track(EVENT_TYPES.API_ERROR, 'api_error', { url, statusCode, message })
  }
  
  /**
   * 记录性能指标
   * @param {string} metricName 指标名称
   * @param {number} duration 耗时（毫秒）
   * @param {Object} extra 额外信息
   */
  trackPerformance(metricName, duration, extra = {}) {
    this.track(EVENT_TYPES.PERFORMANCE, 'performance', { metricName, duration, ...extra })
  }
  
  /**
   * 批量上报事件
   */
  async flush() {
    if (isFlushing || eventQueue.length === 0) return
    
    isFlushing = true
    
    const events = eventQueue.splice(0, this.maxQueueSize)
    
    try {
      await uni.request({
        url: '/api/analytics/events',
        method: 'POST',
        data: { events },
        // 不需要loading显示
        custom: { noLoading: true, noError: true },
      })
    } catch (error) {
      // 上报失败，将事件放回队列
      eventQueue.unshift(...events)
    } finally {
      isFlushing = false
    }
  }
  
  /**
   * 启用统计
   */
  enable() {
    this.enabled = true
  }
  
  /**
   * 禁用统计（用于调试）
   */
  disable() {
    this.enabled = false
  }
}

// 创建全局实例
const analytics = new AnalyticsManager()

/**
 * 页面访问统计 Composition API
 * 在页面中使用：setupAnalytics('pageName')
 */
function setupAnalytics(pageName, params = {}) {
  const startTime = Date.now()
  
  // 记录进入
  analytics.trackPageView(pageName, params)
  
  // 页面离开时记录停留时间
  onUnmounted(() => {
    const duration = Date.now() - startTime
    analytics.track(EVENT_TYPES.PAGE_LEAVE, 'page_leave', {
      pageName,
      duration,
      ...params,
    })
  })
}

export {
  EVENT_TYPES,
  AnalyticsEvent,
  AnalyticsManager,
  analytics,
  setupAnalytics,
}

export default analytics