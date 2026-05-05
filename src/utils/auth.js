/**
 * 权限拦截工具
 * 处理登录态验证、路由拦截、权限校验
 * @author AiKiFan
 */

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

/**
 * 获取 token
 */
function getToken() {
  return uni.getStorageSync(TOKEN_KEY)
}

/**
 * 获取当前用户信息
 */
function getUser() {
  try {
    const u = uni.getStorageSync(USER_KEY)
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

/**
 * 检查用户登录状态
 * @returns {boolean}
 */
function isLoggedIn() {
  return !!getToken()
}

/**
 * 登出 - 清除本地存储
 */
function logout() {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
}

/**
 * 保存 token（单独保存）
 * @param {string} token
 */
function saveToken(token) {
  uni.setStorageSync(TOKEN_KEY, token)
}

/**
 * 保存登录信息
 * @param {string} token
 * @param {Object} user
 */
function saveLogin(token, user) {
  uni.setStorageSync(TOKEN_KEY, token)
  uni.setStorageSync(USER_KEY, JSON.stringify(user))
}

/**
 * 保存用户信息（不更新 token）
 * @param {Object} user
 */
function saveUser(user) {
  uni.setStorageSync(USER_KEY, JSON.stringify(user))
}

/**
 * 检查用户角色
 * 后端 role 字段：0=普通用户 1=译员 2=管理员（数字）
 * @param {string} role - admin | interpreter
 * @returns {boolean}
 */
function hasRole(role) {
  const user = getUser()
  if (!user) return false
  const userRole = user.role
  // 兼容数字（后端）与字符串两种格式
  if (role === 'admin') return userRole === 'admin' || userRole === 2
  if (role === 'interpreter') return userRole === 'interpreter' || userRole === 1 || userRole === 'admin' || userRole === 2
  return false
}

/**
 * 是否是认证讲解员（role=1）
 */
function isInterpreter() {
  const user = getUser()
  return user?.role === 1 || user?.role === 'interpreter'
}

/**
 * 是否是管理员（role=2）
 */
function isAdmin() {
  const user = getUser()
  return user?.role === 2 || user?.role === 'admin'
}

/**
 * 需要登录时跳转到登录页
 */
function requireLogin() {
  if (!isLoggedIn()) {
    uni.showModal({
      title: '提示',
      content: '请先登录',
      confirmText: '去登录',
      success(res) {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/index' })
        }
      }
    })
    return false
  }
  return true
}

export {
  getToken,
  getUser,
  isLoggedIn,
  logout,
  saveToken,
  saveLogin,
  saveUser,
  hasRole,
  isInterpreter,
  isAdmin,
  requireLogin
}

export default {
  getToken,
  getUser,
  isLoggedIn,
  logout,
  saveToken,
  saveLogin,
  saveUser,
  hasRole,
  isInterpreter,
  isAdmin,
  requireLogin
}
