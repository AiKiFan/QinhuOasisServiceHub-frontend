/**
 * 认证工具函数 —— Token 与用户信息本地存取
 * @author AiKiFan
 */

/** Token 在 Storage 中的键名 */
const STORAGE_KEY_TOKEN = 'qinhu_token'
/** 用户信息在 Storage 中的键名 */
const STORAGE_KEY_USER = 'qinhu_user'

/** 持久化 Token */
export function saveToken(token) {
  uni.setStorageSync(STORAGE_KEY_TOKEN, token)
}

/** 读取 Token；未登录返回空字符串 */
export function getToken() {
  return uni.getStorageSync(STORAGE_KEY_TOKEN) || ''
}

/** 删除 Token */
export function removeToken() {
  uni.removeStorageSync(STORAGE_KEY_TOKEN)
}

/** 是否已登录 */
export function isLoggedIn() {
  return Boolean(getToken())
}

/**
 * 持久化用户信息
 * @param {{ userId:number, username:string, nickname:string, role:number, avatar:string }} user
 */
export function saveUser(user) {
  uni.setStorageSync(STORAGE_KEY_USER, user)
}

/**
 * 读取缓存的用户信息；未登录返回 null
 * @returns {{ userId:number, username:string, nickname:string, role:number, avatar:string }|null}
 */
export function getUser() {
  return uni.getStorageSync(STORAGE_KEY_USER) || null
}

/** 清除用户信息缓存 */
export function removeUser() {
  uni.removeStorageSync(STORAGE_KEY_USER)
}

/** 完整登出：同时清除 Token 和用户信息 */
export function logout() {
  removeToken()
  removeUser()
}
