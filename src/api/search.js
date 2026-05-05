/**
 * 搜索相关接口
 * 支持餐厅搜索、译员搜索
 * @author AiKiFan
 */
import { get } from '@/utils/request'

/**
 * 搜索餐厅
 * 接口：GET /api/restaurants?keyword=xxx&page=1&size=10
 * @param {string} keyword - 搜索关键词
 * @param {number} [page=1] - 页码
 * @param {number} [size=10] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function searchRestaurants(keyword, page = 1, size = 10) {
  return get('/restaurants', { keyword, page, size })
}

/**
 * 搜索译员
 * 接口：GET /api/interpreters?keyword=xxx&page=1&size=10
 * @param {string} keyword - 搜索关键词
 * @param {number} [page=1] - 页码
 * @param {number} [size=10] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function searchInterpreters(keyword, page = 1, size = 10) {
  return get('/interpreters', { keyword, page, size })
}
