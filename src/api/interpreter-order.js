/**
 * 译员订单相关接口
 * @author AiKiFan
 */
import { get, post } from '@/utils/request'

/**
 * 预约译员服务
 * 接口：POST /api/interpreter-orders
 * @param {Object} data - 订单数据
 * @param {number} data.profileId - 译员档案 ID
 * @param {number} data.serviceType - 服务类型：1=个人 2=团队
 * @param {number} data.groupSize - 团队人数（个人填 1）
 * @param {string} data.startTime - 开始时间（ISO 格式）
 * @param {string} data.endTime - 结束时间（ISO 格式）
 * @param {string} [data.remark] - 备注
 * @returns {Promise<Object>}
 */
export function createInterpreterOrder(data) {
  return post('/interpreter-orders', data)
}

/**
 * 获取我的翻译订单列表
 * 接口：GET /api/interpreter-orders/mine?page=1&size=10
 * @param {number} [page=1] - 页码
 * @param {number} [size=10] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function getMyInterpreterOrders(page = 1, size = 10) {
  return get('/interpreter-orders/mine', { page, size })
}

/**
 * 译员接单
 * 接口：POST /api/interpreter-orders/{id}/accept
 * @param {number|string} id - 订单 ID
 * @returns {Promise<null>}
 */
export function acceptInterpreterOrder(id) {
  return post(`/interpreter-orders/${id}/accept`)
}

/**
 * 取消翻译订单
 * 接口：POST /api/interpreter-orders/{id}/cancel
 * @param {number|string} id - 订单 ID
 * @returns {Promise<null>}
 */
export function cancelInterpreterOrder(id) {
  return post(`/interpreter-orders/${id}/cancel`)
}