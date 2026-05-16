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

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'url' })
      }
    }
  })
}

/**
 * 保存图片到本地缓存
 * @param {string} minioUrl - MinIO 图片 URL
 * @param {string} tempFilePath - 临时文件路径
 * @returns {Promise<string>} 本地缓存路径/Blob URL
 */
export async function saveImageCache(minioUrl, tempFilePath) {
  if (!minioUrl || !tempFilePath) {
    return null
  }

  const platform = getPlatform()

  try {
    let cacheValue = null

    if (platform === 'h5') {
      cacheValue = await saveToIndexedDB(minioUrl, tempFilePath)
    } else {
      cacheValue = await new Promise((resolve, reject) => {
        uni.saveFile({
          tempFilePath,
          success(res) {
            resolve(res.savedFilePath)
          },
          fail(err) {
            reject(err)
          }
        })
      })
    }

    return cacheValue || null
  } catch (err) {
    return null
  }
}

/**
 * H5 环境：将图片存储到 IndexedDB（Blob 格式）
 */
async function saveToIndexedDB(minioUrl, tempFilePath) {
  const blob = await fetchBlob(tempFilePath)
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(CACHE_STORE_NAME)

    const data = {
      url: minioUrl,
      blob,
      timestamp: Date.now(),
      size: blob.size,
    }

    const request = store.put(data)

    request.onsuccess = () => {
      const blobUrl = URL.createObjectURL(blob)
      resolve(blobUrl)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

/**
 * H5 环境：从文件路径读取 Blob 对象
 */
async function fetchBlob(tempFilePath) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', tempFilePath, true)
    xhr.responseType = 'blob'

    xhr.onload = function() {
      if (this.status === 200) {
        resolve(this.response)
      } else {
        reject(new Error('XHR failed with status: ' + this.status))
      }
    }

    xhr.onerror = function(err) {
      reject(err)
    }

    xhr.send()
  })
}

/**
 * 从本地缓存加载图片
 * @param {string} minioUrl - MinIO 图片 URL
 * @returns {string|null} 本地缓存路径/Blob URL
 */
export function loadImageCache(minioUrl) {
  return new Promise(async (resolve) => {
    if (!minioUrl) {
      resolve(null)
      return
    }

    const platform = getPlatform()

    if (platform === 'h5') {
      const blobUrl = await loadFromIndexedDB(minioUrl)
      resolve(blobUrl)
    } else {
      resolve(null)
    }
  })
}

/**
 * H5 环境：从 IndexedDB 加载 Blob 并创建 URL
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
          const blobUrl = URL.createObjectURL(data.blob)
          resolve(blobUrl)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  } catch (err) {
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
      store.clear()
    }
  } catch (err) {
    // ignore
  }
}

/**
 * 获取缓存统计信息
 * @returns {Promise<Object>} { count, urls, platform, totalSize }
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

          resolve({
            platform,
            count: urls.length,
            urls,
            totalSize,
          })
        }

        request.onerror = () => {
          reject(request.error)
        }
      })
    } else {
      return { platform, count: 0, urls: [], totalSize: 0 }
    }
  } catch (err) {
    return { platform: 'unknown', count: 0, urls: [], totalSize: 0 }
  }
}
