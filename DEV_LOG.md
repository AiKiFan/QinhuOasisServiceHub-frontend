# QinhuOasisServiceHub-Frontend 开发日志

> @author AiKiFan  
> 项目：沁湖驿站云服务平台前端  
> 技术栈：UniApp 3.x + Vue3 Composition API + Vite + SCSS

---

## 2026-04-28 — Step 1：项目初始化 + 餐厅排行榜页面

### 完成内容

- 使用 `npx degit dcloudio/uni-preset-vue#vite` 脚手架初始化 UniApp Vue3 + Vite 项目
- 封装 `src/utils/request.js`：统一处理 `{ code, message, data }` 响应格式，内置网络异常 Toast
- 创建 `src/api/restaurant.js`：提供 `getRestaurantRank(top)` 接口函数
- 实现 `src/pages/rank/index.vue` 餐厅人气排行榜页面
  - 接入 `GET /api/restaurants/rank?top=10`（无需鉴权）
  - "暖墨风"UI：暖象牙白底（`#FFF8F0`）+ 珊瑚橙主色（`#E8956D`）+ 金/银/铜排名徽章
  - 三种页面状态：加载中 / 加载失败 + 重试按钮 / 数据列表
  - 支持下拉刷新（`onPullDownRefresh`）

### 设计决策

- `manifest.json` 中 H5 devServer proxy 将 `/api` 转发到 `http://10.220.119.171:8080`，开发环境无需修改 baseUrl
- 不引入第三方 UI 框架，减少包体积，保持"暖墨风"设计一致性
- 使用具名常量替代魔法值：`DEFAULT_RANK_TOP`、`RANK_BADGE_COLORS`、`HTTP_SUCCESS_CODE`
- BEM 命名规范组织 CSS 类名

### 启动方式

```bash
npm run dev:h5
# 浏览器访问 http://localhost:3000
```

### 待办 / 已知问题

- [ ] 封面图加载失败时展示默认占位图（Minio 图片可能不稳定）
- [ ] 点击卡片跳转餐厅详情页（`GET /api/restaurants/{id}`）
- [x] 登录模块 + Token 注入到 `request.js` Authorization 头（已在 Step 2 完成）

---

## 2026-04-28 — Step 2：认证模块

### 完成内容

- 创建 `src/utils/auth.js`：Token / 用户信息本地存取（`saveToken`、`getToken`、`isLoggedIn`、`logout`）
- 修改 `src/utils/request.js`：自动注入 Authorization Bearer Token 头
- 创建 `src/api/auth.js`：`login()`、`register()` 接口函数（接入 `POST /api/auth/login` 和 `/register`）
- 创建 `src/api/user.js`：`getMyProfile()` 接口函数（接入 `GET /api/users/me`）
- 实现 `src/pages/login/index.vue` 登录页（表单校验 + 成功后存 Token 跳转）
- 实现 `src/pages/register/index.vue` 注册页（四字段表单 + 密码二次确认）
- 实现 `src/pages/profile/index.vue` 个人中心页（未登录引导 / 已登录信息 + 角色标签 + 登出）
- 创建 `src/components/TabBar/index.vue` 自定义底部 TabBar（排行榜 + 我的）
- `rank/index.vue` 接入 TabBar，底部 padding 调整为 120rpx

### 设计决策

- 不使用原生 tabBar（避免需要图标图片文件），改用自定义组件 + `uni.reLaunch` 切换
- Profile 页优先读本地缓存展示，静默刷新远端数据，网络失败时降级使用缓存不弹错误
- Token 注入在 `request.js` 集中处理，业务层无需关心鉴权细节

### 待办

- [ ] 点击卡片跳转餐厅详情页（Step 3 实现）
