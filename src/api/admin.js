/**
 * 管理端相关接口（role=2 管理员专用）
 * @author AiKiFan
 */
import { get, post, put, del } from '@/utils/request'

/**
 * 获取译员申请列表
 * 接口：GET /api/admin/interpreter-profiles?status=&page=1&size=10
 * @param {Object} [params={}] - 查询参数
 * @param {number} [params.status] - 状态筛选：0=待审核 1=已通过 2=已拒绝 3=暂停
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.size=10] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function getAdminInterpreterProfiles(params = {}) {
  return get('/admin/interpreter-profiles', params)
}

/**
 * 审核译员申请
 * 接口：POST /api/admin/interpreter-profiles/{id}/review?approve=true&rejectReason=
 * @param {number|string} id - 译员档案 ID
 * @param {boolean} approve - true=通过 false=拒绝
 * @param {string} [rejectReason] - 拒绝原因（拒绝时必填）
 * @returns {Promise<null>}
 */
export function reviewInterpreterProfile(id, approve, rejectReason = '') {
  const query = approve ? '?approve=true' : `?approve=false&rejectReason=${encodeURIComponent(rejectReason)}`
  return post(`/admin/interpreter-profiles/${id}/review${query}`, {})
}

/**
 * 获取投诉建议列表
 * 接口：GET /api/admin/feedback?status=&feedbackType=&page=1&size=20
 * @param {Object} [params={}] - 查询参数
 * @param {number} [params.status] - 状态筛选：0=待处理 1=处理中 2=已解决 3=已关闭
 * @param {number} [params.feedbackType] - 类型筛选：1=投诉 2=建议 3=咨询 4=其他
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.size=20] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function getAdminFeedbackList(params = {}) {
  return get('/admin/feedback', params)
}

/**
 * 回复投诉建议
 * 接口：POST /api/admin/feedback/{id}/reply
 * @param {number|string} id - 反馈 ID
 * @param {Object} data - 回复数据
 * @param {string} data.replyContent - 回复内容
 * @param {number} data.status - 状态：1=处理中 2=已解决 3=已关闭
 * @returns {Promise<null>}
 */
export function replyFeedback(id, data) {
  return post(`/admin/feedback/${id}/reply`, data)
}

/**
 * ───────────────────────────── 餐厅管理 ─────────────────────────────
 */

/**
 * 管理员获取餐厅列表
 * 接口：GET /api/restaurants/admin/list?keyword=&page=1&size=10
 * @param {Object} [params={}] - 查询参数
 * @param {string} [params.keyword] - 关键词（名称/地址）
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.size=10] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function getAdminRestaurantList(params = {}) {
  return get('/restaurants/admin/list', params)
}

/**
 * 管理员新增餐厅
 * 接口：POST /api/restaurants/admin/create
 * @param {Object} data - 餐厅数据
 * @returns {Promise<Object>}
 */
export function createRestaurant(data) {
  return post('/restaurants/admin/create', data)
}

/**
 * 管理员更新餐厅
 * 接口：PUT /api/restaurants/admin/update
 * @param {Object} data - 餐厅数据（需含 id）
 * @returns {Promise<Object>}
 */
export function updateRestaurant(data) {
  return put('/restaurants/admin/update', data)
}

/**
 * 管理员删除餐厅
 * 接口：DELETE /api/restaurants/admin/{id}
 * @param {number|string} id - 餐厅 ID
 * @returns {Promise<null>}
 */
export function deleteRestaurant(id) {
  return del(`/restaurants/admin/${id}`)
}

/**
 * ───────────────────────────── 景点管理 ─────────────────────────────
 */

/**
 * 管理员获取景点列表
 * 接口：GET /api/scenic-spots/admin/list?keyword=&page=1&size=10
 * @param {Object} [params={}] - 查询参数
 * @param {string} [params.keyword] - 关键词（名称/地址）
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.size=10] - 每页条数
 * @returns {Promise<{total:number, list:Array}>}
 */
export function getAdminScenicList(params = {}) {
  return get('/scenic-spots/admin/list', params)
}

/**
 * 管理员新增景点
 * 接口：POST /api/scenic-spots/admin/create
 * @param {Object} data - 景点数据
 * @returns {Promise<Object>}
 */
export function createScenicSpot(data) {
  return post('/scenic-spots/admin/create', data)
}

/**
 * 管理员更新景点
 * 接口：PUT /api/scenic-spots/admin/update
 * @param {Object} data - 景点数据（需含 id）
 * @returns {Promise<Object>}
 */
export function updateScenicSpot(data) {
  return put('/scenic-spots/admin/update', data)
}

/**
 * 管理员删除景点
 * 接口：DELETE /api/scenic-spots/admin/{id}
 * @param {number|string} id - 景点 ID
 * @returns {Promise<null>}
 */
export function deleteScenicSpot(id) {
  return del(`/scenic-spots/admin/${id}`)
}

/**
 * 管理员切换景点状态
 * 接口：PUT /api/scenic-spots/admin/{id}/status
 * @param {number|string} id - 景点 ID
 * @param {number} status - 状态：1=正常开放 0=暂停开放
 * @returns {Promise<null>}
 */
export function updateScenicSpotStatus(id, status) {
  return put(`/scenic-spots/admin/${id}/status`, { status })
}

/**
 * 上传图片
 * 接口：POST /api/files/upload
 * @param {string} filePath - 文件临时路径
 * @returns {Promise<{url:string}>}
 */
export function uploadImage(filePath) {
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
        Authorization: `Bearer ${uni.getStorageSync('token') || ''}`,
      },
      success(res) {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data.data)
          } else {
            reject(new Error(data.message || 'Upload failed'))
          }
        } catch {
          reject(new Error('Parse response failed'))
        }
      },
      fail(err) {
        reject(err)
      },
    })
  })
}