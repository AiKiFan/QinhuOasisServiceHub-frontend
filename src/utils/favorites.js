/**
 * 收藏功能工具函数
 * 使用 localStorage 存储收藏数据（前端收藏，无需后端接口）
 * @author AiKiFan
 */

const STORAGE_KEY_FAVORITES = 'qinhu_favorites'

/** 收藏目标类型 */
export const FAVORITE_TYPE = {
  RESTAURANT: 'restaurant',
  INTERPRETER: 'interpreter',
  SCENIC: 'scenic',
}

/**
 * 获取所有收藏
 * @returns {Array<{id:string, type:string, data:object, time:number}>}
 */
export function getAllFavorites() {
  return uni.getStorageSync(STORAGE_KEY_FAVORITES) || []
}

/**
 * 保存收藏列表
 * @param {Array} list
 */
function saveFavorites(list) {
  uni.setStorageSync(STORAGE_KEY_FAVORITES, list)
}

/**
 * 添加收藏
 * @param {string|number} id - 目标 ID
 * @param {string} type - FAVORITE_TYPE
 * @param {object} data - 缓存的数据（名称、封面等）
 */
export function addFavorite(id, type, data = {}) {
  const list = getAllFavorites()
  const key = `${type}_${id}`
  // 去重
  if (list.some(f => f.key === key)) return
  list.unshift({
    key,
    id: String(id),
    type,
    data,
    time: Date.now(),
  })
  saveFavorites(list)
}

/**
 * 移除收藏
 * @param {string|number} id
 * @param {string} type
 */
export function removeFavorite(id, type) {
  const key = `${type}_${id}`
  const list = getAllFavorites().filter(f => f.key !== key)
  saveFavorites(list)
}

/**
 * 检查是否已收藏
 * @param {string|number} id
 * @param {string} type
 * @returns {boolean}
 */
export function isFavorited(id, type) {
  const key = `${type}_${id}`
  return getAllFavorites().some(f => f.key === key)
}

/**
 * 切换收藏状态
 * @param {string|number} id
 * @param {string} type
 * @param {object} data
 * @returns {boolean} 收藏后的状态（true=已收藏, false=未收藏）
 */
export function toggleFavorite(id, type, data = {}) {
  if (isFavorited(id, type)) {
    removeFavorite(id, type)
    return false
  } else {
    addFavorite(id, type, data)
    return true
  }
}
