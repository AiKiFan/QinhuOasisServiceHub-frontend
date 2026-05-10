/**
 * HTTP 请求封装工具
 * 统一处理 baseUrl、请求头及响应格式 { code, message, data }
 * @author AiKiFan
 */

import { getToken } from '@/utils/auth'
import { getLanguage } from '@/utils/i18n'

/** API 基础路径 - 自动识别当前访问的 host（电脑用 localhost，手机用局域网 IP） */
// #ifdef H5
const BASE_URL = `${location.protocol}//${location.hostname}:8080/api`
// #endif
// #ifndef H5
const BASE_URL = 'http://localhost:8080/api'
// #endif

/** 业务成功状态码 */
const HTTP_SUCCESS_CODE = 200

/**
 * 发起统一请求
 * @param {string} url - 接口路径（相对于 BASE_URL）
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method - HTTP 方法
 * @param {object} data - 请求参数或请求体
 * @param {object} [header={}] - 自定义请求头
 * @param {object} [options={}] - 额外选项
 * @param {boolean} [options.silent=false] - 是否静默失败（不显示错误提示）
 * @param {number} [options.timeout=30000] - 请求超时时间（毫秒）
 * @returns {Promise<any>} 解析后的 data 字段
 */
function request(url, method = 'GET', data = {}, header = {}, options = {}) {
  const { silent = false, timeout = 30000 } = options

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      timeout,
      header: {
        'Content-Type': 'application/json',
        'Accept-Language': getLanguage(),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...header,
      },
      success(res) {
        const body = res.data
        if (body && body.code === HTTP_SUCCESS_CODE) {
          resolve(body.data)
        } else {
          const msg = (body && body.message) || '请求失败'
          console.error('API Error:', url, body?.code, msg)
          if (!silent) {
            uni.showToast({ title: msg, icon: 'none' })
          }
          reject(new Error(msg))
        }
      },
      fail(err) {
        console.error('Network Error:', url, err)
        if (!silent) {
          uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        }
        reject(err)
      },
    })
  })
}

/**
 * GET 请求简写
 * @param {string} url
 * @param {object} [params={}]
 * @returns {Promise<any>}
 */
export function get(url, params = {}) {
  return request(url, 'GET', params)
}

/**
 * POST 请求简写
 * @param {string} url
 * @param {object} [body={}]
 * @returns {Promise<any>}
 */
export function post(url, body = {}) {
  return request(url, 'POST', body)
}

/**
 * PUT 请求简写
 * @param {string} url
 * @param {object} [body={}]
 * @returns {Promise<any>}
 */
export function put(url, body = {}) {
  return request(url, 'PUT', body)
}

/**
 * DELETE 请求简写
 * @param {string} url
 * @param {object} [params={}]
 * @returns {Promise<any>}
 */
export function del(url, params = {}) {
  return request(url, 'DELETE', params)
}
