/**
 * 投诉建议相关接口
 * @author AiKiFan
 */
import { post, get, put } from '@/utils/request'
import { getToken } from '@/utils/auth'

/**
 * 提交投诉建议（用户端）
 * 接口：POST /api/feedback
 * @param {Object} data - 反馈数据
 * @param {number} data.feedbackType - 反馈类型：1=投诉 2=建议 3=咨询 4=其他
 * @param {string} data.title - 标题
 * @param {string} data.content - 内容
 * @param {string} [data.contact] - 联系方式（选填）
 * @param {string[]} [data.images] - 图片 URL 列表（选填）
 * @returns {Promise<Object>}
 */
export function submitFeedback(data) {
  return post('/feedback', data)
}

/**
 * 上传反馈图片
 * 接口：POST /api/files/upload（FileController）
 * @param {string} filePath - 文件本地路径
 * @returns {Promise<{url:string, originalName:string, size:number}>}
 */
export function uploadFeedbackImage(filePath) {
  // #ifdef H5
  const uploadUrl = `${location.protocol}//${location.hostname}:8080/api/files/upload`
  // #endif
  // #ifndef H5
  const uploadUrl = 'http://localhost:8080/api/files/upload'
  // #endif
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: uploadUrl,
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

/**
 * 获取当前用户投诉建议列表
 * 接口：GET /api/feedback/me
 */
export function getMyFeedbackList(params = {}) {
  return get('/feedback/me', params)
}

/**
 * 获取投诉建议详情
 * 接口：GET /api/feedback/{id}
 */
export function getMyFeedbackDetail(id) {
  return get(`/feedback/${id}`)
}

/**
 * 修改投诉建议（仅待处理状态可修改）
 * 接口：PUT /api/feedback/{id}
 */
export function updateFeedback(id, data) {
  return put(`/feedback/${id}`, data)
}

/**
 * 追加回复（仅处理中状态）
 * 接口：POST /api/feedback/{id}/reply
 */
export function appendFeedbackReply(id, replyContent) {
  return post(`/feedback/${id}/reply`, { replyContent })
}

/**
 * 关闭投诉（待处理/处理中可关闭）
 * 接口：POST /api/feedback/{id}/close
 */
export function closeFeedback(id) {
  return post(`/feedback/${id}/close`)
}

/**
 * 标记已解决（仅处理中状态）
 * 接口：POST /api/feedback/{id}/resolve
 */
export function resolveFeedback(id) {
  return post(`/feedback/${id}/resolve`)
}