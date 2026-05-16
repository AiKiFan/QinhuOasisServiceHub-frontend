/**
 * 认证相关接口
 * @author AiKiFan
 */
import { post } from '@/utils/request'

/**
 * 用户登录
 * 接口：POST /api/auth/login
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{token:string, userId:number, username:string, nickname:string, role:number, avatar:string, expiresIn:number}>}
 */
export function login(username, password) {
  return post('/auth/login', { username, password })
}

/**
 * 用户注册
 * 接口：POST /api/auth/register
 * @param {string} username
 * @param {string} password
 * @param {string} [nickname='']
 * @param {object} [options={}]
 * @param {boolean} [options.silent=false] - 静默模式，不弹出错误提示
 * @returns {Promise<null>}
 */
export function register(username, password, nickname = '', options = {}) {
  return post('/auth/register', { username, password, nickname }, options)
}
