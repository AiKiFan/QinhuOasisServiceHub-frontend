# 沁湖驿站云服务平台 — 前端开发参考手册

> 版本：v1.0 | 生成日期：2026-04-28 | 后端状态：全量已实现，可直接联调

---

## 一、全局配置

### 1.1 接口地址

| 环境 | BaseURL |
|------|---------|
| 局域网开发 | `http://10.220.119.171:8080/api` |
| 本机调试 | `http://localhost:8080/api` |

> 所有接口路径均以 `/api` 开头，uniapp 中建议统一封装 request 工具，注入 baseURL。

### 1.2 Minio 文件访问地址

| 用途 | 桶名 | 访问前缀 |
|------|------|---------|
| 攻略/评论/头像图片 | `qosh-ugc-images` | `http://10.220.119.171:9000/qosh-ugc-images/` |
| 译员资质证书 | `qosh-interpreter-certs` | 私密桶，不直接暴露 URL |
| 公共静态资源 | `qosh-public-static` | `http://10.220.119.171:9000/qosh-public-static/` |

> 文件上传接口返回的 `url` 字段已是完整可访问 URL，前端直接使用。

### 1.3 请求头规范

| Header | 必须 | 说明 |
|--------|------|------|
| `Authorization` | 登录后必须 | 格式：`Bearer {token}`，token 由登录接口返回 |
| `Accept-Language` | 可选 | `zh-CN`（默认中文）或 `en-US`（英文），控制 `displayName/displayTitle` 等字段语言 |
| `Content-Type` | POST JSON 时 | `application/json` |

---

## 二、响应格式约定

### 2.1 统一响应结构

所有接口返回 `Result<T>` 包装：

```json
{
  "code": 200,
  "message": null,
  "data": { ... }
}
```

失败时：

```json
{
  "code": 401,
  "message": "未登录或登录已过期",
  "data": null
}
```

> `message` 在成功时为 `null`（Jackson `@JsonInclude(NON_NULL)` 不序列化），前端判断 `code === 200` 即为成功。

### 2.2 分页响应结构

分页接口的 `data` 为 `PageResult<T>`：

```json
{
  "code": 200,
  "data": {
    "total": 100,
    "list": [ { ... }, { ... } ]
  }
}
```

### 2.3 错误码一览

| code | 说明 | 触发场景 |
|------|------|---------|
| 200 | 成功 | — |
| 400 | 参数错误 | 字段校验失败、缺少必填项 |
| 401 | 未登录 | token 缺失、无效或过期 |
| 403 | 无权限 | 非管理员访问管理接口 |
| 404 | 资源不存在 | 查询 ID 不存在 |
| 500 | 服务器错误 | 内部异常 |
| 1001 | 用户不存在 | |
| 1002 | 账号已被禁用 | |
| 1003 | 用户名已被占用 | 注册重名 |
| 1004 | 用户名或密码错误 | 登录失败 |
| 1005 | Token 无效 | |
| 1006 | Token 已过期 | |
| 2001 | 译员资质未通过审核 | 预约未通过审核的译员 |
| 2002 | 译员档案已存在 | 重复申请 |
| 3001 | 订单不存在 | |
| 3002 | 订单状态不允许此操作 | 取消已完成订单等 |
| 3003 | 订单已评价 | 重复评价 |
| 4001 | 车位库存不足 | 并发抢占 |
| 4002 | 所选时段已被预约 | |
| 5001 | 内容不存在 | |
| 5002 | 已点赞，请勿重复 | |
| 6001 | 文件上传失败 | Minio 异常 |
| 6002 | 不支持的文件类型 | 非图片类型 |

---

## 三、枚举值参考

