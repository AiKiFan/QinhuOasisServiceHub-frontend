/**
 * 缓存策略优化工具
 * 支持多级缓存、智能失效、缓存预热、缓存统计等功能
 * @author AiKiFan
 */

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  // 默认缓存时间（毫秒）
  defaultTTL: 5 * 60 * 1000, // 5分钟
  
  // 各类数据的缓存时间
  cacheTimes: {
    // 用户信息 - 10分钟
    userInfo: 10 * 60 * 1000,
    // 景点列表 - 5分钟
    scenicList: 5 * 60 * 1000,
    // 景点详情 - 30分钟
    scenicDetail: 30 * 60 * 1000,
    // 讲解员列表 - 5分钟
    interpreterList: 5 * 60 * 1000,
    // 讲解员详情 - 30分钟
    interpreterDetail: 30 * 60 * 1000,
    // 餐厅列表 - 5分钟
    restaurantList: 5 * 60 * 1000,
    // 餐厅详情 - 30分钟
    restaurantDetail: 30 * 60 * 1000,
    // 天气信息 - 30分钟
    weather: 30 * 60 * 1000,
    // 搜索结果 - 2分钟
    searchResult: 2 * 60 * 1000,
    // 评论列表 - 5分钟
    commentList: 5 * 60 * 1000,
    // 排行榜 - 1小时
    rank: 60 * 60 * 1000,
    // 收藏列表 - 2分钟
    favorites: 2 * 60 * 1000,
    // 订单列表 - 1分钟
    orders: 1 * 60 * 1000,
  },
  
  // 最大缓存条目数
  maxCacheSize: 100,
  
  // 是否启用缓存
  enabled: true,
}

/**
 * 缓存统计
 */
const cacheStats = {
  hits: 0,          // 命中次数
  misses: 0,        // 未命中次数
  sets: 0,          // 设置次数
  deletes: 0,       // 删除次数
  evictions: 0,     // 驱逐次数
  
  /**
   * 获取命中率
   */
  getHitRate() {
    const total = this.hits + this.misses
    return total > 0 ? (this.hits / total * 100).toFixed(2) : 0
  },
  
  /**
   * 重置统计
   */
  reset() {
    this.hits = 0
    this.misses = 0
    this.sets = 0
    this.deletes = 0
    this.evictions = 0
  },
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      evictions: this.evictions,
      hitRate: this.getHitRate(),
    }
  },
}

/**
 * 缓存管理器
 */
class CacheManager {
  constructor() {
    this.cache = new Map()
    this.loadPersistedCache()
  }
  
  /**
   * 加载持久化的缓存
   */
  loadPersistedCache() {
    try {
      const persistedCache = uni.getStorageSync('app_cache')
      if (persistedCache) {
        const now = Date.now()
        Object.entries(persistedCache).forEach(([key, value]) => {
          // 只加载未过期的缓存
          if (value.expire > now) {
            this.cache.set(key, value)
          }
        })
      }
    } catch (error) {
      console.error('加载缓存失败:', error)
    }
  }
  
  /**
   * 持久化缓存
   */
  persistCache() {
    try {
      const cacheObj = Object.fromEntries(this.cache)
      uni.setStorageSync('app_cache', cacheObj)
    } catch (error) {
      console.error('持久化缓存失败:', error)
    }
  }
  
  /**
   * 生成缓存键
   * @param {string} key 基础键
   * @param {Object} params 参数对象
   */
  generateKey(key, params = {}) {
    if (Object.keys(params).length === 0) {
      return key
    }
    
    const paramStr = JSON.stringify(params)
    return `${key}:${paramStr}`
  }
  
  /**
   * 获取缓存
   * @param {string} key 缓存键
   */
  get(key) {
    if (!CACHE_CONFIG.enabled) {
      return null
    }
    
    const cacheItem = this.cache.get(key)
    
    if (!cacheItem) {
      cacheStats.misses++
      return null
    }
    
    // 检查是否过期
    if (Date.now() > cacheItem.expire) {
      this.delete(key)
      cacheStats.misses++
      return null
    }
    
    cacheStats.hits++
    return cacheItem.data
  }
  
