# 停车场系统重构设计

## 问题概述

停车场系统存在四个核心问题需要解决：

1. **数据持久化失败** - 预约车位后返回主页重新进入，车位状态丢失
2. **计费逻辑不合理** - 当前为"预约时长制"，需要改为"实时计时制"
3. **UI弹窗风格不统一** - 预约成功提示和空闲车位提示不符合整体UI风格
4. **提前离场功能** - 用户需要能够主动结算离场

## 设计目标

- 修复数据持久化问题，确保车位状态正确保存到数据库
- 重构计费逻辑，改为实时计时制，简化用户体验
- 统一弹窗UI风格，与译员订单评价弹窗保持一致
- 实现用户主动结算功能，支持提前离场

## 解决方案

### 一、数据持久化修复

**根本原因：** 数据库缺少 `parking_spot` 表

虽然后端代码中已经定义了 `ParkingSpot` 实体类和相关 Mapper，但数据库初始化脚本 `V1__init_schema.sql` 中并未创建该表，导致所有车位预约操作无法持久化。

**解决方案：**

创建数据库迁移脚本 `20260515_create_parking_spot.sql`，建立车位明细表。

**数据库表结构：**

```sql
CREATE TABLE parking_spot (
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
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='车位明细表';
```

**初始化数据：**

根据 `parking_space` 表的各区域容量，为4个停车区域生成车位记录：

- **A区(ZONE_A)** - 100个车位，编号 A-01 ~ A-100
- **B区(ZONE_B)** - 80个车位，编号 B-01 ~ B-80
- **残障区(ZONE_DIS)** - 20个车位，编号 D-01 ~ D-20
- **新能源区(ZONE_EV)** - 30个车位，编号 E-01 ~ E-30

所有车位初始状态为 `status=0`(空闲)，其他字段为 NULL。

### 二、计费逻辑重构

**核心变更：** 从"预约时长制"改为"实时计时制"

**业务规则：**

1. **入场规则**
   - 用户选择空闲车位 → 输入车牌号 → 点击"确认入场"
   - 系统记录入场时间(`start_time = 当前系统时间`)
   - 开始实时计时，无需用户预估时长

2. **离场结算**
   - **权限控制：** 用户只能结算自己预约的车位（后端验证 `spot.user_id == current_user_id`）
   - 用户点击已占用的车位 → 查看停车时长 → 点击"确认离场"
   - 系统计算实际停车时长，生成费用

3. **计费规则**
   - 按小时计费，向上取整（不足1小时按1小时算）
   - 计算公式：`费用 = Math.ceil(停车分钟数 / 60) × hourlyRate`

4. **区域费率调整**
   - **A区：免费** (hourlyRate = 0.00 元/小时)
   - **B区：10元/小时** (hourlyRate = 10.00 元/小时)
   - **残障区：免费** (hourlyRate = 0.00 元/小时)
   - **新能源区：5元/小时** (hourlyRate = 5.00 元/小时)

5. **状态简化**
   - 废弃"超时"状态(status=2)
   - 只保留两种状态：
     - `status=0` 空闲（白色显示）
     - `status=1` 已占用（红色显示）

**前端改动：**

预约弹窗（空闲车位点击）：
- 保持现有的车牌输入组件 `LicensePlateInput`
- 去除时长选择器（不再需要 `durationHours`）
- 按钮文本改为"确认入场"
- 入场成功后显示卡片式弹窗："入场成功！车牌号已登记，祝您旅途愉快"

结算弹窗（已占用车位点击）：
- 显示车牌号、入场时间、停车时长、应付金额
- 按钮："取消" + "确认离场"

**后端改动：**

`bookSpot()` 方法重构：
```java
// 参数简化：去除 durationHours
public ParkingSpotVO bookSpot(BookSpotReq req, Long userId) {
    // 1. 验证车位状态为空闲
    // 2. 获取分布式锁防止并发
    // 3. 创建订单（totalAmount = 0，入场时不收费）
    // 4. 更新车位状态：
    //    status = 1
    //    vehicle_no = req.getVehicleNo()
    //    user_id = userId
    //    order_id = 订单ID
    //    start_time = LocalDateTime.now()
    //    planned_end_time = NULL (废弃)
    // 5. 返回更新后的车位信息
}
```

