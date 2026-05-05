/**
 * 图片本地缓存工具（开发环境降级方案）
 *
 * 功能：
 * 1. 上传成功后保存图片到本地 IndexedDB
 * 2. MinIO 加载失败时从本地缓存读取
 * 3. 管理 URL 映射表（MinIO URL ↔ Blob URL）
 *
 * ⚠️ 局限性：
 * - 仅适用于开发环境
 * - H5 环境使用 IndexedDB（持久存储，上限约 50MB-500MB）
 * - 小程序环境使用 uni.saveFile（上限 200MB）
 * - 清除浏览器数据/换设备后图片丢失
 * - 生产环境必须使用云存储或 MinIO 常驻运行
 *
 * @author AiKiFan
 */

const CACHE_DB_NAME = 'QinhuImageCacheDB'
const CACHE_STORE_NAME = 'images'
const DB_VERSION = 1

/** IndexedDB 数据库实例（H5 环境） */
let dbInstance = null

/**
 * 判断当前运行环境
 * @returns {'h5'|'mp-weixin'|'mp-alipay'|...}
 */
function getPlatform() {
  // uni-app 环境判断
  // H5: 'h5', 微信小程序: 'mp-weixin', 等
  return process.env.UNI_PLATFORM || 'h5'
}

/**
 * H5 环境：初始化 IndexedDB 数据库
 * @returns {Promise<IDBDatabase>}
 */
async function openDatabase() {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      console.error('[ImageCache] IndexedDB open error:', event.target.error)
      reject(event.target.error)
    }

    request.onsuccess = (event) => {
      dbInstance = event.target.result
      console.log('[ImageCache] IndexedDB opened successfully')
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // 创建 object store（存储图片数据）
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        const store = db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'url' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        console.log('[ImageCache] Object store created:', CACHE_STORE_NAME)
      }
    }
  })
}

/**
 * 保存图片到本地缓存
 * @param {string} minioUrl - MinIO 图片 URL
 * @param {string} tempFilePath - 临时文件路径（uni.chooseImage 返回的路径）
 * @returns {Promise<string>} 本地缓存路径/Blob URL
 */
export async function saveImageCache(minioUrl, tempFilePath) {
  try {
    console.log('[ImageCache] Saving image...', { minioUrl, tempFilePath })

    // 检查输入参数
    if (!minioUrl || !tempFilePath) {
      console.error('[ImageCache] Invalid parameters:', { minioUrl, tempFilePath })
      return null
    }

    const platform = getPlatform()
    console.log('[ImageCache] Current platform:', platform)

    let cacheValue = null

    // H5 环境：存储到 IndexedDB
    if (platform === 'h5') {
      cacheValue = await saveToIndexedDB(minioUrl, tempFilePath)
      console.log('[ImageCache] H5 mode: saved to IndexedDB')
    } else {
      // 小程序环境：使用 uni.saveFile 保存到本地
      cacheValue = await new Promise((resolve, reject) => {
        uni.saveFile({
          tempFilePath,
          success(res) {
            console.log('[ImageCache] MP mode: file saved:', res.savedFilePath)
            resolve(res.savedFilePath)
          },
          fail(err) {
            console.error('[ImageCache] saveFile failed:', err)
            reject(err)
          }
        })
      })
    }

    if (!cacheValue) {
      console.error('[ImageCache] Cache value is null')
      return null
    }

    console.log('[ImageCache] ✅ Saved successfully:', minioUrl, '→', cacheValue.substring(0, 50) + '...')
    return cacheValue
  } catch (err) {
    console.error('[ImageCache] ❌ Save failed:', err)
    return null
  }
}

/**
 * H5 环境：将图片存储到 IndexedDB（Blob 格式）
 * @param {string} minioUrl - MinIO URL
 * @param {string} tempFilePath - 临时文件路径
 * @returns {Promise<string>} Blob URL
 */
async function saveToIndexedDB(minioUrl, tempFilePath) {
  try {
    // 1. 读取临时文件并转换为 Blob
    const blob = await fetchBlob(tempFilePath)

    // 2. 打开数据库
    const db = await openDatabase()

    // 3. 存储到 IndexedDB
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(CACHE_STORE_NAME)

      const data = {
        url: minioUrl, // 主键
        blob: blob, // Blob 对象
        timestamp: Date.now(), // 存储时间
        size: blob.size, // 文件大小
      }

      const request = store.put(data)

      request.onsuccess = () => {
        console.log('[ImageCache] IndexedDB put success:', minioUrl)
        // 4. 创建 Blob URL 用于显示
        const blobUrl = URL.createObjectURL(blob)
        resolve(blobUrl)
      }

      request.onerror = (event) => {
        console.error('[ImageCache] IndexedDB put error:', event.target.error)
        reject(event.target.error)
      }
    })
  } catch (err) {
    console.error('[ImageCache] saveToIndexedDB failed:', err)
    throw err
  }
}

