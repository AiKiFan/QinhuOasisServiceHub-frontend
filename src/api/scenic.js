/**
 * 景点API
 * @author AiKiFan
 */
import { get } from '@/utils/request'

/**
 * 获取景点列表
 */
export function getScenicSpotList(page = 1, size = 10) {
  return get(`/scenic-spots?page=${page}&size=${size}`)
}

/**
 * 获取景点详情
 */
export function getScenicSpotDetail(id) {
  return get(`/scenic-spots/${id}`)
}

/**
 * 搜索景点
 * 注意：后端景点列表API不支持keyword参数，需要在前端过滤
 * 接口：GET /api/scenic-spots?page=1&size=10
 * @param {string} keyword - 搜索关键词（前端过滤用）
 * @param {number} [page=1] - 页码
 * @param {number} [size=10] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function searchScenicSpots(keyword, page = 1, size = 10) {
  return get(`/scenic-spots?page=${page}&size=${size}`)
}