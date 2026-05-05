/**
 * 收藏夹分组/标签管理API
 * @author AiKiFan
 */

import { get, post, put, del } from '@/utils/request'

/**
 * 获取收藏夹分组列表
 * @returns {Promise}
 */
export function getFavoriteFolders() {
  return get('/api/favorite-folders')
}

/**
 * 创建收藏夹分组
 * @param {Object} data 分组数据 { name, description, color, icon }
 * @returns {Promise}
 */
export function createFavoriteFolder(data) {
  return post('/api/favorite-folders', data)
}

/**
 * 更新收藏夹分组
 * @param {number} id 分组ID
 * @param {Object} data 更新数据
 * @returns {Promise}
 */
export function updateFavoriteFolder(id, data) {
  return put(`/api/favorite-folders/${id}`, data)
}

/**
 * 删除收藏夹分组
 * @param {number} id 分组ID
 * @returns {Promise}
 */
export function deleteFavoriteFolder(id) {
  return del(`/api/favorite-folders/${id}`)
}

/**
 * 获取分组内的收藏列表
 * @param {number} folderId 分组ID
 * @returns {Promise}
 */
export function getFolderFavorites(folderId) {
  return get(`/api/favorite-folders/${folderId}/favorites`)
}

/**
 * 将收藏移动到分组
 * @param {number} favoriteId 收藏ID
 * @param {number} folderId 分组ID
 * @returns {Promise}
 */
export function moveFavoriteToFolder(favoriteId, folderId) {
  return post(`/api/favorites/${favoriteId}/move`, { folderId })
}

/**
 * 批量移动收藏
 * @param {Array} favoriteIds 收藏ID数组
 * @param {number} folderId 目标分组ID
 * @returns {Promise}
 */
export function batchMoveFavorites(favoriteIds, folderId) {
  return post('/api/favorites/batch-move', { favoriteIds, folderId })
}

/**
 * 获取收藏标签列表
 * @returns {Promise}
 */
export function getFavoriteTags() {
  return get('/api/favorite-tags')
}

/**
 * 创建收藏标签
 * @param {Object} data 标签数据 { name, color }
 * @returns {Promise}
 */
export function createFavoriteTag(data) {
  return post('/api/favorite-tags', data)
}

/**
 * 删除收藏标签
 * @param {number} id 标签ID
 * @returns {Promise}
 */
export function deleteFavoriteTag(id) {
  return del(`/api/favorite-tags/${id}`)
}

/**
 * 为收藏添加标签
 * @param {number} favoriteId 收藏ID
 * @param {Array} tagIds 标签ID数组
 * @returns {Promise}
 */
export function addTagsToFavorite(favoriteId, tagIds) {
  return post(`/api/favorites/${favoriteId}/tags`, { tagIds })
}

/**
 * 按标签筛选收藏
 * @param {Array} tagIds 标签ID数组
 * @returns {Promise}
 */
export function getFavoritesByTags(tagIds) {
  return post('/api/favorites/by-tags', { tagIds })
}