| 枚举 | 值 | 说明 |
|------|----|------|
| **UserRole（用户角色）** | 0 | 游客（TOURIST） |
| | 1 | 学生译员（STUDENT，审核通过后升级） |
| | 2 | 管理员（ADMIN） |
| **PostType（帖子类型）** | 1 | 官方攻略（OFFICIAL，管理员发布） |
| | 2 | 游客攻略（TOURIST，需审核） |
| | 3 | 游客动态（DYNAMIC，直接发布） |
| **PostStatus（帖子状态）** | 0 | 草稿 |
| | 1 | 已发布 |
| | 2 | 审核中 |
| | 3 | 已下架 |
| **CommentTargetType** | 1 | 餐厅 |
| | 2 | 攻略/动态 |
| | 3 | 译员订单 |
| | 4 | 车位订单 |
| **OrderStatus（订单状态）** | 0 | 待接单/待支付 |
| | 1 | 已接单/已支付 |
| | 2 | 进行中 |
| | 3 | 已完成 |
| | 4 | 已取消 |
| | 5 | 退款中 |
| | 6 | 已退款 |
| **InterpreterStatus（译员审核状态）** | 0 | 待审核 |
| | 1 | 已通过 |
| | 2 | 已拒绝 |
| | 3 | 暂停接单 |
| **ParkingSpaceType** | 0 | 普通车位 |
| | 1 | 残障专用 |
| | 2 | 新能源充电 |
| **EnglishLevel（英语水平）** | 0 | CET-4 |
| | 1 | CET-6 |
| | 2 | TEM-4 |
| | 3 | TEM-8 |
| | 4 | 其他 |
| **FeedbackType（反馈类型）** | 1 | 投诉 |
| | 2 | 建议 |
| | 3 | 咨询 |
| | 4 | 其他 |
| **FeedbackStatus（反馈状态）** | 0 | 待处理 |
| | 1 | 处理中 |
| | 2 | 已解决 |
| | 3 | 已关闭 |

---

## 四、API 接口文档

### 4.1 认证模块

#### `POST /api/auth/register` — 用户注册

无需登录。

**Request Body：**
```json
{
  "username": "tourist01",
  "password": "Test@1234",
  "nickname": "小明",
  "phone": "13800138001",
  "email": "xm@example.com"
}
```

> `nickname/phone/email` 为可选字段；`username` 限 4-20 位字母数字下划线；`password` 最少 6 位。

**Response：**
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.xxxxx",
    "userId": 2,
    "username": "tourist01",
    "nickname": "小明",
    "role": 0,
    "avatar": null,
    "expiresIn": 604800
  }
}
```

---

#### `POST /api/auth/login` — 用户登录

无需登录。

**Request Body：**
```json
{
  "username": "tourist01",
  "password": "Test@1234"
}
```

**Response：**（同注册，返回相同 `LoginVO` 结构）
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.xxxxx",
    "userId": 2,
    "username": "tourist01",
    "nickname": "小明",
    "role": 0,
    "avatar": null,
    "expiresIn": 604800
  }
}
```

> token 有效期 7 天（604800 秒），前端存入 `localStorage/uni.setStorageSync`，之后请求附带 `Authorization: Bearer {token}`。

---

### 4.2 用户模块

#### `GET /api/users/me` — 获取当前登录用户信息

**需登录。**

**Response：**
```json
{
  "code": 200,
  "data": {
    "id": 2,
    "username": "tourist01",
    "nickname": "小明",
    "phone": "13800138001",
    "email": "xm@example.com",
    "avatar": null,
    "role": 0,
    "locale": "zh_CN",
    "createTime": "2026-04-28T10:00:00"
  }
}
```

---

### 4.3 餐厅模块

#### `GET /api/restaurants` — 餐厅列表（分页）

无需登录。

**Query Params：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `category` | string | — | 分类筛选：中餐/西餐/小吃/快餐/甜品/其他 |
| `page` | int | 1 | 页码 |
| `size` | int | 10 | 每页条数 |

**Response：**
```json
{
  "code": 200,
  "data": {
    "total": 3,
    "list": [
      {
        "id": 1,
        "displayName": "沁湖渔港",
        "category": "中餐",
        "coverImg": "http://10.220.119.171:9000/qosh-ugc-images/...",
        "avgPrice": 88.00,
        "rating": 4.80,
        "reviewCount": 128,
        "businessHours": "10:00-22:00"
      }
    ]
  }
}
```

---

#### `GET /api/restaurants/rank` — 餐厅热度排行榜

无需登录。数据来自 Redis ZSet，实时反映热度。

**Query Params：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `top` | int | 10 | 返回前 N 名 |

