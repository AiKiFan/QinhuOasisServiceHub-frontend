# 停车场系统重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复停车场系统数据持久化问题，重构计费逻辑为实时计时制，统一UI弹窗风格，实现用户提前离场功能

**Architecture:** 
- 数据库层：创建parking_spot表存储车位状态，初始化280个车位，更新区域费率
- 后端层：简化bookSpot为实时入场，重构settleSpot为向上取整计费并增加权限验证
- 前端层：统一卡片式弹窗风格，实时显示停车时长和费用

**Tech Stack:** Spring Boot + MyBatis + MySQL 8.0 + Vue 3 + uni-app

---

## 文件结构

**数据库迁移：**
- `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\resources\db\migration\20260515_create_parking_spot.sql` - 创建车位明细表并初始化280个车位
- `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\resources\db\migration\20260515_update_parking_rates.sql` - 更新4个区域费率
- `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\resources\db\migration\20260515_update_parking_space_capacity.sql` - 更新区域容量数据

**后端修改：**
- `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\dto\BookSpotReq.java` - 去除durationHours参数
- `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\service\impl\ParkingServiceImpl.java` - 重构bookSpot和settleSpot方法
- `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\common\config\InitConfig.java` - 可能需要添加车位表初始化（可选）

**前端修改：**
- `d:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-frontend\src\pages\parking\detail.vue` - 重构预约弹窗、入场成功弹窗、结算弹窗UI
- `d:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-frontend\src\api\parking.js` - 去除durationHours参数

---

## Task 1: 创建数据库迁移脚本 - 更新区域容量

**Files:**
- Create: `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\resources\db\migration\20260515_update_parking_space_capacity.sql`

- [ ] **Step 1: 编写容量更新SQL脚本**

```sql
-- 更新停车区域容量配置
-- A区100车位，B区100车位，残障区30车位，新能源区50车位

USE qinhu_oasis;

-- 更新区域容量和可用数
UPDATE parking_space 
SET total_capacity = 100, available_count = 100 
WHERE zone_code = 'ZONE_A';

UPDATE parking_space 
SET total_capacity = 100, available_count = 100 
WHERE zone_code = 'ZONE_B';

UPDATE parking_space 
SET total_capacity = 30, available_count = 30 
WHERE zone_code = 'ZONE_DIS';

UPDATE parking_space 
SET total_capacity = 50, available_count = 50,
    location_desc = '景区南侧停车楼B1层，配备充电桩30套（15快充+15慢充）'
WHERE zone_code = 'ZONE_EV';
```

- [ ] **Step 2: 执行SQL脚本验证容量更新**

Run: 在MySQL客户端执行该脚本
Expected: 4行UPDATE成功，parking_space表容量数据正确更新

- [ ] **Step 3: 提交容量更新脚本**

```bash
git add src/main/resources/db/migration/20260515_update_parking_space_capacity.sql
git commit -m "feat: 更新停车区域容量配置

A区100车位，B区100车位，残障区30车位，新能源区50车位
新能源区包含30个充电桩（15快充+15慢充）

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 创建数据库迁移脚本 - 创建车位明细表

**Files:**
- Create: `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\resources\db\migration\20260515_create_parking_spot.sql`

- [ ] **Step 1: 编写车位表创建SQL脚本**

```sql
-- 创建车位明细表并初始化280个车位数据
-- A区100个，B区100个，残障区30个，新能源区50个

USE qinhu_oasis;

