/**
 * 图片本地缓存工具（开发环境降级方案）
 *
 * 功能：
 * 1. 上传成功后保存图片到本地
 * 2. MinIO 加载失败时从本地缓存读取
 * 3. 管理 URL 映射表（MinIO URL ↔ 本地路径/base64）
 *
 * ⚠️ 局限性：
 * - 仅适用于开发环境
 * - H5 环境使用 base64 + localStorage（上限约 5MB）
 * - 小程序环境使用 uni.saveFile（上限 200MB）
 * - 清除缓存/换设备后图片丢失
 * - 生产环境必须使用云存储或 MinIO 常驻运行
 *
 * @author AiKiFan
 */

const CACHE_MAP_KEY = 'image_cache_map'

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
 * 保存图片到本地缓存
 * @param {string} minioUrl - MinIO 图片 URL
 * @param {string} tempFilePath - 临时文件路径（uni.chooseImage 返回的路径）
 * @returns {Promise<string>} 本地缓存路径/base64
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

    // H5 环境：转换为 base64 存储到 localStorage
    if (platform === 'h5') {
      cacheValue = await convertToBase64(tempFilePath)
      console.log('[ImageCache] H5 mode: saved as base64, length:', cacheValue?.length || 0)
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

    // 更新 URL 映射表
    const cacheMap = uni.getStorageSync(CACHE_MAP_KEY) || {}
    cacheMap[minioUrl] = cacheValue
    uni.setStorageSync(CACHE_MAP_KEY, cacheMap)

    console.log('[ImageCache] Cache map updated, total entries:', Object.keys(cacheMap).length)
    console.log('[ImageCache] ✅ Saved successfully:', minioUrl, '→', cacheValue.substring(0, 50) + '...')
    return cacheValue
  } catch (err) {
    console.error('[ImageCache] ❌ Save failed:', err)
    return null
  }
}

/**
 * 将图片临时文件转换为 base64（H5 环境使用）
 * @param {string} tempFilePath - 临时文件路径
 * @returns {Promise<string>} base64 字符串
 */
async function convertToBase64(tempFilePath) {
  return new Promise((resolve, reject) => {
    // H5 环境：使用 XMLHttpRequest 读取文件并转换
    const xhr = new XMLHttpRequest()
    xhr.open('GET', tempFilePath, true)
    xhr.responseType = 'blob'

    xhr.onload = function() {
      if (this.status === 200) {
        const blob = this.response
        const reader = new FileReader()

        reader.onloadend = function() {
          const base64 = reader.result
          console.log('[ImageCache] Base64 conversion success, size:', base64.length)
          resolve(base64)
        }

        reader.onerror = function(err) {
          console.error('[ImageCache] FileReader error:', err)
          reject(err)
        }

        reader.readAsDataURL(blob)
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
 * @returns {string|null} 本地缓存路径/base64（不存在返回 null）
 */
export function loadImageCache(minioUrl) {
  try {
    console.log('[ImageCache] Loading cache for:', minioUrl)

    if (!minioUrl) {
      console.warn('[ImageCache] Empty URL provided')
      return null
    }

    const cacheMap = uni.getStorageSync(CACHE_MAP_KEY) || {}
    const cachedValue = cacheMap[minioUrl]

    if (cachedValue) {
      console.log('[ImageCache] ✅ Cache found:', minioUrl, '→', cachedValue.substring(0, 50) + '...')
      return cachedValue
    }

    console.log('[ImageCache] ❌ No cache found for:', minioUrl)
    console.log('[ImageCache] Current cache map entries:', Object.keys(cacheMap).length)
    return null
  } catch (err) {
    console.error('[ImageCache] Load failed:', err)
    return null
  }
}

/**
 * 清除所有图片缓存
 */
export function clearAllImageCache() {
  try {
    uni.removeStorageSync(CACHE_MAP_KEY)
    console.log('[ImageCache] ✅ Cache map cleared')
  } catch (err) {
    console.error('[ImageCache] Clear failed:', err)
  }
}

/**
 * 获取缓存统计信息
 * @returns {Object} { count: number, urls: Array<string>, platform: string }
 */
export function getCacheStats() {
  try {
    const cacheMap = uni.getStorageSync(CACHE_MAP_KEY) || {}
    const urls = Object.keys(cacheMap)
    const platform = getPlatform()

    console.log('[ImageCache] Cache stats:', { platform, count: urls.length, urls })

    return {
      platform,
      count: urls.length,
      urls,
    }
  } catch (err) {
    console.error('[ImageCache] Get stats failed:', err)
    return { platform: 'unknown', count: 0, urls: [] }
  }
}