`settleSpot()` 方法重构：
```java
public ParkingSpotVO settleSpot(Long spotId, Long userId) {
    // 1. 验证车位存在
    // 2. **新增：权限验证**
    if (!spot.getUserId().equals(userId)) {
        throw new BizException(ResultCode.FORBIDDEN, "只能结算自己预约的车位");
    }
    // 3. 计算实际时长（向上取整）
    LocalDateTime actualEnd = LocalDateTime.now();
    long minutes = ChronoUnit.MINUTES.between(spot.getStartTime(), actualEnd);
    int hours = (int) Math.ceil(minutes / 60.0);
    if (hours < 1) hours = 1; // 最少1小时
    
    // 4. 计算费用
    BigDecimal hourlyRate = space.getHourlyRate();
    BigDecimal totalFee = hourlyRate.multiply(BigDecimal.valueOf(hours));
    
    // 5. 更新订单状态为已完成，填充 paidAmount
    // 6. 重置车位状态为空闲
    // 7. 返回结算信息（包含费用明细）
}
```

废弃 `detectOvertime()` 定时任务：
- 去除超时检测逻辑
- 去除 `ParkingSpotMapper.updateSpot()` 方法中 status=2 的更新逻辑

**数据库费率调整：**

需要编写迁移脚本 `20260515_update_parking_rates.sql`：

```sql
UPDATE parking_space SET hourly_rate = 0.00 WHERE zone_code = 'ZONE_A';
UPDATE parking_space SET hourly_rate = 10.00 WHERE zone_code = 'ZONE_B';
UPDATE parking_space SET hourly_rate = 0.00 WHERE zone_code = 'ZONE_DIS';
UPDATE parking_space SET hourly_rate = 5.00 WHERE zone_code = 'ZONE_EV';
```

### 三、UI弹窗风格统一

**问题：** 当前预约成功提示和空闲车位提示使用系统默认样式，不符合整体UI风格

**目标风格：** 与译员订单评价弹窗保持一致（参考 `src/pages/interpreter-orders/detail.vue` 的评价弹窗设计）

**设计规范：**

1. **弹窗容器**
   - 圆角卡片：`border-radius: 24rpx`
   - 白色背景：`background-color: $color-bg-card`
   - 阴影效果：`box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15)`
   - 宽度：`width: 600rpx`
   - 内边距：`padding: 48rpx 40rpx`

2. **标题样式**
   - 居中显示：`text-align: center`
   - 字体：`font-size: 32rpx, font-weight: 700`
   - 颜色：`color: $color-text-primary`

3. **按钮样式**
   - 渐变确认按钮：`background: linear-gradient(135deg, $color-primary 0%, #D4784E 100%)`
   - 取消按钮：`background-color: $color-bg-page, border: 2rpx solid $color-divider`
   - 圆角：`border-radius: 44rpx`
   - 高度：`height: 88rpx`

**改动方案：**

1. **入场成功提示弹窗**
   - 去除当前的 `uni.showToast` 系统提示
   - 新增自定义弹窗显示：
     - 标题："入场成功"
     - 内容："车牌号已登记，祝您旅途愉快"
     - 单按钮："好的"（渐变样式）

2. **空闲车位误点击提示**
   - 去除当前后端抛异常导致的系统 Toast
   - 前端逻辑优化：空闲车位点击应弹出预约弹窗，不应触发"无需结算"提示
   - 如果用户试图结算空闲车位（理论上不会发生），前端应拦截，不发送请求

3. **结算确认弹窗**
   - 保持现有的结算弹窗样式
   - 统一按钮风格为渐变样式

**前端代码结构：**

```vue
<!-- 入场成功弹窗 -->
<view v-if="showSuccessDialog" class="dialog-mask" @tap="showSuccessDialog = false">
  <view class="dialog" @tap.stop>
    <text class="dialog__title">入场成功</text>
    <text class="dialog__content">车牌号已登记，祝您旅途愉快</text>
    <view class="dialog__actions">
      <view class="dialog__btn dialog__btn--confirm" @tap="showSuccessDialog = false">好的</view>
    </view>
  </view>
</view>
```

### 四、提前离场功能

