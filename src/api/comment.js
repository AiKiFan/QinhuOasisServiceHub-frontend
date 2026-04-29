/**
 * 评论/评价相关接口
 * @author AiKiFan
 */
import { get, post } from '@/utils/request'

/** 评论目标类型：餐厅 */
const COMMENT_TARGET_RESTAURANT = 1

/** 评论每页默认条数 */
const DEFAULT_COMMENT_PAGE_SIZE = 20

/**
 * 获取餐厅评论列表（无需登录）
 * 接口：GET /api/comments?targetId=&targetType=1&page=1&size=20
 * @param {number|string} restaurantId - 餐厅 ID
 * @param {number} [page=1]
 * @param {number} [size=DEFAULT_COMMENT_PAGE_SIZE]
 * @returns {Promise<{total:number, list:Array}>}
 */
export function getRestaurantComments(restaurantId, page = 1, size = DEFAULT_COMMENT_PAGE_SIZE) {
  return get('/comments', {
    targetId: restaurantId,
    targetType: COMMENT_TARGET_RESTAURANT,
    page,
    size,
  })
}

/**
 * 发表餐厅评论（需登录）
 * 接口：POST /api/comments
 * @param {number|string} restaurantId - 餐厅 ID
 * @param {string} content - 评论内容（1-1000字）
 * @param {number} rating - 评分（1-5星）
 * @returns {Promise<Object>}
 */
export function createRestaurantComment(restaurantId, content, rating) {
  return post('/comments', {
    targetId: restaurantId,
    targetType: COMMENT_TARGET_RESTAURANT,
    content,
    rating,
  })
}