**Response：**
```json
{
  "code": 200,
  "data": [
    {
      "rank": 1,
      "id": 1,
      "displayName": "沁湖渔港",
      "category": "中餐",
      "coverImg": "http://...",
      "rating": 4.80,
      "reviewCount": 128,
      "sortScore": 97.5
    },
    {
      "rank": 2,
      "id": 2,
      "displayName": "湖畔茶室",
      "category": "甜品",
      "coverImg": "http://...",
      "rating": 4.60,
      "reviewCount": 96,
      "sortScore": 92.0
    }
  ]
}
```

---

#### `GET /api/restaurants/{id}` — 餐厅详情

无需登录。

**Response：**
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "displayName": "沁湖渔港",
    "category": "中餐",
    "coverImg": "http://...",
    "avgPrice": 88.00,
    "rating": 4.80,
    "reviewCount": 128,
    "businessHours": "10:00-22:00",
    "address": "沁湖景区东区滨湖路1号",
    "lat": 33.123456,
    "lng": 119.234567,
    "phone": "0511-88888888",
    "images": "[\"http://...\",\"http://...\"]",
    "tags": "[\"湖景\",\"特色鱼\"]"
  }
}
```

> `images` 和 `tags` 字段为 JSON 数组字符串，前端 `JSON.parse()` 后使用。

---

### 4.4 车位模块

#### `GET /api/parking/spaces` — 查看所有停车区域及实时库存

无需登录。`availableCount` 来自 Redis 实时库存。

**Response：**
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "displayName": "A区停车场",
      "zoneCode": "ZONE_A",
      "spaceType": 0,
      "totalCapacity": 100,
      "availableCount": 87,
      "locationDesc": "景区东门入口附近，步行至大门约2分钟",
      "hourlyRate": 5.00,
      "status": 1
    },
    {
      "id": 3,
      "displayName": "残障专用停车区",
      "zoneCode": "ZONE_DISABLED",
      "spaceType": 1,
      "totalCapacity": 10,
      "availableCount": 8,
      "locationDesc": "景区主入口无障碍通道旁",
      "hourlyRate": 0.00,
      "status": 1
    }
  ]
}
```

---

#### `POST /api/parking/orders` — 预约车位

**需登录。**

**Request Body：**
```json
{
  "parkingSpaceId": 1,
  "vehicleNo": "苏A12345",
  "startTime": "2026-05-01T09:00:00",
  "endTime": "2026-05-01T17:00:00",
  "remark": "SUV车型"
}
```

**Response：**
```json
{
  "code": 200,
  "data": {
    "id": 101,
    "orderNo": "192837465019283",
    "displayZoneName": "A区停车场",
    "vehicleNo": "苏A12345",
    "startTime": "2026-05-01T09:00:00",
    "endTime": "2026-05-01T17:00:00",
    "totalAmount": 40.00,
    "status": 0,
    "createTime": "2026-04-28T14:23:00"
  }
}
```

> 库存不足时返回 `code: 4001`。

---

#### `POST /api/parking/orders/{orderId}/cancel` — 取消车位预约

**需登录。** 只能取消自己的订单，且状态须为 0（待支付）或 1（已支付）。

**Response：**
```json
{ "code": 200, "data": null }
```

---

### 4.5 攻略/动态模块

#### `GET /api/posts` — 攻略/动态列表（分页）

无需登录。

**Query Params：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | int | — | 1=官方攻略 2=游客攻略 3=游客动态，不传查全部 |
| `page` | int | 1 | 页码 |
| `size` | int | 10 | 每页条数 |

**Response：**
```json
{
  "code": 200,
  "data": {
    "total": 42,
    "list": [
      {
        "id": 5,
        "userId": 2,
        "authorNickname": "小明",
        "authorAvatar": null,
        "postType": 3,
        "displayTitle": "今天在沁湖拍到了绝美日落",
        "summary": "傍晚六点左右，夕阳西下，湖面金光闪闪...",
        "coverImg": "http://...",
        "viewCount": 234,
        "likeCount": 18,
        "commentCount": 5,
        "status": 1,
        "createTime": "2026-04-28T18:30:00"
      }
    ]
  }
}
```

---

#### `GET /api/posts/{id}` — 攻略/动态详情

无需登录。每次访问自动 +1 浏览量。

