/**
 * 译员相关接口
 * @author AiKiFan
 */
import { get, post } from '@/utils/request'
import { getToken } from '@/utils/auth'

/** 译员列表每页默认条数 */
const DEFAULT_PAGE_SIZE = 10

/**
 * 获取译员列表（已通过审核的）
 * 接口：GET /api/interpreters?page=1&size=10
 * @param {number} [page=1] - 页码
 * @param {number} [size=DEFAULT_PAGE_SIZE] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function getInterpreterList(page = 1, size = DEFAULT_PAGE_SIZE) {
  return get('/interpreters', { page, size })
}

/**
 * 获取译员详情
 * 接口：GET /api/interpreters/{id}
 * @param {number|string} id - 译员档案 ID
 * @returns {Promise<Object>}
 */
export function getInterpreterDetail(id) {
  return get(`/interpreters/${id}`)
}

/**
 * 申请成为译员
 * 接口：POST /api/interpreter/apply
 * @param {Object} data - 申请数据
 * @returns {Promise<Object>}
 */
export function applyInterpreter(data) {
  return post('/interpreter/apply', data)
}

/**
 * 上传译员资质证书（需要登录）
 * 接口：POST /api/interpreter/cert-upload
 * @param {string} filePath - 文件本地路径
 * @returns {Promise<{url:string, originalName:string, size:number}>}
 */
export function uploadInterpreterCert(filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: '/api/interpreter/cert-upload',
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${getToken()}`,
      },
      success(res) {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data.data)
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } catch {
          reject(new Error('解析响应失败'))
        }
      },
      fail(err) {
        reject(err)
      },
    })
  })
}