-- 创建车位明细表
CREATE TABLE IF NOT EXISTS parking_spot (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '车位ID',
    zone_id         BIGINT UNSIGNED NOT NULL COMMENT '所属区域ID',
    spot_code       VARCHAR(20) NOT NULL COMMENT '车位编号(如:A-01)',
    status          TINYINT(1) NOT NULL DEFAULT 0 COMMENT '状态: 0=空闲 1=已占用',
    vehicle_no      VARCHAR(20) COMMENT '车牌号',
    user_id         BIGINT UNSIGNED COMMENT '预约用户ID',
    order_id        BIGINT UNSIGNED COMMENT '关联订单ID',
    start_time      DATETIME COMMENT '入场时间',
    planned_end_time DATETIME COMMENT '预计离场时间(废弃字段)',
    actual_end_time DATETIME COMMENT '实际离场时间',
    create_time     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_zone_id (zone_id),
    INDEX idx_status (status),
    INDEX idx_user_id (user_id),
    INDEX idx_spot_code (spot_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='车位明细表';

-- 初始化A区100个车位 (zone_id=1)
INSERT INTO parking_spot (zone_id, spot_code, status)
SELECT 1, CONCAT('A-', LPAD(seq, 2, '0')), 0
FROM (
    SELECT @rownum := @rownum + 1 AS seq
    FROM (SELECT @rownum := 0) r, sys_user LIMIT 100
) t;

-- 初始化B区100个车位 (zone_id=2)
INSERT INTO parking_spot (zone_id, spot_code, status)
SELECT 2, CONCAT('B-', LPAD(seq, 2, '0')), 0
FROM (
    SELECT @rownum := @rownum + 1 AS seq
    FROM (SELECT @rownum := 0) r, sys_user LIMIT 100
) t;

-- 初始化残障区30个车位 (zone_id=3)
INSERT INTO parking_spot (zone_id, spot_code, status)
SELECT 3, CONCAT('D-', LPAD(seq, 2, '0')), 0
FROM (
    SELECT @rownum := @rownum + 1 AS seq
    FROM (SELECT @rownum := 0) r, sys_user LIMIT 30
) t;

-- 初始化新能源区50个车位 (zone_id=4)
INSERT INTO parking_spot (zone_id, spot_code, status)
SELECT 4, CONCAT('E-', LPAD(seq, 2, '0')), 0
FROM (
    SELECT @rownum := @rownum + 1 AS seq
    FROM (SELECT @rownum := 0) r, sys_user LIMIT 50
) t;

-- 验证初始化数据
SELECT zone_id, COUNT(*) as spot_count 
FROM parking_spot 
GROUP BY zone_id;
```

- [ ] **Step 2: 执行SQL脚本验证表创建和数据初始化**

Run: 在MySQL客户端执行该脚本
Expected: 
- parking_spot表创建成功
- 4组INSERT成功，总计280条记录
- 查询结果显示：zone_id=1有100条，zone_id=2有100条，zone_id=3有30条，zone_id=4有50条

- [ ] **Step 3: 提交车位表创建脚本**

```bash
git add src/main/resources/db/migration/20260515_create_parking_spot.sql
git commit -m "feat: 创建车位明细表并初始化280个车位

创建parking_spot表存储车位实时状态
初始化数据：A区100、B区100、残障区30、新能源区50
车位编号格式：A-01~A-100, B-01~B-100, D-01~D-30, E-01~E-50

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 创建数据库迁移脚本 - 更新区域费率

**Files:**
- Create: `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\resources\db\migration\20260515_update_parking_rates.sql`

- [ ] **Step 1: 编写费率更新SQL脚本**

```sql
-- 更新停车区域费率
-- A区免费，B区10元/时，残障区免费，新能源区5元/时

USE qinhu_oasis;

UPDATE parking_space SET hourly_rate = 0.00 WHERE zone_code = 'ZONE_A';
UPDATE parking_space SET hourly_rate = 10.00 WHERE zone_code = 'ZONE_B';
UPDATE parking_space SET hourly_rate = 0.00 WHERE zone_code = 'ZONE_DIS';
UPDATE parking_space SET hourly_rate = 5.00 WHERE zone_code = 'ZONE_EV';

-- 验证费率更新
SELECT zone_code, zone_name, hourly_rate, total_capacity 
FROM parking_space 
ORDER BY id;
```

- [ ] **Step 2: 执行SQL脚本验证费率更新**

Run: 在MySQL客户端执行该脚本
Expected: 
- 4行UPDATE成功
- 查询结果显示：ZONE_A=0.00, ZONE_B=10.00, ZONE_DIS=0.00, ZONE_EV=5.00

- [ ] **Step 3: 提交费率更新脚本**

```bash
git add src/main/resources/db/migration/20260515_update_parking_rates.sql
git commit -m "feat: 更新停车区域费率配置

A区免费(0.00元/时)，B区10元/时
残障区免费(0.00元/时)，新能源区5元/时

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 后端DTO参数调整 - 去除时长参数

**Files:**
- Modify: `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\dto\BookSpotReq.java`

- [ ] **Step 1: 读取当前BookSpotReq.java文件**

Run: `Read D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\dto\BookSpotReq.java`
Expected: 文件内容包含spotId、vehicleNo、durationHours等字段

- [ ] **Step 2: 去除durationHours字段**

```java
package com.qinhu.oasis.tourism.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 预约车位请求DTO
 * 
 * @author AiKiFan
 * @date 2026-05-15
 */
@Data
public class BookSpotReq {

    /** 车位ID */
    private Long spotId;

    /** 车牌号 */
    @NotBlank(message = "车牌号不能为空")
    private String vehicleNo;

    // 已废弃：不再需要预约时长，改为实时计时
    // private Integer durationHours;
}
```

- [ ] **Step 3: 提交DTO修改**

```bash
git add src/main/java/com/qinhu/oasis/tourism/dto/BookSpotReq.java
git commit -m "refactor: 去除BookSpotReq中的durationHours参数

改为实时计时制，入场时无需预估时长

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 后端Service重构 - bookSpot方法改为实时入场

**Files:**
- Modify: `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\service\impl\ParkingServiceImpl.java:218-263`

- [ ] **Step 1: 读取当前bookSpot方法实现**

Run: `Read D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\service\impl\ParkingServiceImpl.java:218-263`
Expected: 当前方法包含durationHours参数和plannedEndTime计算逻辑

- [ ] **Step 2: 重构bookSpot方法**

```java
@Override
@Transactional(rollbackFor = Exception.class)
public ParkingSpotVO bookSpot(BookSpotReq req, Long userId) {
    if (parkingSpotMapper == null) throw new BizException(ResultCode.NOT_FOUND, "车位模块未初始化");

    com.qinhu.oasis.tourism.entity.ParkingSpot spot = parkingSpotMapper.selectById(req.getSpotId());
    if (spot == null) throw new BizException(ResultCode.NOT_FOUND, i18nUtil.msg(ResultCode.NOT_FOUND));
    if (spot.getStatus() != 0) throw new BizException(ResultCode.PARKING_STOCK_EMPTY, i18nUtil.msg(ResultCode.PARKING_STOCK_EMPTY));

    // 分布式锁
    String lockKey = LOCK_KEY_PREFIX + "spot:" + req.getSpotId();
    Boolean acquired = stringRedisTemplate.opsForValue()
            .setIfAbsent(lockKey, "1", LOCK_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
    if (Boolean.FALSE.equals(acquired)) throw new BizException(ResultCode.PARKING_STOCK_EMPTY, "车位繁忙，请重试");

    try {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        // 生成订单（入场时totalAmount=0，离场时计算实际费用）
        ParkingSpace zone = parkingSpaceMapper.selectById(spot.getZoneId());
        BizOrder order = new BizOrder();
        order.setOrderNo(SNOWFLAKE.nextIdStr());
        order.setOrderType(OrderType.PARKING);
        order.setUserId(userId);
        order.setParkingSpaceId(spot.getZoneId());
        order.setVehicleNo(req.getVehicleNo());
        order.setStartTime(now);
        order.setEndTime(now); // 初始end_time为start_time，离场时更新
        order.setTotalAmount(BigDecimal.ZERO); // 入场时不收费
        order.setPaidAmount(BigDecimal.ZERO);
        order.setStatus(OrderStatus.PENDING);
        bizOrderMapper.insert(order);

        // 更新车位状态：入场时间记录，不再需要预计离场时间
        parkingSpotMapper.updateSpot(req.getSpotId(), 1,
                req.getVehicleNo(), userId, order.getId(), now, null);

        ParkingSpotVO vo = toSpotVO(parkingSpotMapper.selectById(req.getSpotId()));
        return vo;
    } finally {
        stringRedisTemplate.delete(lockKey);
    }
}
```

- [ ] **Step 3: 提交bookSpot方法重构**

```bash
git add src/main/java/com/qinhu/oasis/tourism/service/impl/ParkingServiceImpl.java
git commit -m "refactor: bookSpot改为实时入场，去除时长预估

入场时记录start_time，totalAmount初始为0
废弃planned_end_time字段，离场时计算实际费用

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 后端Service重构 - settleSpot方法增加权限验证和向上取整计费

**Files:**
- Modify: `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\service\impl\ParkingServiceImpl.java:265-318`

- [ ] **Step 1: 读取当前settleSpot方法实现**

Run: `Read D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\service\impl\ParkingServiceImpl.java:265-318`
Expected: 当前方法包含超时计费逻辑，无权限验证

- [ ] **Step 2: 重构settleSpot方法**

```java
@Override
@Transactional(rollbackFor = Exception.class)
public ParkingSpotVO settleSpot(Long spotId, Long userId) {
    if (parkingSpotMapper == null) throw new BizException(ResultCode.NOT_FOUND, "车位模块未初始化");

    com.qinhu.oasis.tourism.entity.ParkingSpot spot = parkingSpotMapper.selectById(spotId);
    if (spot == null) throw new BizException(ResultCode.NOT_FOUND, i18nUtil.msg(ResultCode.NOT_FOUND));
    if (spot.getStatus() == 0) throw new BizException(ResultCode.PARKING_STOCK_EMPTY, "该车位当前空闲，无需结算");

    // 新增：权限验证 - 只能结算自己预约的车位
    if (spot.getUserId() == null || !spot.getUserId().equals(userId)) {
        throw new BizException(ResultCode.FORBIDDEN, "只能结算自己预约的车位");
    }

    // 计算实际时长（向上取整，不足1小时按1小时算）
    java.time.LocalDateTime actualEnd = java.time.LocalDateTime.now();
    java.time.LocalDateTime start = spot.getStartTime() != null ? spot.getStartTime() : actualEnd;

    long minutes = ChronoUnit.MINUTES.between(start, actualEnd);
    int hours = (int) Math.ceil(minutes / 60.0);
    if (hours < 1) hours = 1; // 最少1小时

    // 计算费用（去除超时计费逻辑）
    ParkingSpace space = parkingSpaceMapper.selectById(spot.getZoneId());
    BigDecimal hourlyRate = space.getHourlyRate();
    BigDecimal totalFee = hourlyRate.multiply(BigDecimal.valueOf(hours));

    // 更新订单状态为已完成
    if (spot.getOrderId() != null) {
        BizOrder order = bizOrderMapper.selectById(spot.getOrderId());
        if (order != null) {
            order.setEndTime(actualEnd);
            order.setPaidAmount(totalFee);
            order.setStatus(OrderStatus.COMPLETED);
            bizOrderMapper.updateStatus(order.getId(), OrderStatus.COMPLETED);
            bizOrderMapper.updatePaidAmount(order.getId(), totalFee);
        }
    }

    // 重置车位为空闲
    parkingSpotMapper.resetSpot(spotId);

    ParkingSpotVO vo = toSpotVO(parkingSpotMapper.selectById(spotId));
    vo.setTotalAmount(totalFee);
    vo.setNormalFee(totalFee);
    vo.setOvertimeFee(BigDecimal.ZERO);
    vo.setNormalHours(hours);
    vo.setOvertimeHours(0);
    return vo;
}
```

- [ ] **Step 3: 检查BizOrderMapper是否有updatePaidAmount方法**

Run: `Grep -n "updatePaidAmount" D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\mapper\BizOrderMapper.java`
Expected: 如果不存在，需要添加该方法

- [ ] **Step 4: 如果需要，添加updatePaidAmount方法到BizOrderMapper**

```java
// BizOrderMapper.java
void updatePaidAmount(@Param("id") Long id, @Param("paidAmount") BigDecimal paidAmount);
```

```xml
<!-- BizOrderMapper.xml -->
<update id="updatePaidAmount">
    UPDATE biz_order 
    SET paid_amount = #{paidAmount}, update_time = NOW()
    WHERE id = #{id}
</update>
```

- [ ] **Step 5: 提交settleSpot方法重构**

```bash
git add src/main/java/com/qinhu/oasis/tourism/service/impl/ParkingServiceImpl.java
git add src/main/java/com/qinhu/oasis/tourism/mapper/BizOrderMapper.java
git add src/main/resources/mapper/tourism/BizOrderMapper.xml
git commit -m "refactor: settleSpot增加权限验证，改为向上取整计费

新增权限验证：只能结算自己预约的车位
计费逻辑：向上取整，不足1小时按1小时算
去除超时计费逻辑，废弃status=2超时状态

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 后端Service废弃超时检测方法

**Files:**
- Modify: `D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\service\impl\ParkingServiceImpl.java:320-333`

- [ ] **Step 1: 读取detectOvertime方法**

Run: `Read D:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-backend\src\main\java\com\qinhu\oasis\tourism\service\impl\ParkingServiceImpl.java:320-333`
Expected: 当前方法包含超时检测逻辑，设置status=2

- [ ] **Step 2: 注释或删除detectOvertime方法**

```java
// 已废弃：改为实时计时制，不再需要超时检测
// @Override
// public void detectOvertime() {
//     if (parkingSpotMapper == null) return;
//     List<com.qinhu.oasis.tourism.entity.ParkingSpot> occupied = parkingSpotMapper.selectAllOccupied();
//     java.time.LocalDateTime now = java.time.LocalDateTime.now();
//     for (com.qinhu.oasis.tourism.entity.ParkingSpot spot : occupied) {
//         if (spot.getPlannedEndTime() != null && now.isAfter(spot.getPlannedEndTime())) {
//             parkingSpotMapper.updateSpot(spot.getId(), 2,
//                     spot.getVehicleNo(), spot.getUserId(), spot.getOrderId(),
//                     spot.getStartTime(), spot.getPlannedEndTime());
//             log.info("[超时检测] 车位 {} 已超时", spot.getSpotCode());
//         }
//     }
// }
```

- [ ] **Step 3: 提交超时检测方法废弃**

```bash
git add src/main/java/com/qinhu/oasis/tourism/service/impl/ParkingServiceImpl.java
git commit -m "refactor: 废弃detectOvertime超时检测方法

改为实时计时制，去除status=2超时状态

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 前端API参数调整 - 去除时长参数

**Files:**
- Modify: `d:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-frontend\src\api\parking.js:27-32`

- [ ] **Step 1: 读取当前parking.js API文件**

Run: `Read d:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-frontend\src\api\parking.js`
Expected: bookSpot方法包含durationHours参数

- [ ] **Step 2: 去除durationHours参数**

```javascript
/**
 * 预约选位（点击空闲车位后调用）
 * @param {number} spotId - 车位ID
 * @param {Object} data - { vehicleNo: string }
 */
export function bookSpot(spotId, data) {
  return post(`/parking/spots/${spotId}/book`, data)
}
```

- [ ] **Step 3: 提交API修改**

```bash
git add src/api/parking.js
git commit -m "refactor: bookSpot API去除durationHours参数

改为实时计时制，入场时无需预估时长

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 前端页面重构 - 入场成功弹窗改为卡片式设计

**Files:**
- Modify: `d:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-frontend\src\pages\parking\detail.vue:106-120, 181-198`

- [ ] **Step 1: 读取当前detail.vue预约相关代码**

Run: `Read d:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-frontend\src\pages\parking\detail.vue:106-120, 181-198`
Expected: 当前使用uni.showToast显示入场成功

- [ ] **Step 2: 在data中添加showSuccessDialog状态**

```javascript
data() {
  return {
    zones: [],
    currentZoneId: null,
    spots: [],
    loading: false,
    showBookDialog: false,
    showSettleDialog: false,
    showSuccessDialog: false, // 新增：入场成功弹窗状态
    selectedSpot: {},
    bookForm: { plateNumber: '' },
    settleAmount: '0.00'
  }
}
```

- [ ] **Step 3: 修改confirmBook方法，改为显示卡片弹窗**

```javascript
async confirmBook() {
  if (!this.bookForm.plateNumber || this.bookForm.plateNumber.length !== 7) {
    uni.showToast({ title: '请填写完整车牌号', icon: 'none' })
    return
  }
  uni.showLoading({ title: '提交中...' })
  try {
    await bookSpot(this.selectedSpot.id, {
      vehicleNo: this.bookForm.plateNumber
    })
    uni.hideLoading()
    this.showBookDialog = false
    this.showSuccessDialog = true // 改为显示卡片式成功弹窗
    this.loadSpots()
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '入场失败', icon: 'none' })
  }
}
```

- [ ] **Step 4: 在template中添加入场成功弹窗HTML**

```vue
<!-- 入场成功弹窗（卡片式设计） -->
<view v-if="showSuccessDialog" class="dialog-mask" @tap="showSuccessDialog = false">
  <view class="dialog success-dialog" @tap.stop>
    <text class="dialog__title">入场成功</text>
    <text class="dialog__content">车牌号已登记，祝您旅途愉快</text>
    <view class="dialog__actions">
      <view class="dialog__btn dialog__btn--confirm dialog__btn--single" @tap="showSuccessDialog = false">好的</view>
    </view>
  </view>
</view>
```

- [ ] **Step 5: 添加入场成功弹窗样式**

```scss
.success-dialog {
  text-align: center;
  
  .dialog__content {
    display: block;
    font-size: 28rpx;
    color: $color-text-secondary;
    margin-bottom: 32rpx;
    line-height: 1.6;
  }
  
  .dialog__btn--single {
    width: 100%;
  }
}
```

- [ ] **Step 6: 提交入场成功弹窗改进**

```bash
git add src/pages/parking/detail.vue
git commit -m "feat: 入场成功提示改为卡片式弹窗

与译员订单评价弹窗风格统一
文案：车牌号已登记，祝您旅途愉快

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 前端页面重构 - 结算弹窗显示实时时长

**Files:**
- Modify: `d:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-frontend\src\pages\parking\detail.vue:69-92, 201-216`

- [ ] **Step 1: 在computed中添加实时时长计算**

```javascript
computed: {
  currentZoneName() {
    const z = this.zones.find(z => z.id === this.currentZoneId)
    return z ? z.displayName : ''
  },
  freeCount() {
    return this.spots.filter(s => s.status === 0).length
  },
  totalCount() {
    return this.spots.length
  },
  // 新增：实时停车时长计算
  parkingDuration() {
    if (!this.selectedSpot.startTime) return '0小时'
    const start = new Date(this.selectedSpot.startTime)
    const now = new Date()
    const minutes = Math.floor((now - start) / 1000 / 60)
    const hours = Math.ceil(minutes / 60)
    return `${hours}小时`
  }
}
```

- [ ] **Step 2: 在onSpotTap中触发时长实时计算**

```javascript
onSpotTap(spot) {
  this.selectedSpot = spot
  if (spot.status === 0) {
    this.bookForm = { plateNumber: '' }
    this.showBookDialog = true
  } else {
    // 实时计算时长和费用预览
    this.updateParkingDuration()
    this.showSettleDialog = true
  }
}
```

- [ ] **Step 3: 添加updateParkingDuration方法**

```javascript
methods: {
  // 新增：实时更新停车时长（每分钟刷新）
  updateParkingDuration() {
    if (!this.selectedSpot.startTime) {
      this.parkingDurationText = '0小时'
      return
    }
    const start = new Date(this.selectedSpot.startTime)
    const now = new Date()
    const minutes = Math.floor((now - start) / 1000 / 60)
    const hours = Math.ceil(minutes / 60)
    if (hours < 1) hours = 1
    this.parkingDurationText = `${hours}小时`
    
    // 计算费用预览
    const zone = this.zones.find(z => z.id === this.selectedSpot.zoneId)
    const rate = zone ? zone.hourlyRate : 0
    this.settleAmountPreview = (hours * rate).toFixed(2)
  }
}
```

- [ ] **Step 4: 在data中添加实时计算所需状态**

```javascript
data() {
  return {
    // ... 其他字段
    parkingDurationText: '0小时', // 新增：实时时长文本
    settleAmountPreview: '0.00', // 新增：费用预览
    durationTimer: null // 新增：定时器
  }
}
```

- [ ] **Step 5: 在结算弹窗中显示实时时长**

```vue
<!-- 结算弹窗（已占用车位） -->
<view v-if="showSettleDialog" class="dialog-mask" @tap.self="showSettleDialog = false">
  <view class="dialog" @tap.stop>
    <text class="dialog__title">离场结算 - {{ selectedSpot.spotCode }}</text>

    <view class="dialog__info-row">
      <text class="dialog__info-label">车牌</text>
      <text class="dialog__info-value">{{ selectedSpot.vehicleNo }}</text>
    </view>
    <view class="dialog__info-row">
      <text class="dialog__info-label">入场时间</text>
      <text class="dialog__info-value">{{ formatTime(selectedSpot.startTime) }}</text>
    </view>
    <view class="dialog__info-row">
      <text class="dialog__info-label">停车时长</text>
      <text class="dialog__info-value parking-duration">{{ parkingDurationText }}</text>
    </view>
    <view class="dialog__info-row dialog__info-row--total">
      <text class="dialog__info-label">应付金额</text>
      <text class="dialog__info-value dialog__fee-highlight">¥{{ settleAmount }}</text>
    </view>

    <view class="dialog__actions">
      <view class="dialog__btn dialog__btn--cancel" @tap="showSettleDialog = false">取消</view>
      <view class="dialog__btn dialog__btn--confirm" @tap="confirmSettle">确认离场</view>
    </view>
  </view>
</view>
```

- [ ] **Step 6: 添加停车时长样式**

```scss
.parking-duration {
  color: $color-primary;
  font-weight: 600;
}
```

- [ ] **Step 7: 在onLoad中启动定时器**

```javascript
onLoad(options) {
  this.currentZoneId = parseInt(options.id || 1)
  uni.setNavigationBarTitle({ title: t('page.parkingDetail.title') })
  this.loadZones()
  
  // 新增：启动定时器每分钟更新时长
  this.durationTimer = setInterval(() => {
    if (this.showSettleDialog) {
      this.updateParkingDuration()
    }
  }, 60000)
}
```

- [ ] **Step 8: 在onUnload中清理定时器**

```javascript
onUnload() {
  if (this.durationTimer) {
    clearInterval(this.durationTimer)
    this.durationTimer = null
  }
}
```

- [ ] **Step 9: 提交结算弹窗实时时长显示**

```bash
git add src/pages/parking/detail.vue
git commit -m "feat: 结算弹窗显示实时停车时长和费用预览

添加定时器每分钟刷新时长显示
优化用户体验，实时看到停车时长增长

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: 前端页面重构 - 统一按钮样式为渐变设计

**Files:**
- Modify: `d:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-frontend\src\pages\parking\detail.vue:410-428`

- [ ] **Step 1: 读取当前按钮样式定义**

Run: `Read d:\me\ycu\qinhu-smart-tourism-cloud-platform\QinhuOasisServiceHub-frontend\src\pages\parking\detail.vue:410-428`
Expected: 当前按钮样式可能不是渐变设计

- [ ] **Step 2: 更新按钮样式为渐变设计**

```scss
.dialog__btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
  
  &--cancel {
    background-color: $color-bg-page;
    color: $color-text-secondary;
    border: 2rpx solid $color-divider;
  }
  
  &--confirm {
    background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%);
    color: #ffffff;
  }
}
```

- [ ] **Step 3: 提交按钮样式统一**

```bash
git add src/pages/parking/detail.vue
git commit -m "style: 统一停车场弹窗按钮为渐变样式

与译员订单评价弹窗风格保持一致

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: 功能测试验证 - 数据持久化

**测试目标：** 验证预约车位后数据正确保存到数据库

- [ ] **Step 1: 启动后端服务**

Run: 启动Spring Boot应用
Expected: 应用正常启动，数据库连接成功

- [ ] **Step 2: 登录并预约车位**

操作步骤：
1. 打开小程序，登录用户账号
2. 进入停车场详情页，选择A区
3. 点击空闲车位A-01，输入车牌号"京A12345"
4. 点击"确认入场"
5. 验证弹窗显示"入场成功！车牌号已登记，祝您旅途愉快"

- [ ] **Step 3: 验证数据库车位状态**

Run: 在MySQL中查询
```sql
SELECT * FROM parking_spot WHERE spot_code = 'A-01';
```

Expected: 
- `status = 1` (已占用)
- `vehicle_no = '京A12345'`
- `start_time` 为当前时间
- `user_id` 和 `order_id` 不为NULL

- [ ] **Step 4: 返回主页并重新进入验证持久化**

操作步骤：
1. 点击返回按钮回到主页
2. 再次进入停车场详情页
3. 选择A区，验证A-01车位显示为红色（已占用）

Expected: A-01车位状态正确显示为已占用，车牌号脱敏显示

- [ ] **Step 5: 测试其他区域数据持久化**

重复测试B区、残障区、新能源区的预约和持久化

Expected: 所有区域数据持久化正常

---

## Task 13: 功能测试验证 - 计费逻辑

**测试目标：** 验证实时计时和向上取整计费逻辑

- [ ] **Step 1: 测试不足1小时按1小时计费**

操作步骤：
1. 预约B区车位B-05，车牌"京B88888"
2. 等待30秒后点击该车位结算
3. 验证停车时长显示"1小时"
4. 验证费用显示"¥10.00"（B区10元/时）

Expected: 不足1小时按1小时计费，费用10元

- [ ] **Step 2: 测试向上取整计费**

操作步骤：
1. 预约新能源区车位E-10
2. 等待90分钟（1.5小时）
3. 点击结算，验证时长显示"2小时"
4. 验证费用显示"¥10.00"（新能源区5元/时 × 2小时）

Expected: 1.5小时向上取整为2小时，费用10元

- [ ] **Step 3: 测试A区和残障区免费**

操作步骤：
1. 预约A区车位A-20，停留2小时
2. 结算验证费用为¥0.00
3. 预约残障区车位D-05，停留3小时
4. 结算验证费用为¥0.00

Expected: A区和残障区免费，费用均为0元

---

## Task 14: 功能测试验证 - 权限控制

**测试目标：** 验证用户只能结算自己预约的车位

- [ ] **Step 1: 创建两个测试用户账号**

操作：准备两个不同的用户账号UserA和UserB

- [ ] **Step 2: UserA预约车位**

操作步骤：
1. UserA登录，预约B区车位B-15
2. 验证预约成功，车位状态为已占用

- [ ] **Step 3: UserB尝试结算UserA的车位**

操作步骤：
1. UserA退出登录
2. UserB登录，进入停车场详情页
3. UserB点击B-15车位（红色，已占用）
4. 尝试结算

Expected: 后端返回FORBIDDEN错误，前端显示"只能结算自己预约的车位"

---

## Task 15: 功能测试验证 - UI弹窗风格

**测试目标：** 验证弹窗UI风格与译员订单评价弹窗一致

- [ ] **Step 1: 对比入场成功弹窗与评价弹窗**

操作步骤：
1. 预约一个车位，触发入场成功弹窗
2. 进入译员订单详情页，触发评价弹窗
3. 对比两个弹窗的样式

Expected对比点：
- 圆角卡片样式一致（border-radius: 24rpx）
- 白色背景、阴影效果一致
- 标题居中、字体大小一致
- 确认按钮为渐变样式一致

- [ ] **Step 2: 对比结算弹窗按钮样式**

操作步骤：
1. 点击已占用车位，打开结算弹窗
2. 验证"确认离场"按钮为渐变样式
3. 验证"取消"按钮为灰色边框样式

Expected: 按钮样式与译员订单弹窗一致

---

## Task 16: 代码提交和文档更新

**Files:**
- Modify: `docs/superpowers/specs/2026-05-15-parking-refactor-design.md` - 更新实施状态

- [ ] **Step 1: 检查所有改动是否已提交**

Run: `git status`
Expected: 所有文件改动已提交到git

- [ ] **Step 2: 推送代码到远程仓库（可选）**

```bash
git push origin main
```

- [ ] **Step 3: 更新设计文档实施状态**

在设计文档末尾添加实施完成标记

- [ ] **Step 4: 最终提交**

```bash
git add docs/superpowers/specs/2026-05-15-parking-refactor-design.md
git commit -m "docs: 停车场重构实施完成

数据持久化、计费重构、UI统一、权限验证全部完成

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
```

---

## 自查清单

**Spec覆盖检查：**
- ✅ 数据持久化问题修复（Task 1-3）
- ✅ 计费逻辑改为实时计时（Task 4-6）
- ✅ 向上取整计费规则（Task 6）
- ✅ 区域费率调整（Task 3）
- ✅ 权限验证功能（Task 6）
- ✅ UI弹窗风格统一（Task 9-11）
- ✅ 提前离场功能（Task 10）
- ✅ 状态简化去除超时（Task 7）

**占位符扫描：**
- ✅ 所有SQL脚本完整
- ✅ 所有Java代码完整
- ✅ 所有Vue/JS代码完整
- ✅ 所有测试步骤具体可执行
- ✅ 无TBD/TODO占位符

**类型一致性：**
- ✅ BookSpotReq.vehicleNo类型一致（String）
- ✅ ParkingSpotVO字段命名一致
- ✅ 方法签名匹配（bookSpot/settleSpot）