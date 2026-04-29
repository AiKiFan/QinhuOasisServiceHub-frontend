/**
 * 用户相关接口
 * @author AiKiFan
 */
import { get } from '@/utils/request'

/**
 * 获取当前登录用户信息（需要 Token）
 * 接口：GET /api/users/me
 * @returns {Promise<{userId:number, username:string, nickname:string, role:number, avatar:string}>}
 */
export function getMyProfile() {
  return get('/users/me')
}