**Response：**
```json
{
  "code": 200,
  "data": {
    "id": 5,
    "userId": 2,
    "authorNickname": "小明",
    "authorAvatar": null,
    "postType": 3,
    "displayTitle": "今天在沁湖拍到了绝美日落",
    "summary": "傍晚六点左右...",
    "coverImg": "http://...",
    "viewCount": 235,
    "likeCount": 18,
    "commentCount": 5,
    "status": 1,
    "createTime": "2026-04-28T18:30:00",
    "content": "正文内容（支持富文本/Markdown）...",
    "images": "[\"http://...\",\"http://...\"]"
  }
}
```

---

#### `POST /api/posts` — 发布攻略/动态

**需登录。**

**Request Body：**
```json
{
  "postType": 3,
  "title": "今天在沁湖拍到了绝美日落",
  "titleEn": "Amazing sunset at Qinhu Lake today",
  "summary": "傍晚六点左右...",
  "content": "正文内容（富文本/Markdown 均可）...",
  "coverImg": "http://10.220.119.171:9000/qosh-ugc-images/20260428/abc123.jpg",
  "images": [
    "http://10.220.119.171:9000/qosh-ugc-images/20260428/img1.jpg",
    "http://10.220.119.171:9000/qosh-ugc-images/20260428/img2.jpg"
  ]
}
```

> `postType=3`（动态）直接发布；`postType=2`（游客攻略）进入审核，`status` 返回 2。

**Response：**（返回完整 `PostDetailVO`，同详情接口）

---

#### `POST /api/posts/{id}/like` — 点赞/取消点赞

**需登录。** 同一接口自动切换，已点赞则取消。

**Response：**
```json
{
  "code": 200,
  "data": { "liked": true }
}
```

---

### 4.6 评论模块

#### `GET /api/comments` — 查询评论列表（分页）

无需登录。返回一级评论（`parentId` 为 null）。

**Query Params：**

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| `targetId` | long | ✅ | 目标 ID |
| `targetType` | int | ✅ | 1=餐厅 2=攻略 3=译员订单 4=车位订单 |
| `page` | int | — | 默认 1 |
| `size` | int | — | 默认 20 |

**Response：**
```json
{
  "code": 200,
  "data": {
    "total": 5,
    "list": [
      {
        "id": 12,
        "userId": 3,
        "authorNickname": "游客张三",
        "authorAvatar": null,
        "content": "环境很好，鱼特别鲜！",
        "rating": 5,
        "images": "[\"http://...\"]",
        "likeCount": 3,
        "parentId": null,
        "createTime": "2026-04-28T12:00:00"
      }
    ]
  }
}
```

---

#### `POST /api/comments` — 发表评论/评价

**需登录。**

**Request Body：**
```json
{
  "targetId": 1,
  "targetType": 1,
  "content": "环境很好，鱼特别鲜！",
  "rating": 5,
  "images": ["http://10.220.119.171:9000/qosh-ugc-images/20260428/photo.jpg"],
  "parentId": null,
  "orderId": null
}
```

> 对餐厅/译员服务/车位评价时建议传 `rating`；回复他人评论时传 `parentId`；订单评价时传 `orderId`。

**Response：**（返回完整 `CommentVO`）

---

### 4.7 文件上传模块

#### `POST /api/files/upload` — 上传图片

**需登录。** `multipart/form-data` 格式，字段名 `file`。支持 JPEG/PNG/WebP/GIF，单文件最大 10MB。

**Request（form-data）：**
```
file: [图片文件]
```

**Response：**
```json
{
  "code": 200,
  "data": {
    "url": "http://10.220.119.171:9000/qosh-ugc-images/20260428/a1b2c3d4.jpg",
    "originalName": "photo.jpg",
    "size": 204800
  }
}
```

> uniapp 使用 `uni.uploadFile()` 调用此接口，拿到 `url` 后再填入发布/评论请求体。

---

### 4.8 译员模块

#### `POST /api/interpreter/cert-upload` — 上传资质证书

**需登录。** `multipart/form-data`，字段名 `file`，上传到私密桶 `qosh-interpreter-certs`。

