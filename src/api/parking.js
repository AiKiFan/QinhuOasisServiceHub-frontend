/**
 * 停车场相关接口
 * @author AiKiFan
 */
import { get, post } from '@/utils/request'

/**
 * 获取所有停车区域（含各区实时空闲数）
 */
export function getParkingZones() {
 return get('/parking/spaces')
}

export const getParkingSpaces = getParkingZones

/**
 * 获取某区域所有车位的实时状态
 * @param {number} zoneId - 区域ID
 */
export function getZoneSpots(zoneId) {
 return get(`/parking/zones/${zoneId}/spots`)
}

/**
 * 预约选位（点击空闲车位后调用）
 * @param {number} spotId - 车位ID
 * @param {Object} data - { vehicleNo: string }
 * @param {Object} [options] - 请求选项（如 silent: true）
 */
export function bookSpot(spotId, data, options) {
 return post(`/parking/spots/${spotId}/book`, data, options)
}

/**
 * 自助结算离场（点击已占用/超时车位）
 * @param {number} spotId - 车位ID
 */
export function settleSpot(spotId) {
 return post(`/parking/spots/${spotId}/settle`, {})
}