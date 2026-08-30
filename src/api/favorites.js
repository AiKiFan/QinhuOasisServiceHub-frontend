/**
 * 收藏相关API
 * @author AiKiFan
 */
import { get, post, del } from '@/utils/request'

/**
 * 获取所有收藏（分类型返回）
 */
export function getAllFavorites() {
  return get('/favorites')
}

/**
 * 获取指定类型的收藏列表
 * @param {string} type - restaurant/interpreter/scenic/travel_guide
 * @param {number} page - 页码
 * @param {number} size - 每页数量
 */
export function getFavoritesByType(type, page = 1, size = 20) {
  return get(`/favorites/${type}`, { page, size })
}

/**
 * 添加收藏
 * @param {string} targetType - restaurant/interpreter/scenic/travel_guide
 * @param {number} targetId - 目标ID
 * @param {number} [folderId] - 收藏夹ID（可选）
 */
export function addFavorite(targetType, targetId, folderId = null) {
  const data = { targetType, targetId }
  if (folderId) data.folderId = folderId
  return post('/favorites', data)
}

/**
 * 删除收藏
 * @param {string} targetType - restaurant/interpreter/scenic/travel_guide
 * @param {number} targetId - 目标ID
 */
export function removeFavorite(targetType, targetId) {
  return del(`/favorites/${targetType}/${targetId}`)
}

/**
 * 检查是否已收藏
 * @param {string} targetType - restaurant/interpreter/scenic/travel_guide
 * @param {number} targetId - 目标ID
 */
export function checkFavorite(targetType, targetId) {
  return get(`/favorites/check/${targetType}/${targetId}`)
}

/** 收藏类型常量 */
export const FAVORITE_TYPE = {
  RESTAURANT: 'restaurant',
  INTERPRETER: 'interpreter',
  SCENIC: 'scenic',
  TRAVEL_GUIDE: 'travel_guide',
}
