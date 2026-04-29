/**
 * 评论相关接口
 * @author AiKiFan
 */
import { get, post } from '@/utils/request'

/** 评论列表默认每页条数 */
const DEFAULT_PAGE_SIZE = 20

/** 评论目标类型枚举 */
export const COMMENT_TARGET_TYPE = {
  RESTAURANT: 1,
  POST: 2,
  INTERPRETER_ORDER: 3,
  PARKING_ORDER: 4,
  INTERPRETER: 5, // 译员档案评论
}

/**
 * 获取评论列表（分页，返回一级评论）
 * 接口：GET /api/comments?targetId=&targetType=&page=1&size=20
 * @param {Object} params - 查询参数
 * @param {number|string} params.targetId - 目标 ID
 * @param {number} params.targetType - 目标类型：1=餐厅 2=攻略 3=译员订单 4=车位订单
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.size=DEFAULT_PAGE_SIZE] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function getCommentList(params) {
  const { targetId, targetType, page = 1, size = DEFAULT_PAGE_SIZE } = params
  return get('/comments', { targetId, targetType, page, size })
}

/**
 * 发表评论/评价
 * 接口：POST /api/comments
 * @param {Object} data - 评论数据
 * @param {number} data.targetId - 目标 ID
 * @param {number} data.targetType - 目标类型
 * @param {string} data.content - 评论内容
 * @param {number} [data.rating] - 评分（1-5）
 * @param {string[]} [data.images] - 图片 URL 列表
 * @param {number|null} [data.parentId] - 父评论 ID（回复时填写）
 * @param {number|null} [data.orderId] - 关联订单 ID（订单评价时填写）
 * @returns {Promise<Object>}
 */
export function postComment(data) {
  return post('/comments', data)
}