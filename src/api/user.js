/**
 * 用户相关接口
 * @author AiKiFan
 */
import { get, put } from '@/utils/request'

/**
 * 获取当前登录用户信息（需要 Token）
 * 接口：GET /api/users/me
 * @returns {Promise<{userId:number, username:string, nickname:string, role:number, avatar:string}>}
 */
export function getMyProfile() {
  return get('/users/me')
}

/**
 * 更新当前登录用户信息
 * 接口：PUT /api/users/me
 * @param {Object} data - 用户数据
 * @param {string} [data.nickname] - 昵称
 * @param {string} [data.email] - 邮箱
 * @param {string} [data.avatar] - 头像 URL
 * @returns {Promise<Object>}
 */
export function updateMyProfile(data) {
  return put('/users/me', data)
}