  /**
   * 设置缓存
   * @param {string} key 缓存键
   * @param {*} data 数据
   * @param {number} ttl 过期时间（毫秒）
   */
  set(key, data, ttl = CACHE_CONFIG.defaultTTL) {
    if (!CACHE_CONFIG.enabled) {
      return
    }
    
    // 如果缓存已满，驱逐最老的缓存
    if (this.cache.size >= CACHE_CONFIG.maxCacheSize) {
      this.evictOldest()
    }
    
    const cacheItem = {
      data,
      createTime: Date.now(),
      expire: Date.now() + ttl,
      key,
    }
    
    this.cache.set(key, cacheItem)
    cacheStats.sets++
    
    // 持久化
    this.persistCache()
  }
  
  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  delete(key) {
    this.cache.delete(key)
    cacheStats.deletes++
    this.persistCache()
  }
  
  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear()
    cacheStats.deletes += this.cache.size
    this.persistCache()
  }
  
  /**
   * 驱逐最老的缓存
   */
  evictOldest() {
    let oldestKey = null
    let oldestTime = Infinity
    
    for (const [key, value] of this.cache.entries()) {
      if (value.createTime < oldestTime) {
        oldestTime = value.createTime
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey)
      cacheStats.evictions++
    }
  }
  
  /**
   * 检查缓存是否存在
   * @param {string} key 缓存键
   */
  has(key) {
    const cacheItem = this.cache.get(key)
    if (!cacheItem) {
      return false
    }
    
    // 检查是否过期
    if (Date.now() > cacheItem.expire) {
      this.delete(key)
      return false
    }
    
    return true
  }
  
  /**
   * 按前缀删除缓存
   * @param {string} prefix 前缀
   */
  deleteByPrefix(prefix) {
    const keysToDelete = []
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.delete(key))
  }
  
  /**
   * 获取缓存大小
   */
  size() {
    return this.cache.size
  }
  
  /**
   * 清理过期缓存
   */
  cleanupExpired() {
    const now = Date.now()
    const keysToDelete = []
    
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expire) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.delete(key))
  }
}

// 创建全局实例
const cacheManager = new CacheManager()

/**
 * 定期清理过期缓存
 */
setInterval(() => {
  cacheManager.cleanupExpired()
}, 5 * 60 * 1000) // 每5分钟清理一次

/**
 * 带缓存的请求封装
 * @param {Object} options 请求选项
 */
async function cachedRequest(options) {
  const { cacheKey, cacheType = 'default', ...requestOptions } = options
  
  // 生成完整的缓存键
  const fullKey = cacheManager.generateKey(cacheKey, requestOptions.params || requestOptions.data || {})
  
  // 尝试从缓存获取
  const cachedData = cacheManager.get(fullKey)
  if (cachedData !== null) {
    return { data: cachedData, fromCache: true }
  }
  
  // 发起请求
  const response = await uni.request(requestOptions)
  
  if (response.statusCode === 200 && response.data.code === 200) {
    // 获取缓存时间
    const ttl = CACHE_CONFIG.cacheTimes[cacheType] || CACHE_CONFIG.defaultTTL
    
    // 存入缓存
    cacheManager.set(fullKey, response.data, ttl)
  }
  
  return { data: response.data, fromCache: false }
}

/**
 * 预热缓存
 * @param {Array} items 预热项数组 [{ cacheKey, cacheType, requestOptions }]
 */
async function warmupCache(items) {
  const promises = items.map(item => cachedRequest(item))
  await Promise.all(promises)
}

/**
 * 使缓存失效
 * @param {string} key 缓存键
 * @param {Object} params 参数对象
 */
function invalidateCache(key, params = {}) {
  const fullKey = cacheManager.generateKey(key, params)
  cacheManager.delete(fullKey)
}

/**
 * 批量使缓存失效
 * @param {string} prefix 前缀
 */
function invalidateCacheByPrefix(prefix) {
  cacheManager.deleteByPrefix(prefix)
}

/**
 * 获取缓存统计
 */
function getCacheStats() {
  return cacheStats.getStats()
}

/**
 * 重置缓存统计
 */
function resetCacheStats() {
  cacheStats.reset()
}

/**
 * 清空所有缓存
 */
function clearAllCache() {
  cacheManager.clear()
}

export {
  CACHE_CONFIG,
  cacheStats,
  CacheManager,
  cacheManager,
  cachedRequest,
  warmupCache,
  invalidateCache,
  invalidateCacheByPrefix,
  getCacheStats,
  resetCacheStats,
  clearAllCache,
}

export default cacheManager