**现状：** 后端已有 `settleSpot()` 方法，用户可以通过点击已占用车位进行结算

**改进点：**

1. **前端用户体验**
   - 已占用车位点击后，弹窗显示清晰的停车时长和费用
   - 添加"提前离场"提示文案，告知用户可以随时结算

2. **后端权限验证**
   - 新增用户身份验证，确保只有预约者本人可以结算
   - 防止用户结算他人预约的车位

**结算流程：**

1. 用户点击自己预约的车位（红色）
2. 弹窗显示：
   - 车牌号：`vehicle_no`
   - 入场时间：`start_time`（格式化显示）
   - 停车时长：自动计算（如"已停车 2.5 小时"）
   - 应付金额：实时计算显示
3. 用户点击"确认离场"
4. 后端验证权限、计算费用、更新状态
5. 显示结算成功提示："结算成功，费用 ¥XX，欢迎下次光临"

## 数据库迁移清单

需要创建两个迁移脚本：

1. **`20260515_create_parking_spot.sql`** - 创建车位明细表并初始化230个车位数据
2. **`20260515_update_parking_rates.sql`** - 更新4个停车区域的费率

## 前后端改动清单

### 后端改动

**新增文件：**
- `src/main/resources/db/migration/20260515_create_parking_spot.sql`
- `src/main/resources/db/migration/20260515_update_parking_rates.sql`

**修改文件：**
- `ParkingServiceImpl.java`
  - `bookSpot()` - 简化参数，去除时长预测，改为实时计时
  - `settleSpot()` - 新增权限验证，重构计费逻辑
  - 废弃 `detectOvertime()` 超时检测方法

- `BookSpotReq.java` - DTO参数调整，去除 `durationHours` 字段

- `ParkingSpaceMapper.xml` - 可能需要添加批量插入车位数据的初始化脚本（可选）

### 前端改动

**修改文件：**
- `src/pages/parking/detail.vue`
  - 预约弹窗：去除时长选择，保持车牌输入
  - 入场成功：改为卡片式弹窗
  - 结算弹窗：统一按钮样式，显示实时时长
  - 新增 `showSuccessDialog` 状态变量

- `src/api/parking.js`
  - `bookSpot()` 参数调整，去除 `durationHours`

- `src/components/LicensePlateInput/index.vue` - 保持现有设计，无需改动

## 测试验证

**功能测试：**

1. 数据持久化验证
   - 预约车位 → 返回主页 → 再次进入 → 验证车位状态正确显示为已占用
   - 验证数据库 `parking_spot` 表数据正确更新

2. 计费逻辑验证
   - 入场后立即离场（不足1小时）→ 验证按1小时收费
   - 停车2.5小时 → 验证按3小时收费
   - A区停车 → 验证免费
   - B区停车2小时 → 验证收费20元

3. 权限验证
   - 用户A预约车位 → 用户B尝试结算 → 验证系统拒绝（FORBIDDEN）

4. UI验证
   - 入场成功弹窗样式与译员订单评价弹窗一致
   - 结算弹窗按钮为渐变样式

## 注意事项

1. **数据迁移顺序**
   - 必须先创建 `parking_spot` 表并初始化数据
   - 然后更新费率
   - 两个迁移脚本需按顺序执行

2. **向后兼容**
   - 废弃字段 `planned_end_time` 保留但不使用
   - 旧订单数据不受影响

3. **超时检测清理**
   - 去除定时任务后，需确保不会影响其他功能
   - 检查是否有其他代码依赖 `status=2` 状态

4. **Redis库存管理**
   - 当前系统使用Redis管理区域级库存（`parking:stock:{zoneId}`）
   - 改为车位级预约后，需确认是否仍需要Redis库存管理
   - 建议：保留Redis库存作为区域级展示数据，但实际预约使用车位级锁

## 成功标准

- ✅ 预约车位后数据正确持久化，重新进入页面车位状态正确显示
- ✅ 计费改为实时计时，入场时无需预估时长
- ✅ 离场结算按实际时长向上取整计费
- ✅ 用户只能结算自己预约的车位
- ✅ A区免费、B区10元/时、残障区免费、新能源区5元/时
- ✅ 入场成功提示使用卡片式弹窗，UI风格统一
- ✅ 去除超时状态和超时检测逻辑