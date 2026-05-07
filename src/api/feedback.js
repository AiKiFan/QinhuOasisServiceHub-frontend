/**
 * 投诉建议相关接口
 * @author AiKiFan
 */
import { post } from '@/utils/request'
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
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: 'http://localhost:8080/api/files/upload',
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