**Response：**
```json
{
  "code": 200,
  "data": { "url": "http://10.220.119.171:9000/qosh-interpreter-certs/20260428/cert.jpg" }
}
```

---

#### `POST /api/interpreter/apply` — 申请成为译员

**需登录。** 同一用户只能提交一次。

**Request Body：**
```json
{
  "realName": "李晓华",
  "studentId": "20210012345",
  "school": "江苏某大学",
  "englishLevel": 1,
  "certUrl": "http://10.220.119.171:9000/qosh-interpreter-certs/20260428/cert.jpg",
  "certNo": "CET6-2024-001",
  "introduction": "本人英语六级，有两年景区志愿服务经验...",
  "introductionEn": "CET-6 certified with 2 years of volunteer experience...",
  "serviceTypes": 3,
  "hourlyRate": 50.00
}
```

**Response：**
```json
{
  "code": 200,
  "data": {
    "id": 3,
    "userId": 4,
    "nickname": null,
    "avatar": null,
    "realName": "李晓华",
    "studentId": "20210012345",
    "school": "江苏某大学",
    "englishLevel": 1,
    "certUrl": "http://...",
    "introduction": "本人英语六级...",
    "introductionEn": "CET-6 certified...",
    "displayIntroduction": "本人英语六级...",
    "serviceTypes": 3,
    "hourlyRate": 50.00,
    "rating": 5.00,
    "totalOrders": 0,
    "status": 0,
    "rejectReason": null,
    "createTime": "2026-04-28T15:00:00"
  }
}
```

---

#### `GET /api/interpreters` — 浏览已通过审核的译员列表

无需登录。按评分+接单数降序。

**Query Params：**

| 参数 | 类型 | 默认值 |
|------|------|--------|
| `page` | int | 1 |
| `size` | int | 10 |

**Response：**
```json
{
  "code": 200,
  "data": {
    "total": 5,
    "list": [
      {
        "id": 3,
        "userId": 4,
        "nickname": "晓华同学",
        "avatar": null,
        "realName": "李晓华",
        "school": "江苏某大学",
        "englishLevel": 1,
        "introduction": "本人英语六级...",
        "introductionEn": "CET-6 certified...",
        "displayIntroduction": "本人英语六级...",
        "serviceTypes": 3,
        "hourlyRate": 50.00,
        "rating": 5.00,
        "totalOrders": 0,
        "status": 1,
        "createTime": "2026-04-28T15:00:00"
      }
    ]
  }
}
```

---

#### `GET /api/interpreters/{id}` — 译员详情

无需登录。只返回已通过审核（`status=1`）的译员，否则返回 404。

**Response：**（同列表单项，字段相同）

---

### 4.9 译员订单模块

#### `POST /api/interpreter-orders` — 预约译员服务

**需登录。**

**Request Body：**
```json
{
  "profileId": 3,
  "serviceType": 1,
  "groupSize": 1,
  "startTime": "2026-05-01T09:00:00",
  "endTime": "2026-05-01T12:00:00",
  "remark": "英语陪同游览，路线为主湖区"
}
```

> `profileId` 为 `interpreter_profile.id`（即 `/api/interpreters` 列表中的 `id` 字段）；  
> `serviceType`：1=个人 2=团队；订单金额 = `hourlyRate × 服务小时数`，自动计算。

**Response：**
```json
{
  "code": 200,
  "data": {
    "id": 201,
    "orderNo": "192837465019299",
    "userId": 2,
    "userNickname": "小明",
    "interpreterId": 4,
    "interpreterNickname": "晓华同学",
    "profileId": 3,
    "serviceType": 1,
    "groupSize": 1,
    "startTime": "2026-05-01T09:00:00",
    "endTime": "2026-05-01T12:00:00",
    "totalAmount": 150.00,
    "paidAmount": 0.00,
    "status": 0,
    "remark": "英语陪同游览...",
    "cancelReason": null,
    "isCommented": 0,
    "createTime": "2026-04-28T16:00:00"
  }
}
```

---

#### `POST /api/interpreter-orders/{id}/accept` — 译员接单

**需登录（且必须是该订单指定的译员）。**

**Response：**
```json
{ "code": 200, "data": null }
```

---

#### `POST /api/interpreter-orders/{id}/cancel` — 取消翻译订单