/**
 * H5 环境：从文件路径读取 Blob 对象
 * @param {string} tempFilePath - 临时文件路径
 * @returns {Promise<Blob>}
 */
async function fetchBlob(tempFilePath) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', tempFilePath, true)
    xhr.responseType = 'blob'

    xhr.onload = function() {
      if (this.status === 200) {
        const blob = this.response
        console.log('[ImageCache] Blob fetched, size:', blob.size)
        resolve(blob)
      } else {
        console.error('[ImageCache] XHR status error:', this.status)
        reject(new Error('XHR failed with status: ' + this.status))
      }
    }

    xhr.onerror = function(err) {
      console.error('[ImageCache] XHR error:', err)
      reject(err)
    }

    xhr.send()
  })
}

/**
 * 从本地缓存加载图片
 * @param {string} minioUrl - MinIO 图片 URL
 * @returns {string|null} 本地缓存路径/Blob URL（不存在返回 null）
 */
export function loadImageCache(minioUrl) {
  return new Promise(async (resolve) => {
    try {
      console.log('[ImageCache] Loading cache for:', minioUrl)

      if (!minioUrl) {
        console.warn('[ImageCache] Empty URL provided')
        resolve(null)
        return
      }

      const platform = getPlatform()

      // H5 环境：从 IndexedDB 加载
      if (platform === 'h5') {
        const blobUrl = await loadFromIndexedDB(minioUrl)
        if (blobUrl) {
          console.log('[ImageCache] ✅ IndexedDB cache found:', minioUrl)
          resolve(blobUrl)
        } else {
          console.log('[ImageCache] ❌ No IndexedDB cache found for:', minioUrl)
          resolve(null)
        }
      } else {
        // 小程序环境：从文件系统加载
        // 注意：小程序需要在启动时从缓存映射表读取路径
        // 这里暂时返回 null，小程序环境建议使用 uni.saveFile 的持久化路径
        console.log('[ImageCache] MP mode: file system cache not implemented')
        resolve(null)
      }
    } catch (err) {
      console.error('[ImageCache] Load failed:', err)
      resolve(null)
    }
  })
}

/**
 * H5 环境：从 IndexedDB 加载 Blob 并创建 URL
 * @param {string} minioUrl - MinIO URL
 * @returns {Promise<string|null>} Blob URL
 */
async function loadFromIndexedDB(minioUrl) {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readonly')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.get(minioUrl)

      request.onsuccess = (event) => {
        const data = event.target.result

        if (data && data.blob) {
          // 创建 Blob URL 用于显示
          const blobUrl = URL.createObjectURL(data.blob)
          console.log(
            '[ImageCache] IndexedDB load success:',
            minioUrl,
            'size:',
            data.size,
            'timestamp:',
            new Date(data.timestamp).toLocaleString()
          )
          resolve(blobUrl)
        } else {
          resolve(null)
        }
      }

      request.onerror = (event) => {
        console.error('[ImageCache] IndexedDB get error:', event.target.error)
        reject(event.target.error)
      }
    })
  } catch (err) {
    console.error('[ImageCache] loadFromIndexedDB failed:', err)
    return null
  }
}

/**
 * 清除所有图片缓存
 */
export async function clearAllImageCache() {
  try {
    const platform = getPlatform()

    if (platform === 'h5') {
      const db = await openDatabase()
      const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('[ImageCache] ✅ IndexedDB cleared')
      }

      request.onerror = (event) => {
        console.error('[ImageCache] IndexedDB clear error:', event.target.error)
      }
    } else {
      // 小程序环境：清理文件缓存
      console.log('[ImageCache] MP mode: clear not implemented')
    }
  } catch (err) {
    console.error('[ImageCache] Clear failed:', err)
  }
}

/**
 * 获取缓存统计信息
 * @returns {Promise<Object>} { count: number, urls: Array<string>, platform: string, totalSize: number }
 */
export async function getCacheStats() {
  try {
    const platform = getPlatform()

    if (platform === 'h5') {
      const db = await openDatabase()

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([CACHE_STORE_NAME], 'readonly')
        const store = transaction.objectStore(CACHE_STORE_NAME)
        const request = store.getAll()

        request.onsuccess = (event) => {
          const items = event.target.result || []
          const urls = items.map((item) => item.url)
          const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0)

          console.log('[ImageCache] Cache stats:', {
            platform,
            count: urls.length,
            totalSize: (totalSize / 1024).toFixed(2) + ' KB',
            urls,
          })

          resolve({
            platform,
            count: urls.length,
            urls,
            totalSize,
          })
        }

        request.onerror = (event) => {
          console.error('[ImageCache] IndexedDB getAll error:', event.target.error)
          reject(event.target.error)
        }
      })
    } else {
      return { platform, count: 0, urls: [], totalSize: 0 }
    }
  } catch (err) {
    console.error('[ImageCache] Get stats failed:', err)
    return { platform: 'unknown', count: 0, urls: [], totalSize: 0 }
  }
}