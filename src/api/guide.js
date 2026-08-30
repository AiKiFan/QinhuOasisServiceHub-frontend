/**
 * 攻略模块接口
 * @author AiKiFan
 */
import { get, post, put, del } from '@/utils/request'

export const getGuideList = (postType, page = 1, size = 10) =>
  get('/posts', { type: postType, page, size })

export const getGuideDetail = id => get(`/posts/${id}`)
export const toggleGuideLike = id => post(`/posts/${id}/like`)
export const publishGuide = data => post('/posts', data)
export const getMyGuides = (page = 1, size = 10) => get('/posts/mine', { page, size })
export const updateMyGuide = (id, data) => put(`/posts/${id}`, data)
export const deleteMyGuide = id => del(`/posts/${id}`)
export const setGuidePrivate = (id, isPrivate) => post(`/posts/${id}/set-private`, { isPrivate })
export const adminListGuides = (type, status, page = 1, size = 10) =>
  get('/admin/posts', { type, status, page, size })
export const adminPublishGuide = id => post(`/admin/posts/${id}/publish`)
export const adminTakeDownGuide = id => post(`/admin/posts/${id}/take-down`)
export const adminDeleteGuide = id => del(`/admin/posts/${id}`)
export const getReviewEnabled = () => get('/admin/config/guide-review')
export const setReviewEnabled = enabled => post('/admin/config/guide-review', { enabled })
