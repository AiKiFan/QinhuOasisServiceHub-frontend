/**
 * 餐厅相关接口
 * @author AiKiFan
 */
import { get } from '@/utils/request'

/** 排行榜默认返回数量 */
const DEFAULT_RANK_TOP = 10

/** 列表每页默认条数 */
const DEFAULT_PAGE_SIZE = 10

/**
 * 获取餐厅人气排行榜
 * 接口：GET /api/restaurants/rank?top={top}
 * @param {number} [top=DEFAULT_RANK_TOP] - 返回前 N 名
 * @returns {Promise<Array>}
 */
export function getRestaurantRank(top = DEFAULT_RANK_TOP) {
  return get('/restaurants/rank', { top })
}

/**
 * 获取餐厅列表（支持分类筛选 + 分页）
 * 接口：GET /api/restaurants?category=&page=1&size=10
 * @param {string} [category=''] - 分类名称，空字符串查全部
 * @param {number} [page=1]
 * @param {number} [size=DEFAULT_PAGE_SIZE]
 * @returns {Promise<{total:number, list:Array}>}
 */
export async function getRestaurantList(category = '', page = 1, size = DEFAULT_PAGE_SIZE) {
  const params = { page, size }
  if (category) params.category = category
  const data = await get('/restaurants', params)
  // 确保返回的数据结构一致，避免null/undefined导致的问题
  return {
    list: data?.list || [],
    total: data?.total || 0
  }
}

/**
 * 获取餐厅详情
 * 接口：GET /api/restaurants/{id}
 * @param {number|string} id - 餐厅 ID
 * @returns {Promise<Object>}
 */
export function getRestaurantDetail(id) {
  return get(`/restaurants/${id}`)
}
