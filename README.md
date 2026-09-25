# 沁湖驿站 · Qinhu Oasis Service Hub Frontend

<div align="center">

![uni-app](https://img.shields.io/badge/uni--app-3.0.0-27b7b7?style=flat-square)
![Vue](https://img.shields.io/badge/Vue-3.4.x-42b883?style=flat-square&logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.2.8-646cff?style=flat-square&logo=vite)
![SCSS](https://img.shields.io/badge/SCSS-1.99-cc6699?style=flat-square&logo=sass)
![i18n](https://img.shields.io/badge/i18n-zh--CN%20%2F%20en--US-8E6FF7?style=flat-square)

**沁湖驿站云服务平台 · 前端应用**

*uni-app · Vue 3 · Vite · H5 / 小程序多端适配*

</div>

---

## 1. 项目简介

沁湖驿站前端是基于 uni-app 与 Vue 3 构建的智慧旅游服务应用，当前主要面向 H5 开发调试，同时保留多端编译能力。项目以暖珊瑚色与米白色为主视觉，提供景区导览、餐厅排行、译员预约、智慧停车、投诉建议、官方攻略、游客攻略、收藏评论和后台管理等功能。

前端默认通过统一请求封装访问后端：

```text
H5:      http://{当前访问主机}:8080/api
非 H5:   http://localhost:8080/api
```

例如前端以 `http://localhost:3000/#/` 运行时，接口会请求 `http://localhost:8080/api`。

---

## 2. 当前功能模块

| 模块 | 页面/能力 |
| --- | --- |
| 首页 | 天气卡片、首页轮播、功能入口、自定义底部导航 |
| 登录注册 | 账号登录、账号注册、Token 本地保存、登录状态恢复 |
| 景区导览 | 景点列表、景点详情、收藏、后台景点管理 |
| 餐厅服务 | 餐厅列表、详情、相册、排行榜、后台餐厅管理 |
| 译员服务 | 译员列表、详情、预约下单、申请成为译员、我的申请、后台审核 |
| 译员订单 | 我的订单、收到的订单、订单详情、接单、拒单、取消、完成 |
| 智慧停车 | 停车区列表、车位选择、车牌输入、预约、离场结算 |
| 投诉建议 | 提交图文反馈、我的反馈、详情跟进、关闭/确认解决、后台处理 |
| 官方攻略/游客攻略 | 攻略列表、详情、发布、编辑、图片增删改、封面设置、点赞、评论、收藏、公开/私密、我的攻略、后台审核 |
| 收藏中心 | 按类型查看收藏内容，支持攻略等内容收藏状态展示 |
| 个人中心 | 用户资料、角色入口、我的订单、我的反馈、我的攻略、管理入口 |
| 国际化 | 中英文切换，接口自动携带 `Accept-Language` |

---

## 3. 技术栈

| 类别 | 技术 | 版本/说明 |
| --- | --- | --- |
| 跨端框架 | uni-app | 3.0.0-5000720260410001 |
| 前端框架 | Vue 3 | 3.4.x，Composition API |
| 构建工具 | Vite | 5.2.8 |
| 国际化 | vue-i18n / 自定义 i18n 工具 | `zh-CN`、`en-US` |
| 样式 | SCSS | 全局变量与页面局部样式 |
| HTTP | `uni.request` | 统一封装请求、Token、语言头、错误提示 |
| 本地存储 | `uni.setStorageSync` / IndexedDB | Token、用户信息、语言、缓存图片 |
| 资源展示 | 自定义组件 | SafeImage、WeatherCard、HomeSwiper、TabBar 等 |

---

## 4. 目录结构

```text
QinhuOasisServiceHub-frontend
├── src
│   ├── api                    # 后端接口封装
│   ├── components             # 通用组件
│   │   ├── TabBar             # 自定义底部导航，使用本地 SVG 图标
│   │   ├── SafeImage          # 图片兼容、兜底、预览
│   │   ├── WeatherCard        # 天气卡片
│   │   ├── HomeSwiper         # 首页轮播
│   │   ├── Skeleton           # 骨架屏
│   │   ├── PullRefresh        # 下拉刷新
│   │   └── LicensePlateInput  # 车牌输入
│   ├── pages                  # 业务页面
│   │   ├── admin              # 后台管理页面
│   │   ├── feedback           # 投诉建议页面
│   │   ├── guide              # 攻略发布、列表、详情、我的攻略
│   │   ├── interpreter        # 译员资料与申请
│   │   ├── interpreter-orders # 译员订单
│   │   ├── parking            # 智慧停车
│   │   ├── profile            # 个人中心
│   │   ├── restaurant         # 餐厅页面
│   │   └── scenic             # 景点页面
│   ├── static                 # 静态资源与本地图标
│   ├── styles                 # 全局样式与变量
│   ├── utils                  # 请求、认证、国际化、缓存、图片工具
│   ├── App.vue
│   ├── main.js
│   └── pages.json             # 页面路由配置
├── package.json
└── vite.config.js
```

---

## 5. 页面路由概览

### 5.1 基础页面

| 路由 | 说明 |
| --- | --- |
| `pages/index/index` | 首页 |
| `pages/search/index` | 搜索页 |
| `pages/favorites/index` | 收藏页 |
| `pages/favorites/folders` | 收藏分类页 |
| `pages/rank/index` | 排行榜 |
| `pages/profile/index` | 个人中心 |
| `pages/profile/edit` | 资料编辑 |
| `pages/login/index` | 登录 |
| `pages/register/index` | 注册 |

### 5.2 业务页面

| 路由 | 说明 |
| --- | --- |
| `pages/scenic/list` | 景点列表 |
| `pages/scenic/detail` | 景点详情 |
| `pages/restaurant/list` | 餐厅列表 |
| `pages/restaurant/detail` | 餐厅详情 |
| `pages/restaurant/album` | 餐厅相册 |
| `pages/interpreter/list` | 译员列表 |
| `pages/interpreter/detail` | 译员详情 |
| `pages/interpreter/booking` | 预约译员 |
| `pages/interpreter/apply` | 申请成为译员 |
| `pages/interpreter/my-application` | 我的译员申请 |
| `pages/interpreter-orders/list` | 我的译员订单 |
| `pages/interpreter-orders/received` | 收到的译员订单 |
| `pages/interpreter-orders/detail` | 译员订单详情 |
| `pages/parking/detail` | 智慧停车 |
| `pages/feedback/submit` | 提交投诉建议 |
| `pages/feedback/my-feedback` | 我的投诉建议 |
| `pages/guide/list` | 攻略列表 |
| `pages/guide/detail` | 攻略详情 |
| `pages/guide/publish` | 发布/编辑攻略 |
| `pages/guide/my` | 我的攻略 |

### 5.3 管理页面

| 路由 | 说明 |
| --- | --- |
| `pages/admin/interpreter-review` | 译员审核 |
| `pages/admin/interpreter-edit` | 编辑译员资料 |
| `pages/admin/feedback-list` | 投诉建议管理 |
| `pages/admin/feedback-detail` | 投诉详情处理 |
| `pages/admin/restaurant-list` | 餐厅管理 |
| `pages/admin/scenic-list` | 景点管理 |
| `pages/admin/guide-moderation` | 攻略审核管理 |

---

## 6. 关键实现说明

### 6.1 请求封装

`src/utils/request.js` 统一封装 `uni.request`：

- 自动拼接后端基础地址。
- 自动携带 `Content-Type: application/json`。
- 登录后自动携带 `Authorization: Bearer <token>`。
- 自动携带 `Accept-Language`，与后端国际化逻辑联动。
- 统一解析 `{ code, message, data }` 响应结构。
- 业务失败或网络异常时统一弹出提示。

### 6.2 登录态与角色

`src/utils/auth.js` 维护 Token、用户信息和角色判断。当前角色约定：

| 角色值 | 说明 |
| --- | --- |
| `0` | 游客 |
| `1` | 学生译员 |
| `2` | 管理员 |

管理员账号由后端初始化器提供，详见后端 README。

### 6.3 国际化

项目支持中文与英文：

- 语言值：`zh-CN`、`en-US`。
- 语言偏好持久化到本地存储 `qinhu_language`。
- 切换语言后页面文案和接口展示字段会同步变化。
- H5 开发调试阶段支持键盘 `S` 快捷键直接切换中英文，不刷新页面。该能力只是调试辅助，正式上线可按需删除。

### 6.4 自定义 TabBar 与视觉风格

底部导航使用 `components/TabBar/index.vue` 自定义实现，图标使用本地 SVG 资源，避免不同平台 Emoji 或字体图标渲染不一致。整体 UI 以暖珊瑚色、米白色、深棕色为主，页面卡片、圆角、阴影、按钮风格尽量保持统一。

### 6.5 图片兼容与缓存

`SafeImage` 组件负责图片展示兜底、预览和开发环境 URL 兼容；当 MinIO 地址在手机访问或局域网调试中不可直接访问时，会尽量将图片地址调整为当前可访问主机。项目还包含图片缓存工具，用于提升已访问图片的再次展示体验。

### 6.6 攻略模块

攻略模块由 `src/api/guide.js` 与 `pages/guide` 下页面实现：

- 列表支持全部、官方攻略、游客攻略筛选。
- 详情支持封面、正文、多图预览、点赞、收藏、评论。
- 发布页支持新增与编辑；管理员可发官方攻略，普通用户发游客攻略。
- 图片支持上传、删除、替换、设为封面，最多 9 张。
- 作者可设置公开/私密、编辑或删除自己的攻略。
- 编辑已发布攻略后，会根据后端审核开关重新进入审核或直接发布。
- 管理员审核页支持审核开关、类型/状态筛选、发布、下架和删除。

### 6.7 智慧停车模块

停车页面按“停车区 -> 车位”展示，用户输入车牌后预约具体车位，离场时由后端按实际停车时长向上取整计费。前端只负责状态展示和操作入口，车位并发控制与费用计算以后端为准。

---

## 7. 接口封装概览

| 文件 | 说明 |
| --- | --- |
| `src/api/auth.js` | 登录、注册 |
| `src/api/user.js` | 当前用户信息查询与更新 |
| `src/api/weather.js` | 实时天气与预报 |
| `src/api/restaurant.js` | 餐厅列表、详情、排行 |
| `src/api/scenic.js` | 景点列表、详情、后台管理 |
| `src/api/interpreter.js` | 译员列表、详情、申请、审核 |
| `src/api/interpreter-order.js` | 译员预约订单流程 |
| `src/api/parking.js` | 停车区、车位、预约、结算 |
| `src/api/feedback.js` | 投诉建议提交、查询、处理 |
| `src/api/guide.js` | 攻略列表、详情、发布、编辑、审核、点赞 |
| `src/api/comment.js` | 评论列表与发布 |
| `src/api/favorites.js` | 收藏新增、取消、检查、列表 |
| `src/api/admin.js` | 管理端通用接口封装 |
| `src/api/search.js` | 搜索相关接口封装 |

---

## 8. 本地开发

### 8.1 环境要求

- Node.js 18+
- npm 9+
- 后端服务：`http://localhost:8080/api` 或当前局域网主机的 `8080/api`

### 8.2 安装依赖

```bash
cd QinhuOasisServiceHub-frontend
npm install
```

### 8.3 H5 开发运行

```bash
npm run dev:h5
```

如需指定端口，例如调试地址为 `http://localhost:3000/#/`：

```bash
npm run dev:custom -- --port 3000
```

当前 `vite.config.js` 中保留了 `/api` 代理配置，但普通 API 请求由 `src/utils/request.js` 直接指向后端 `8080/api`，因此本地联调时请优先确认后端服务和网络地址可访问。

### 8.4 打包

```bash
npm run build:h5
```

项目也保留了多个小程序平台的 `dev:mp-*` 与 `build:mp-*` 脚本，具体以 `package.json` 为准。

---

## 9. 联调注意事项

- 后端默认端口为 `8080`，上下文路径为 `/api`。
- 如果使用手机访问 H5，需要电脑、手机、后端、MinIO 处在可互通网络中。
- H5 请求基础地址使用当前访问页面的主机名加 `8080` 端口；例如访问 `http://192.168.1.10:3000/#/`，接口会请求 `http://192.168.1.10:8080/api`。
- 切换中英文时会同步改变请求头 `Accept-Language`，后端会按语言返回部分展示字段。
- 图片无法展示时，优先检查 MinIO endpoint、Bucket 访问策略、对象 URL 主机名与前端访问设备是否互通。
- 攻略、反馈等上传图片前，需要后端 `/files/upload` 或对应业务上传接口可正常访问。

---

## 10. 开发规范

- 新页面尽量沿用当前暖色主题、卡片圆角、按钮、弹窗和间距风格。
- 新接口统一放入 `src/api`，页面不要散落硬编码请求。
- 需要登录的页面应先判断 Token 或当前用户信息，再进入业务操作。
- 新增固定文案时同步补充中英文翻译，避免语言切换后仍出现单侧语言。
- 新增图片展示优先使用 `SafeImage`，避免直接依赖固定 MinIO 主机名。
- 调试能力与正式功能应保持边界清晰，例如 H5 `S` 键切换语言属于临时调试能力。
