/**
 * 管理端相关接口（role=2 管理员专用）
 * @author AiKiFan
 */
import { get, post } from '@/utils/request'

/**
 * 获取译员申请列表
 * 接口：GET /api/admin/interpreter-profiles?status=&page=1&size=10
 * @param {Object} [params={}] - 查询参数
 * @param {number} [params.status] - 状态筛选：0=待审核 1=已通过 2=已拒绝 3=暂停
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.size=10] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function getAdminInterpreterProfiles(params = {}) {
  return get('/admin/interpreter-profiles', params)
}

/**
 * 审核译员申请
 * 接口：POST /api/admin/interpreter-profiles/{id}/review?approve=true&rejectReason=
 * @param {number|string} id - 译员档案 ID
 * @param {boolean} approve - true=通过 false=拒绝
 * @param {string} [rejectReason] - 拒绝原因（拒绝时必填）
 * @returns {Promise<null>}
 */
export function reviewInterpreterProfile(id, approve, rejectReason = '') {
  const query = approve ? '?approve=true' : `?approve=false&rejectReason=${encodeURIComponent(rejectReason)}`
  return post(`/admin/interpreter-profiles/${id}/review${query}`, {})
}

/**
 * 获取投诉建议列表
 * 接口：GET /api/admin/feedback?status=&feedbackType=&page=1&size=20
 * @param {Object} [params={}] - 查询参数
 * @param {number} [params.status] - 状态筛选：0=待处理 1=处理中 2=已解决 3=已关闭
 * @param {number} [params.feedbackType] - 类型筛选：1=投诉 2=建议 3=咨询 4=其他
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.size=20] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function getAdminFeedbackList(params = {}) {
  return get('/admin/feedback', params)
}

/**
 * 回复投诉建议
 * 接口：POST /api/admin/feedback/{id}/reply
 * @param {number|string} id - 反馈 ID
 * @param {Object} data - 回复数据
 * @param {string} data.replyContent - 回复内容
 * @param {number} data.status - 状态：1=处理中 2=已解决 3=已关闭
 * @returns {Promise<null>}
 */
export function replyFeedback(id, data) {
  return post(`/admin/feedback/${id}/reply`, data)
}