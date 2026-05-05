import { get, post } from '@/utils/request'

/**
 * 获取所有停车区域列表
 */
export function getParkingSpaces() {
  return get('/parking/spaces')
}

/**
 * 预约车位
 * @param {Object} data - 预约参数
 * @param {number} data.parkingSpaceId - 停车场ID
 * @param {string} data.plateNumber - 车牌号
 * @param {number} data.duration - 预计时长（小时）
 */
export function bookParking(data) {
  return post('/parking/orders', data)
}

/**
 * 取消预约
 * @param {number} orderId - 订单ID
 */
export function cancelParkingOrder(orderId) {
  return post(`/parking/orders/${orderId}/cancel`)
}