**需登录。** 游客或译员均可操作，订单状态须为 0 或 1。

**Response：**
```json
{ "code": 200, "data": null }
```

---

#### `GET /api/interpreter-orders/mine` — 查看我的翻译订单

**需登录。**

**Query Params：** `page`（默认1）、`size`（默认10）

**Response：**（`PageResult<InterpreterOrderVO>`，字段同预约成功响应）

---

### 4.10 投诉建议模块

#### `POST /api/feedback` — 提交投诉/建议

**无需登录（支持匿名）。** 已登录则自动关联用户 ID。

**Request Body：**
```json
{
  "feedbackType": 1,
  "title": "景区停车场标识不清晰",
  "content": "A区停车场出口处没有明显指引标识，导致车辆拥堵...",
  "images": ["http://10.220.119.171:9000/qosh-ugc-images/20260428/evidence.jpg"],
  "contact": "13800138001"
}
```

**Response：**
```json
{
  "code": 200,
  "data": {
    "id": 10,
    "userId": 2,
    "userNickname": "小明",
    "feedbackType": 1,
    "title": "景区停车场标识不清晰",
    "content": "A区停车场出口处没有明显指引标识...",
    "images": "[\"http://...\"]",
    "contact": "13800138001",
    "status": 0,
    "replyContent": null,
    "replyTime": null,
    "handlerId": null,
    "handlerNickname": null,
    "createTime": "2026-04-28T17:00:00"
  }
}
```

---

### 4.11 管理员接口

> 以下接口均需 `Authorization` 且 `role = 2`（ADMIN），否则返回 403。

#### `GET /api/admin/interpreter-profiles` — 查看所有译员申请

**Query Params：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | int | 状态筛选（不传=全部：0=待审核 1=已通过 2=已拒绝 3=暂停） |
| `page` | int | 默认1 |
| `size` | int | 默认10 |

**Response：**（`PageResult<InterpreterVO>`，包含 `certUrl/certNo/rejectReason` 等私密字段）

---

#### `POST /api/admin/interpreter-profiles/{id}/review` — 审核译员申请

**Query Params：**

| 参数 | 类型 | 必须 | 说明 |
|------|------|------|------|
| `approve` | boolean | ✅ | `true`=通过 `false`=拒绝 |
| `rejectReason` | string | 拒绝时必填 | 拒绝原因 |

示例：`POST /api/admin/interpreter-profiles/3/review?approve=true`

**Response：**
```json
{ "code": 200, "data": null }
```

> 审核通过后，该用户的 `role` 自动从 0 升级为 1（STUDENT），下次登录 token 中 role 更新。

---

#### `GET /api/admin/feedback` — 查看投诉建议列表

**Query Params：** `status`、`feedbackType`（均可选）、`page`（默认1）、`size`（默认20）

**Response：**（`PageResult<FeedbackVO>`）

---

#### `POST /api/admin/feedback/{id}/reply` — 处理投诉建议

**Request Body：**
```json
{
  "replyContent": "感谢您的反馈！我们已安排工作人员在A区停车场出口增设指引标识，预计3日内完成。",
  "status": 2
}
```

> `status`：1=处理中 2=已解决 3=已关闭。

**Response：**
```json
{ "code": 200, "data": null }
```

---

## 五、核心业务流程

### 5.1 车位抢占防超卖流程

```
用户操作：选择停车区域 → 填写车牌号和时间 → 点击"预约"
          ↓
前端：POST /api/parking/orders（附带 Authorization）
          ↓
后端 Step 1：执行 Redis Lua 脚本（原子操作）
             GET parking:stock:{id}
             ├── key 不存在 → 返回 -1 → 抛出 404
             ├── stock ≤ 0  → 返回 0  → 抛出 4001（车位已满）
             └── stock > 0  → DECR    → 返回 1（扣减成功）
          ↓
后端 Step 2（同一事务）：
             写入 biz_order 到 MySQL
             UPDATE parking_space SET available_count = available_count - 1
             WHERE id = ? AND available_count > 0
             ├── 0 行受影响（并发写冲突）→ 抛出异常 → 触发事务回滚
             └── 回滚时 Redis INCR 补回（catch 块执行）
          ↓
成功：返回订单信息

前端处理：
  code=200 → 跳转订单详情页
  code=4001 → 提示"车位已满，请选择其他区域"
  code=4002 → 提示"所选时段已被预约"
```

