# 沁湖驿站 · Qinhu Oasis Service Hub

<div align="center">

![uni-app](https://img.shields.io/badge/uni--app-3.0.0-27b7b7?style=flat-square&logo=uni-app)
![Vue](https://img.shields.io/badge/Vue-3.4.x-42b883?style=flat-square&logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.2.8-646cff?style=flat-square&logo=vite)
![SCSS](https://img.shields.io/badge/SCSS-1.99-cc6699?style=flat-square&logo=sass)

**H5 智慧旅游云服务平台前端**

*沁湖明月，智游驿站 —— 一站式提供景区导览、美食推荐、译员预约、智慧停车等旅游服务*

</div>

---

## 1. 项目简介

**沁湖驿站** 是一款面向景区游客的 H5 智慧旅游云服务平台，基于 uni-app + Vue 3 构建，天然支持多端部署（H5 / 微信小程序 / 支付宝小程序 / 鸿蒙等）。

平台整合了以下核心服务：

| 模块 | 说明 |
|------|------|
| 景区导览 | 景点列表、详情、评分评论、收藏 |
| 美食排行 | 餐厅分类排行、详情、相册、评分 |
| 译员预约 | 学生译员档案查询、在线预约、服务订单管理 |
| 智慧停车 | 停车区域查询、车位预约、选位、入场/离场结算 |
| 投诉建议 | 游客反馈、图文附件、管理员处理 |
| 个人中心 | 收藏管理、游记发布、评论点赞、资料编辑 |

---

## 2. 创意与业务亮点

### 2.1 真正的双语旅游体验

整套系统采用 **前端实时双语切换**（zh-CN ↔ en-US），`i18n.js` 中所有文案均有中英文对照，未登录用户也可在登录/注册页一键切换语言，解决外国游客的语言障碍问题。

### 2.2 温暖的中式视觉风格

采用暖珊瑚色（`#E8956D`）为主色调，配合米白色（`#FFF8F0`）背景页和深棕色（`#2C1A0E`）主文字，构建温暖舒适的中式旅游氛围。所有颜色通过 SCSS 变量统一管理。

### 2.3 自定义 TabBar + 无刷新导航

采用自定义底部导航组件（非原生 tabBar），通过 `uni.reLaunch` 保持 TabBar 页面间的无缝切换体验；子页面之间使用 `uni.redirectTo` 替换页面，避免导航栈堆积。

### 2.4 MinIO 图片兼容方案

开发环境下图片 URL 通过 `SafeImage` 组件自动重写，将 MinIO 预签名 URL 中的 `localhost:9000` 替换为当前访问地址，兼容手机直接访问场景。

### 2.5 多级缓存策略

`cache.js` 提供 TTL 缓存封装；`image-cache.js` 基于 IndexedDB 实现图片本地持久缓存，离线也能查看已加载过的图片。

### 2.6 灵活的权限体系

`auth.js` 实现基于角色（Tourist 0 / Interpreter 1 / Admin 2）的细粒度权限判断，`request.js` 自动注入 JWT Token，支持游客、译员、管理员三类身份无缝切换。

---

## 3. 核心技术栈

### 3.1 技术选型

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | uni-app (Vue 3) | 3.0.0-5000720260410001 |
| 构建工具 | Vite | 5.2.8 |
| 语言 | TypeScript / JavaScript | ES2020+ |
| 视图层 | Vue 3 (Composition API) | 3.4.x |
| 国际化 | vue-i18n | 9.1.9 |
| 样式预处理 | SCSS | 1.99 |
| HTTP | uni.request (拦截封装) | 内置 |
| 本地存储 | localStorage + IndexedDB | - |

### 3.2 目录结构

```
src/
├── api/                          # API 接口模块（按业务域划分）
│   ├── request.js                # HTTP 拦截器（Token 注入 / 错误处理）
│   ├── auth.js                   # 登录 / 注册
│   ├── user.js                   # 用户信息
│   ├── restaurant.js             # 餐厅列表 & 排行
│   ├── scenic.js                 # 景点列表 & 详情
│   ├── interpreter.js            # 译员列表 & 申请
│   ├── interpreter-order.js      # 译员订单
│   ├── parking.js               # 停车预约
│   ├── feedback.js               # 投诉建议
│   ├── favorites.js             # 收藏管理
│   ├── comment.js               # 评论系统
│   ├── weather.js              # 实时天气
│   ├── search.js               # 全局搜索
│   └── admin.js               # 管理员面板
├── components/                   # 可复用组件库
│   ├── TabBar/                  # 自定义底部导航（4 Tab）
│   ├── HomeSwiper/             # 首页 Banner 轮播
│   ├── WeatherCard/            # 天气卡片（实时 + 3日预报）
│   ├── SafeImage/              # 安全图片（缓存 + 预览 + URL 重写）
│   ├── Skeleton/               # 骨架屏加载态
│   ├── PullRefresh/            # 自定义下拉刷新
│   ├── ErrorPage/              # 错误状态页（404/500/网络错误）
│   └── LicensePlateInput/      # 车牌号输入键盘
├── pages/                       # 页面（file-based routing）
│   ├── index/                   # 首页（Banner + 快捷服务入口 + 天气）
│   ├── search/                 # 全局搜索
│   ├── favorites/               # 我的收藏
│   ├── rank/                   # 餐厅排行榜
│   ├── profile/                # 个人中心
│   ├── login/                  # 登录页
│   ├── register/              # 注册页
│   ├── restaurant/             # 餐厅模块
│   ├── scenic/                 # 景点模块
│   ├── interpreter/            # 译员预约模块
│   ├── interpreter-orders/     # 译员订单模块
│   ├── parking/               # 智慧停车模块
│   ├── feedback/              # 投诉建议模块
│   └── admin/                  # 管理员面板
├── static/                     # 静态资源（图片 / 图标）
├── utils/                      # 工具函数
│   ├── i18n.js                 # 双语国际化（zh-CN / en-US）
│   ├── auth.js                 # 权限工具（Token / 角色 / 登录状态）
│   ├── request.js              # HTTP 请求封装
│   ├── cache.js                # 多级 TTL 缓存（本地存储）
│   ├── image-cache.js          # IndexedDB 图片缓存
│   ├── share.js                # 微信/朋友圈/链接/海报分享
│   └── analytics.js            # 事件追踪（批量上报）
├── App.vue                     # 根组件
├── main.js                     # 入口文件
├── manifest.json               # uni-app 应用配置
├── pages.json                  # 页面路由 + 全局样式配置
├── uni.scss                    # 全局 SCSS 变量
└── vite.config.js              # Vite 构建配置（含 API 代理）
```

---

## 4. 关键技术点解析

### 4.1 双语国际化 `t()` 函数

```javascript
// src/utils/i18n.js
export function t(key, params = {}) {
  const lang = getLanguage()          // 从 localStorage 读取
  const dict = lang === 'en-US' ? EN : ZH
  let text = dict[key] ?? key         // 无对应翻译时降级为 key
  Object.entries(params).forEach(([k, v]) => {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
  })
  return text
}
```

模板使用：`{{ t('auth.usernameTooShort', { n: 3 }) }}` → "用户名至少 3 位"

### 4.2 统一 HTTP 拦截器

`request.js` 实现全链路拦截：自动检测环境（localhost → 代理，生产 → 真实后端）、注入 `Authorization: Bearer {token}` 和 `Accept-Language` 请求头，统一处理 200 响应解包和错误 Toast 提示。

```javascript
// src/api/request.js（核心逻辑）
const baseUrl = isLocalhost ? '/api' : 'http://{your-server-ip}:8080/api'

// 请求拦截：注入 Token + 语言
config.header = {
  Authorization: token ? `Bearer ${token}` : '',
  'Accept-Language': getLanguage() === 'en-US' ? 'en-US' : 'zh-CN',
}

// 响应拦截：解包 data 并处理业务错误
if (res.data.code !== 200) {
  uni.showToast({ title: res.data.message, icon: 'none' })
  return Promise.reject(new Error(res.data.message))
}
```

### 4.3 自定义底部导航（TabBar）

绕过原生 tabBar 的限制，自定义 `TabBar/index.vue` 实现样式完全可控的 4 Tab 导航（首页 / 搜索 / 收藏 / 我的），使用 `uni.reLaunch` 切换以保持活跃状态同步。

```vue
<!-- src/components/TabBar/index.vue（核心结构） -->
<template>
  <view class="tabbar">
    <view
      v-for="tab in tabs"
      :key="tab.pagePath"
      class="tabbar__item"
      :class="{ 'tabbar__item--active': active === tab.pagePath }"
      @tap="switchTab(tab.pagePath)"
    >
      <text class="tabbar__icon">{{ tab.icon }}</text>
      <text class="tabbar__text">{{ t(tab.i18nKey) }}</text>
    </view>
  </view>
</template>
```

### 4.4 SafeImage 图片安全组件

解决开发环境下手机无法显示 MinIO 预签名图片的问题：

```javascript
// SafeImage 核心逻辑
methods: {
  loadImage() {
    let url = this.src
    // 开发环境且含 localhost:9000 → 替换为当前主机
    if (import.meta.env.DEV && url.includes('localhost:9000')) {
      const origin = window.location.origin  // e.g. http://10.220.119.171:3000
      url = url.replace('localhost:9000', origin.split('//')[1])
    }
    this.currentSrc = url
  }
}
```

---

## 5. 环境准备与快速启动

### 5.1 环境要求

| 环境 | 要求 |
|------|------|
| Node.js | ≥ 18.0.0 |
| npm / pnpm | 最新稳定版 |
| 后端 | 启动 `QinhuOasisServiceHub-backend`（端口 8080） |
| MinIO | 运行并配置 `application-local.yml` 中的桶 |
| MySQL | 8.0+ |
| Redis | 6.0+ |

### 5.2 安装依赖

```bash
# 进入前端目录
cd QinhuOasisServiceHub-frontend

# 安装依赖
npm install
# 或使用 pnpm（更快）
pnpm install
```

### 5.3 配置后端地址

开发环境 Vite 代理配置（已预设）：

```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'http://192.168.18.233:8080',  // 替换为你的后端 IP
    changeOrigin: true,
  }
}
```

> **注意**：若手机无法访问，请将 `target` 改为电脑局域网 IP（如 `http://192.168.x.x:8080`），并确保手机与电脑在同一局域网下。

### 5.4 启动开发服务器

```bash
# H5 开发模式（推荐）
npm run dev:h5

# 或指定自定义端口
npm run dev:custom -- --port 3000
```

访问地址：`http://localhost:3000`（H5）  
手机访问：`http://{电脑局域网IP}:3000`

### 5.5 构建生产版本

```bash
# 构建 H5 生产包
npm run build:h5

# 构建产物位于 dist/build/h5 目录
```

### 5.6 切换语言

在任何页面（非强制），点击登录/注册页的 `🌐 切换语言` 按钮，整站语言立即切换（中 ↔ 英），语言偏好自动保存至 `localStorage`。

---

## 6. 接口一览（主要 API）

| 模块 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 认证 | POST | `/api/auth/login` | 登录 |
| 认证 | POST | `/api/auth/register` | 注册 |
| 餐厅 | GET | `/api/restaurants` | 餐厅列表（分页+分类） |
| 餐厅 | GET | `/api/restaurants/rank` | 热门排行 |
| 餐厅 | GET | `/api/restaurants/{id}` | 餐厅详情 |
| 景点 | GET | `/api/scenic-spots` | 景点列表 |
| 景点 | GET | `/api/scenic-spots/{id}` | 景点详情 |
| 译员 | GET | `/api/interpreters` | 译员列表 |
| 译员 | POST | `/api/interpreter/apply` | 申请译员 |
| 译员 | POST | `/api/interpreter-orders` | 预约译员 |
| 停车 | GET | `/api/parking/spaces` | 停车区域 |
| 停车 | POST | `/api/parking/orders` | 预约车位 |
| 停车 | POST | `/api/parking/spots/{id}/book` | 选位预约 |
| 停车 | POST | `/api/parking/spots/{id}/settle` | 结算离场 |
| 收藏 | POST | `/api/favorites` | 添加收藏 |
| 天气 | GET | `/api/weather/now` | 实时天气 |
| 投诉 | POST | `/api/feedback` | 提交投诉建议 |
| 管理 | GET | `/api/admin/feedback` | 管理员反馈列表 |
| 管理 | POST | `/api/admin/interpreter-profiles/{id}/review` | 审核译员申请 |

---

## 7. 角色权限说明

| 角色值 | 身份 | 可用功能 |
|--------|------|----------|
| `0` | 普通游客 | 浏览、收藏、发布游记、投诉建议、预约停车 |
| `1` | 学生译员 | 以上全部 + 译员申请、接收订单、回复客户 |
| `2` | 管理员 | 以上全部 + 餐厅/景点管理、译员审核、反馈处理 |

> 默认管理员账号：**admin** / **Admin@123456**

---

## 8. 项目特点速览

- ✅ **Vue 3 Composition API** —— 告别 Options API，逻辑更内聚
- ✅ **双语言实时切换** —— 覆盖全站所有文案，未登录也可切换
- ✅ **多端一套代码** —— H5 / 小程序 / 鸿蒙一次编写，多端运行
- ✅ **MinIO 预签名图片** —— 安全高效的文件访问，无需暴露存储地址
- ✅ **自定义 TabBar** —— 样式完全可控，突破原生 tabBar 限制
- ✅ **多级缓存** —— localStorage TTL + IndexedDB 图片缓存，离线可用
- ✅ **统一错误处理** —— HTTP 拦截器 + 业务错误码双层保障
- ✅ **优雅降级** —— 无 Token → 匿名访问；无图片 → 占位符兜底

---

*Made with ❤️ by AiKiFan · 沁湖驿站智慧旅游云服务平台 · 2026*
