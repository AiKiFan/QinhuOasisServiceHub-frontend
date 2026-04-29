/**
 * HTTP 请求封装工具
 * 统一处理 baseUrl、请求头及响应格式 { code, message, data }
 * @author AiKiFan
 */

import { getToken } from '@/utils/auth'
import { getLanguage } from '@/utils/i18n'

/** API 基础路径（H5 模式通过 devServer proxy 转发） */
const BASE_URL = '/api'

/** 业务成功状态码 */
const HTTP_SUCCESS_CODE = 200

/**
 * 发起统一请求
 * @param {string} url - 接口路径（相对于 BASE_URL）
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method - HTTP 方法
 * @param {object} data - 请求参数或请求体
 * @param {object} [header={}] - 自定义请求头
 * @returns {Promise<any>} 解析后的 data 字段
 */
function request(url, method = 'GET', data = {}, header = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
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
          uni.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        }
      },
      fail(err) {
        uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
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