### 5.2 餐厅热度排行调用流程

```
启动时（RedisDataInitializer）：
  从 MySQL 读取所有餐厅的 sort_score
  批量写入 Redis ZSet：ZADD restaurant:rank {score} {restaurantId}

用户访问排行榜：
  前端：GET /api/restaurants/rank?top=10
  后端：ZREVRANGEBYSCORE restaurant:rank 取 Top N（含 score）
        批量查询餐厅详情（IN 查询，非 N+1）
        根据 Accept-Language 填充 displayName
        返回带 rank 序号的列表

评价写入时（评论模块 POST /api/comments）：
  targetType=1（餐厅）时，Service 自动：
  1. 重新计算 rating（加权平均）
  2. UPDATE biz_restaurant SET sort_score = rating*20 + LOG10(review_count+2)*10
  3. ZADD restaurant:rank {新score} {restaurantId}（覆盖更新）
  → 下次请求排行榜即反映新排名
```

### 5.3 译员预约完整流程

```
① 学生申请：POST /api/interpreter/cert-upload（上传证书图片）
             POST /api/interpreter/apply（提交档案，status=0 待审核）

② 管理员审核：GET /api/admin/interpreter-profiles?status=0
              POST /api/admin/interpreter-profiles/{id}/review?approve=true
              → 后端自动将 sys_user.role 升级为 1（STUDENT）

③ 游客预约：GET /api/interpreters（选择译员，获取 profileId）
            POST /api/interpreter-orders（传 profileId + 时间 → 生成订单 status=0）

④ 译员接单：GET /api/interpreter-orders/mine（译员查看待接订单）
            POST /api/interpreter-orders/{id}/accept（status 0→1）

⑤ 完成/取消：双方均可 POST /api/interpreter-orders/{id}/cancel
```

---

## 六、uniapp 接口调用示例

```javascript
// utils/request.js
const BASE_URL = 'http://10.220.119.171:8080/api'

export function request(options) {
  const token = uni.getStorageSync('token')
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'Accept-Language': uni.getStorageSync('locale') || 'zh-CN',
        ...options.header
      },
      success: (res) => {
        if (res.data.code === 200) {
          resolve(res.data.data)
        } else if (res.data.code === 401) {
          uni.removeStorageSync('token')
          uni.navigateTo({ url: '/pages/login/login' })
          reject(res.data)
        } else {
          uni.showToast({ title: res.data.message || '请求失败', icon: 'none' })
          reject(res.data)
        }
      },
      fail: reject
    })
  })
}

// 文件上传示例
export function uploadFile(filePath) {
  const token = uni.getStorageSync('token')
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + '/files/upload',
      filePath,
      name: 'file',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        const data = JSON.parse(res.data)
        if (data.code === 200) resolve(data.data.url)
        else reject(data)
      },
      fail: reject
    })
  })
}
```

---

## 七、注意事项

1. **时间格式**：后端使用 `LocalDateTime`，JSON 序列化为 `"2026-05-01T09:00:00"` 格式，前端传参须保持一致。
2. **图片 JSON 字段**：`PostDetailVO.images`、`CommentVO.images`、`FeedbackVO.images` 均为 JSON 数组字符串（已通过 `@JsonRawValue` 直接输出为 JSON 数组），前端接收到的已是数组，**无需再次 `JSON.parse`**。
3. **i18n 国际化**：`displayName`、`displayTitle`、`displayIntroduction` 等 `display*` 字段已由后端根据 `Accept-Language` 自动选择语言，前端直接展示这些字段即可。
4. **role 升级延迟**：管理员审核通过后，译员须重新登录才能获得新 role 的 token。前端可在检测到 403 后引导用户重新登录。
5. **车位库存展示**：`availableCount` 来自 Redis 实时值，刷新页面即可获取最新库存，无需 WebSocket。
6. **管理员账号**：初始账号 `admin` / 密码 `Admin@123456`（role=2，可直接访问 `/admin/**` 接口）。
