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

- [x] 点击卡片跳转餐厅详情页（Step 3 实现）

---

## 2026-04-29 — Step 3：译员模块 + 餐厅详情 + 管理后台

### 完成内容

#### 国际化工具
- 创建 `src/utils/i18n.js`：支持中英文语言切换（`getLanguage`、`toggleLanguage`）
- 修改 `src/utils/request.js`：自动注入 `Accept-Language` 请求头

#### API 层
- 创建 `src/api/interpreter.js`：
  - `getInterpreterList(page, size)` — 获取译员列表
  - `getInterpreterDetail(id)` — 获取译员详情
  - `applyInterpreter(data)` — 申请成为译员
  - `uploadInterpreterCert(filePath)` — 上传证书图片
- 创建 `src/api/interpreter-order.js`：
  - `createInterpreterOrder(data)` — 创建译员预约订单
- 创建 `src/api/admin.js`：
  - `getAdminInterpreterProfiles(params)` — 管理员获取译员申请列表
  - `reviewInterpreterProfile(id, approved, rejectReason)` — 审核译员申请
  - `getAdminFeedbackList(params)` — 管理员获取投诉建议列表
  - `replyFeedback(id, data)` — 管理员回复反馈
- 创建 `src/api/comment.js`：
  - `getCommentList(params)` — 获取评论列表
  - `postComment(data)` — 发布评论
  - `COMMENT_TARGET_TYPE` 常量（餐厅 = 1, 译员 = 2）

#### 页面组件
- 扩展 `src/components/TabBar/index.vue`：新增"译员" tab（🌍 图标）
- 创建 `src/pages/interpreter/list.vue`：
  - 顶部分类筛选（全部 / 个人译员 / 团队译员）
  - 译员卡片列表：头像、姓名、英语等级标签、学校、评分、时薪、服务类型
  - 支持下拉刷新
- 创建 `src/pages/interpreter/detail.vue`：
  - 译员详细信息：头像、姓名、英语等级、学校、学号、评分、完成订单数、时薪
  - 资质证书展示（可点击预览）
  - 中英文自我介绍
  - 底部"立即预约"按钮
- 创建 `src/pages/interpreter/booking.vue`：
  - 预约表单：服务类型（个人/团队）、团队人数、开始/结束时间、备注
  - 费用预览：时薪 × 时长
  - 提交后跳转个人中心
- 创建 `src/pages/interpreter/apply.vue`：
  - 申请表单：真实姓名、学号、学校、英语等级、证书上传、中英文介绍、服务类型、时薪
  - 证书图片预览与重新上传
  - 表单校验（必填项、时薪非负、至少选择一种服务类型）
- 创建 `src/pages/admin/interpreter-review.vue`（管理员专用）：
  - 状态筛选（全部 / 待审核 / 已通过 / 已拒绝 / 暂停）
  - 审核卡片：基本信息、证书展示、介绍、拒绝理由（已拒绝时）
  - 操作按钮：拒绝（需输入理由）/ 通过
  - 权限检查：非管理员自动跳转回首页
- 创建 `src/pages/admin/feedback-list.vue`（管理员专用）：
  - 状态与类型双重筛选
  - 反馈卡片：类型/状态标签、标题、内容、提交者信息、附件图片、管理员回复
  - 回复弹窗：输入内容 + 选择处理后状态（处理中/已解决/已关闭）
  - 权限检查：非管理员自动跳转回首页
- 修改 `src/pages/profile/index.vue`：
  - 新增"申请成为译员"菜单项
  - 新增语言切换菜单项（🌐 图标）："English / 英文模式"
  - 新增"管理后台"区域（仅管理员可见）："译员申请审核"、"投诉建议管理"
- 修改 `src/pages/rank/index.vue`：
  - 新增 `goToDetail(id)` 函数
  - 餐厅卡片添加 `@tap` 事件，点击跳转 `pages/restaurant/detail?id={id}`
- 创建 `src/pages/restaurant/detail.vue`：
  - 封面轮播图（横向滚动）
  - 基本信息：名称、分类、均价、评分、评价数、标签、营业时间、地址（可打开地图）、电话（可拨打）
  - 评论区：用户评价列表（作者、评分、内容、时间）
  - 发表评论表单：评分选择（5 星）、评论输入（500 字）、提交按钮（需登录）
  - 地址/电话链接调用原生 API（`uni.openLocation` / `uni.makePhoneCall`）
- 更新 `src/pages.json`：新增 7 条路由配置

#### 设计决策

- **国际化实现**：语言存储在 localStorage，请求通过 `Accept-Language` 头传递，后端返回对应语言字段
- **服务类型**：使用位运算（bit mask）存储，`1 = 个人`、`2 = 团队`、`3 = 个人+团队`
- **权限控制**：管理端页面在 `onMounted` 时检查 `user.role === 2`，非管理员则跳转
- **文件上传**：使用 `uni.chooseImage` 选择本地图片，后端返回 Minio URL
- **卡片点击**：使用 `uni.navigateTo` 跳转详情页，保持页面栈层级
- **原生 API 集成**：地图、拨号、图片预览直接使用 UniApp API

#### 启动方式

```bash
npm run dev:h5
# 浏览器访问 http://localhost:3000
```

#### 待办 / 已知问题

- [ ] 封面图加载失败时展示默认占位图（Minio 图片可能不稳定）
- [ ] 多语言文案翻译（当前仅通过后端字段切换，前端文案未完全翻译）
- [ ] 译员列表分页加载（当前一次加载全部）
- [ ] 评论分页加载（当前一次加载全部）

---

## 2026-04-29 — Step 5：我的订单列表页

### 完成内容

- 创建 `src/pages/interpreter-orders/list.vue`：
  - 订单列表展示：订单号、状态标签、译员信息、服务时间、总费用、备注
  - 订单状态枚举：待接单、已接单、服务中、已完成、已取消
  - 取消订单功能（仅待接单状态可用）
  - 跳转译员详情页
  - 分页加载：支持下拉刷新和点击加载更多
  - 登录状态检查，未登录引导去登录
  - 空状态和加载状态展示
- 更新 `src/pages.json`：新增订单列表页路由配置，支持下拉刷新
- 修改 `src/pages/profile/index.vue`：
  - 新增"我的订单"菜单项（📋 图标）
  - 调整"申请成为译员"图标为 📝

### 设计决策

- **状态管理**：使用枚举常量 `ORDER_STATUS` 映射状态和颜色
- **分页加载**：采用"加载更多"按钮方式，避免自动滚动加载可能带来的问题
- **头像处理**：有头像显示头像，无头像显示首字母占位图
- **时间格式化**：结束时间仅显示时分，与开始时间配合更紧凑
- **下拉刷新**：使用 UniApp 的 `onPullDownRefresh` 生命周期

### 启动方式

```bash
npm run dev:h5
# 浏览器访问 http://localhost:3000
```

### 待办 / 已知问题

- [ ] 封面图加载失败时展示默认占位图（Minio 图片可能不稳定）
- [ ] 多语言文案翻译（当前仅通过后端字段切换，前端文案未完全翻译）
- [ ] 译员列表分页加载（当前一次加载全部）

---

## 2026-04-29 — Step 6：SafeImage 组件全局接入（图片容错占位图）

### 完成内容

- 扩展 `src/components/SafeImage/index.vue`：
  - 新增 `previewable` prop：设为 `true` 时点击图片自动调用 `uni.previewImage` 放大预览
  - 新增 `safe-image--clickable` 修饰类，方便后续扩展点击光标样式
- 将全项目中裸 `<image>` 标签替换为 `<SafeImage>`，覆盖以下文件中的 Minio 图片：
  - `interpreter/apply.vue`：证书预览图（加载失败时显示占位，点击放大）
  - `interpreter/detail.vue`：资质证书（`mode="widthFix"`，点击预览）
  - `admin/interpreter-review.vue`：审核卡片中的证书缩略图（点击预览）
  - `admin/feedback-list.vue`：反馈附件横向滚动图片列表（点击预览）
  - `profile/index.vue`：用户头像（加载失败时降级为首字母占位 view）

### 设计决策

- **SafeImage 单一职责**：组件只负责图片加载容错 + 可选预览，不耦合业务样式
- **占位图降级**：无 src 或加载失败时展示渐变暖色背景 + 🖼 图标，与"暖墨风"主题保持一致
- **previewable prop**：默认 `false`（静默展示），需要预览的场景显式传入 `true`，避免意外触发
- **用户头像**：保留原有首字母 `view` 占位逻辑（`v-else`），仅将 `<image>` 替换为 `<SafeImage>`，语义不变

### 待办 / 已知问题

- [ ] 多语言文案翻译（当前仅通过后端字段切换，前端文案未完全翻译）
- [ ] 评论分页加载（当前一次加载全部）

---

## 2026-04-29 — Step 7：译员列表分页加载

### 完成内容

- 重构 `src/pages/interpreter/list.vue` 的数据加载逻辑：
  - 新增 `loadPage(refresh)` 方法：按页码每 10 条从服务端分页拉取数据，追加到 `allData` 数组
  - 新增 `loadMore()` 加载更多函数：翻页 + 追加模式加载
  - 新增 `loadingMore` 状态：区分首屏加载与追加加载的 UI 反馈
  - 新增 `hasMoreServer` 计算：根据已加载总数与 `serverTotal` 判断是否还有更多
  - 服务类型筛选改用 `computed`（`filteredList`）：对 `allData` 进行前端筛选，切换筛选标签时不再重新请求服务器
  - 新增"加载更多"按钮与"没有更多了~"底栏，与订单列表页风格保持一致
  - 加载失败重试按钮绑定 `loadPage(true)`（修复原绑定 `loadList` 报错问题）
- 更新 DEV_LOG.md：Step 6 的待办中移除"译员列表分页加载"

### 设计决策

- **前端筛选**：服务类型筛选（个人/团队）在前端完成而非重新请求服务器，避免切换标签时重复拉取数据
- **追加模式**：使用 `allData` 数组累积存储所有已加载数据，"加载更多"仅追加新数据
- **下拉刷新**：重置页码为 1 并清空 `allData`，重新从第一页加载
- **边界处理**：`allData.length >= serverTotal` 时隐藏加载按钮，显示"没有更多了~"

### 待办 / 已知问题

- [ ] 多语言文案翻译（当前仅通过后端字段切换，前端文案未完全翻译）

---

## 2026-04-29 — Step 8：评论分页加载

### 完成内容

- 重构 `src/pages/restaurant/detail.vue` 的评论加载逻辑：
  - 新增 `commentPage` 当前页码、`hasMoreComments` 是否还有更多、`loadingMoreComments` 加载更多中状态
  - 修改 `loadComments(refresh)` 方法：支持按页码每 10 条从服务端分页拉取评论数据，追加到 `commentList` 数组
  - 新增 `loadMoreComments()` 加载更多评论函数：翻页 + 追加模式加载
  - 评论列表末尾新增"查看更多评价"按钮（点击加载更多）与"已显示全部评价"底栏
  - 提交评论成功后调用 `loadComments(true)` 刷新评论列表（确保新评论文案立即展示）

### 设计决策

- **分页策略**：首屏仅加载 10 条评论，用户点击"查看更多评价"按钮才加载下一页，避免页面过长影响体验
- **追加模式**：使用 `commentList` 数组累积存储所有已加载评论，"加载更多"仅追加新数据
- **提交后刷新**：用户提交评论后重置为第一页重新加载，确保新评论文案立即展示在列表顶部
- **边界处理**：`commentList.length >= commentTotal` 时隐藏加载按钮，显示"已显示全部评价"

### 待办 / 已知问题

- [ ] 扩展更多页面使用 t() 函数（当前仅 TabBar 组件已集成）

---

## 2026-04-29 — Step 9：前端多语言翻译（i18n 字典 + TabBar 集成）

### 完成内容

- 扩展 `src/utils/i18n.js` 翻译工具：
  - 新增 `ZH` 中文翻译字典，涵盖 TabBar、通用文案、认证、个人中心、餐厅、译员、订单、管理端等所有关键模块
  - 新增 `EN` 英文翻译字典，与中文字典结构完全一致，提供完整英文翻译
  - 重构 `t()` 函数：根据当前语言（`zh-CN` / `en-US`）自动返回对应字典中的翻译
  - 使用空值合并运算符 `??`，当 key 不存在时返回 key 本身（便于调试）
- 更新 `src/components/TabBar/index.vue`：
  - 将 `TABS` 常量改为 `computed` 属性，使用 `t()` 函数动态获取标签文案
  - 移除硬编码的中文文案（"排行榜"、"我的"）
  - 支持语言切换后 TabBar 标签实时更新

### 设计决策

- **字典结构**：按模块组织翻译 key（如 `common.loading`、`profile.logout`），便于维护和扩展
- **默认语言**：未设置时默认使用中文（`zh-CN`），与 `DEFAULT_LANGUAGE` 常量保持一致
- **降级策略**：当翻译 key 不存在时返回 key 本身，避免页面崩溃，便于排查缺失的翻译
- **响应式翻译**：TabBar 使用 `computed`，确保语言切换后标签文案自动更新

### 后续扩展建议

- 在各页面组件中引入 `t` 函数，替换硬编码的中文文案
- 重点页面优先：`profile/index.vue`、`rank/index.vue`、`interpreter/list.vue`、`restaurant/detail.vue`
- 表单验证错误提示、Toast 消息等动态文案也建议使用 `t()` 函数

### 待办 / 已知问题

- [x] `rank/index.vue` 接入 t() 函数（筛选标签、加载状态、评价数）
- [x] `interpreter/list.vue` 接入 t() 函数（筛选标签、加载状态、空状态、加载更多）
- [ ] `profile/index.vue` 接入 t() 函数
- [ ] `interpreter/detail.vue` 接入 t() 函数

---

## 2026-04-29 — Step 11：更多页面接入 t() 多语言函数

### 完成内容

- 更新 `src/pages/rank/index.vue`：
  - 引入 `t` 函数，替换标题、加载状态、失败提示、重试按钮、评价数等静态文案
- 更新 `src/pages/interpreter/list.vue`：
  - 引入 `t` 函数，替换筛选标签、加载状态、失败提示、空状态、加载更多等静态文案
- 更新 `src/pages/restaurant/detail.vue`：
  - 引入 `t` 函数，替换登录弹窗文案、评论提交成功 Toast 等动态文案
- 更新 `src/pages/profile/index.vue`（全面接入 t() 函数）：
  - 引入 `t` 函数
  - 替换未登录提示、登录/注册按钮文字
  - 将 `ROLE_LABELS` 改为 `getRoleLabels()` 函数，支持角色名称动态翻译
  - 替换信息列表标签（用户名、用户 ID、邮箱）
  - 替换功能菜单标题和菜单项文字（更多功能、我的订单、申请成为译员、投诉建议）
  - 替换管理后台标题和菜单项（管理后台、译员申请审核、投诉建议管理）
  - 替换退出登录弹窗标题和内容
  - 替换登出按钮文字
- 更新 `src/pages/interpreter/detail.vue`（全面接入 t() 函数）：
  - 引入 `t` 函数
  - 将 `ENGLISH_LEVEL_MAP` 改为 `getEnglishLevelMap()` 函数，支持英语等级动态翻译
  - 替换登录弹窗文案（请先登录后再预约译员）
  - 替换加载状态、失败提示、重试按钮文案
  - 替换服务类型标签（个人/团队）
  - 替换信息列表标签（学校、学号、评分、已完成订单）
  - 替换时薪标签和单位
  - 替换服务介绍标题、证书标题、提示文案
  - 替换预约按钮文字

### 进行中 / 待续

- 无

### 待办 / 已知问题

- 无

---

## 2026-04-29 — Step 12：译员详情页评论区

### 完成内容

- 更新 `src/api/comment.js`：
  - 在 `COMMENT_TARGET_TYPE` 枚举中新增 `INTERPRETER: 5`（译员档案评论类型）
- 更新 `src/pages/interpreter/detail.vue`：
  - 引入评论相关模块和状态变量
  - 新增评论列表加载逻辑（分页，每页 10 条，`loadComments(refresh)`）
  - 新增加载更多评论函数 `loadMoreComments()`
  - 新增提交评论函数 `handlePostComment()`（登录拦截、内容校验、提交后刷新）
  - 新增评论区模板（评论列表 + 分页 + 加载更多/已全部加载）
  - 新增发表评论表单（评分选择 5 星、文本域 500 字、提交按钮）
  - 新增评论区相关样式（评论卡片、评论项、评分选择、表单等）
- 更新 `src/utils/i18n.js`：
  - 在 ZH 和 EN 字典中新增译员评论区相关翻译 key（interpreter.comments、interpreter.noComments、interpreter.postComment、interpreter.loginToComment、interpreter.commentRating、interpreter.commentPlaceholder、interpreter.commentSuccess）
  - 新增通用翻译 key（common.unknown、common.anonymous、common.submitting）

### 设计决策

- **评论类型**：复用已有的评论系统，targetType = 5 表示对译员档案的评论
- **评论区布局**：与餐厅详情页评论区风格一致，支持分页加载和发表评论
- **登录拦截**：发表评论前检查登录状态，未登录引导去登录页

### 待办 / 已知问题

- 无

---

## 2026-04-29 — Step 13：个人信息编辑页面

### 完成内容

- 更新 `src/api/user.js`：
  - 补充 `updateMyProfile(data)` 更新用户信息接口（POST /users/me）
- 创建 `src/pages/profile/edit.vue` 个人信息编辑页：
  - 头像编辑：点击头像上传新图（可拍照/相册），上传后显示预览操作（放大/删除）
  - 昵称编辑：输入框，最长 20 字
  - 邮箱编辑：输入框，最长 50 字，邮箱类型
  - 用户名和用户 ID 为只读展示
  - 表单校验：昵称和邮箱必填，提交后更新本地缓存并返回上一页
  - 完整 "暖墨风" UI 设计，与个人中心风格一致
- 更新 `src/pages.json`：新增 `pages/profile/edit` 路由
- 更新 `src/utils/i18n.js`：在 ZH 和 EN 字典中新增 `profile.edit.*` 相关翻译 key
- 更新 `src/pages/profile/index.vue`：
  - 新增 `goEditProfile()` 函数，跳转编辑资料页
  - 在头像信息卡下方新增"编辑资料"按钮（✏️ 图标 + 珊瑚橙文字）
  - 新增编辑按钮样式

### 设计决策

- **头像上传**：使用 `uni.chooseImage` 选择 + `uni.uploadFile` 上传到 `/api/upload`，获得 URL 后提交保存
- **表单校验**：前端仅做空值校验，格式校验由后端完成；昵称 20 字、邮箱 50 字限制为前端友好限制
- **缓存同步**：保存成功后通过 `saveUser()` 更新本地用户信息缓存，返回个人中心后自动展示新数据
- **编辑入口**：在个人中心头像/昵称下方放置独立的"编辑资料"按钮，位置显眼且不干扰其他功能区

### 待办 / 已知问题

- 无

---

## 2026-04-29 — Step 14：订单完成后评价译员功能

### 完成内容

- 更新 `src/pages/interpreter-orders/list.vue`：
  - 引入 `postComment`、`COMMENT_TARGET_TYPE` 评论 API
  - 新增 `reviewDialog` 评价弹窗状态管理（评分、内容、提交状态）
  - 新增 `reviewedOrderIds` 已评价订单集合（本地 localStorage 持久化，防止重复评价）
  - 新增 `openReviewDialog(order)` / `closeReviewDialog()` 弹窗开关函数
  - 新增 `selectRating(rating)` 评分选择函数
  - 新增 `submitReview()` 提交评价函数：调用 `postComment`，targetType = 3（译员订单），附 orderId
  - 评价弹窗模板：标题 + 5 星评分选择 + 500 字文本域 + 取消/提交按钮
  - 评价弹窗完整的 SCSS 样式（半透明遮罩、圆角卡片、评分交互等）
  - 在已完成的订单卡片（status === 3）底部新增"评价译员"按钮（珊瑚橙底色）
  - 已评价的订单隐藏"评价译员"按钮
  - 将 `ORDER_STATUS`、`SERVICE_TYPE_LABEL` 改为函数形式 `getOrderStatus()`、`getServiceTypeLabel()`，支持国际化动态切换
  - 将硬编码文案改为 `t()` 函数调用
- 更新 `src/utils/i18n.js`：
  - 新增 `orders.reviewBtn`（评价译员 / Review Interpreter）
  - 新增 `orders.reviewTitle`（评价译员服务 / Review Interpreter Service）

### 设计决策

- **评价类型**：使用已有的 `COMMENT_TARGET_TYPE.INTERPRETER_ORDER = 3`（译员订单评论），附带 `orderId` 关联订单
- **重复评价控制**：使用 `localStorage` 记录已评价的订单 ID，评价后隐藏"评价译员"按钮
- **弹窗交互**：点击遮罩区域关闭弹窗，点击弹窗内部不关闭（`@tap.stop`）
- **国际化**：状态映射和服务类型映射改为函数形式，确保切换语言后实时更新

### 待办 / 已知问题

- 无

---

## 2026-04-29 — Step 15：登录/注册页面国际化

### 完成内容

- 更新 `src/pages/login/index.vue`：
  - 引入 `t` 函数
  - 替换模板中所有中文文案：用户名/密码输入框 label、placeholder、登录按钮文案、底部注册链接
- 更新 `src/pages/register/index.vue`：
  - 引入 `t` 函数
  - 替换模板中所有中文文案：标题、字段名、placeholder、注册按钮文案
- 更新 `src/utils/i18n.js`：
  - 新增 `auth.registerSub`：注册副标题
  - 新增 `auth.usernamePlaceholder` / `auth.passwordPlaceholder` / `auth.confirmPasswordPlaceholder` / `auth.nicknamePlaceholder` / `auth.nicknameDefault`：表单占位符
  - 新增 `auth.loggingIn` / `auth.registering`：提交中按钮文字
  - 新增 `auth.loginSuccess` / `auth.registerSuccess` / `auth.passwordMismatch`：提示信息
  - 新增 `common.optional`：通用"（可选）"标记
  - 上述所有 key 均已提供中英双语翻译

### 设计决策

- 表单校验提示（如"用户名至少 3 位"、"密码至少 6 位"）中的数字是动态的，暂未使用 `t()` 函数，保持硬编码
- 注册页的"昵称（可选）"使用了 `{{ t('auth.nickname') }} {{ t('common.optional') }}` 组合方式

### 待办 / 已知问题

- 无

---

## 2026-04-29 — Step 18：剩余页面国际化补全（反馈提交页 + 译员列表页）

### 完成内容

#### feedback/submit.vue（投诉建议提交页）
- 引入 `t` 函数
- `FEEDBACK_TYPES` 改为 `computed`，使用 `t()` 动态获取标签文案
- 替换所有 Toast 消息、弹窗文案（登录拦截、标题必填、内容必填）
- 替换模板中所有硬编码文案（反馈类型标题、标题、详细描述、联系方式、附件图片、添加图片、图片上限提示、提交按钮）
- 替换上传中/上传失败 Toast
- 补充缺失的翻译 key（`feedback.titleRequired`、`feedback.contentRequired` 中英双语）

#### interpreter/list.vue（译员列表页）
- `ENGLISH_LEVEL_MAP` 改为 `getEnglishLevelLabel()` 函数形式，使用 `t()` 动态获取英语等级标签
- 替换 `{{ item.totalOrders }} 单` 中的"单"为 `{{ t('interpreter.orders') }}`
- 替换 `{{ item.hourlyRate.toFixed(0) }}/小时` 中的"/小时"为 `{{ t('interpreter.priceUnit') }}`
- 替换服务类型标签"个人"、"团队"为 `t('interpreter.type.personalTag')`、`t('interpreter.type.teamTag')`

### 至此，所有前端页面已完全接入国际化

---

## 2026-04-29 — Step 17：译员预约/申请/订单页面国际化

### 完成内容

- **`interpreter/booking.vue`**（译员预约页）：
  - 引入 `t` 函数
  - `SERVICE_TYPES` 改为 `computed`，使用 `t()` 动态获取标签文案
  - 所有表单标签（服务类型、团队人数、服务时间、开始/结束时间、备注）替换为 `t()` 调用
  - 时间选择弹窗标题、placeholder、错误提示替换为 `t()` 调用
  - 表单校验 Toast（开始时间/结束时间必选、结束时间不能早于开始时间、团队人数限制、登录拦截）替换为 `t()` 调用
  - 费用预览卡片（费用预览、时薪、时长、预计费用）替换为 `t()` 调用
  - 提交按钮文案（提交中.../确认预约）替换为 `t()` 调用

- **`interpreter/apply.vue`**（译员申请页）：
  - 引入 `t` 函数
  - `ENGLISH_LEVELS` / `SERVICE_TYPES` 改为 `computed`
  - 所有表单标签（真实姓名、学号、学校、英语等级、资质证书、中英文介绍、服务类型、时薪）替换为 `t()` 调用
  - 所有 placeholder、提示文案替换为 `t()` 调用
  - 证书上传/重传提示、上传中/上传成功/失败 Toast 替换为 `t()` 调用
  - 表单校验 Toast 替换为 `t()` 调用
  - 提交按钮文案替换为 `t()` 调用

- **`interpreter-orders/list.vue`**（我的订单页）：
  - 所有硬编码文案替换为 `t()` 调用
  - 未登录状态提示、加载中、空状态替换
  - 订单信息标签（服务时间、团队人数、总费用、备注）替换
  - 加载更多/没有更多了替换
  - 取消订单弹窗标题/内容替换
  - 下单时间标签替换
  - onMounted 登录拦截弹窗文案替换

- **`utils/i18n.js`**：
  - ZH 字典新增：`common.tip`、`common.person`、`common.select`、`common.paramError`、`common.uploading`、`common.uploadSuccess`、`common.uploadFailed`
  - ZH 字典新增：`interpreter.goLogin`
  - ZH 字典新增：`interpreter.booking.*`（`startTimeRequired`、`endTimeRequired`、`endBeforeStart`、`minGroupSize`、`bookingSuccess`、`timeLabel`、`timePlaceholder`、`invalidTimeFormat`）
  - ZH 字典新增：`interpreter.apply.*`（`loginRequired`、`realNameRequired`、`studentIdRequired`、`schoolRequired`、`certRequired`、`introRequired`、`hourlyRateInvalid`、`serviceTypeRequired`、`submitSuccess`、`realNamePlaceholder`、`studentIdPlaceholder`、`schoolPlaceholder`、`reuploadHint`、`introPlaceholder`、`introEnPlaceholder`、`hourlyRatePlaceholder`）
  - ZH 字典新增：`orders.*`（`cancelConfirmTitle`、`cancelConfirmContent`、`cancelled`、`detailComingSoon`、`loginRequired`、`serviceTime`、`remarkLabel`、`createTime`）
  - 以上所有 key 均已在 EN 字典中提供对应英文翻译

### 设计决策

- **computed 动态选项**：`ENGLISH_LEVELS`、`SERVICE_TYPES` 改为 `computed`，支持语言切换后实时更新
- **已有 i18n key 复用**：`interpreter.booking.personal/team`、`interpreter.priceUnit`、`interpreter.hour` 等已存在的 key 直接复用，无需重新定义
- **ZH/EN 键位对齐**：新增 key 在 ZH 和 EN 字典中均同步添加，保持字典结构一致

### 待办 / 已知问题

- 无

---

## 2026-04-29 — Step 16：管理端页面国际化

### 完成内容

- 更新 `src/pages/admin/interpreter-review.vue`：
  - 引入 `computed` + `t` 函数
  - `STATUS_FILTER` 改为 `computed`（使用 `t()` 动态获取标签文案）
  - `ENGLISH_LEVEL_MAP` 改为 `getEnglishLevelMap()` 函数（支持国际化）
  - 所有 Toast 消息、弹窗文案、模板中的硬编码中文替换为 `t()` 调用
  - 审核卡片的标签文字（状态、学校、学号、英语等级、服务类型、时薪、申请时间、证书标题、自我介绍、拒绝理由、通过/拒绝按钮）
  - 拒绝弹窗标题、placeholder、取消/确认按钮

- 更新 `src/pages/admin/feedback-list.vue`：
  - 引入 `computed` + `t` 函数
  - `STATUS_FILTER` / `TYPE_FILTER` 改为 `computed`
  - 所有 Toast 消息、模板中的硬编码中文替换为 `t()` 调用
  - 筛选栏标签（状态/类型）、加载状态、空状态
  - 反馈卡片的类型/状态标签、提交者信息、附件标题、管理员回复、处理人
  - 回复弹窗标题、placeholder、处理后状态标签、取消/提交按钮

- 更新 `src/utils/i18n.js`：
  - 新增 `admin.review.*` 系列 key（中英双语）：`rejectTitle`、`rejectPlaceholder`、`confirmReject`、`approveConfirm`、`approveContent`、`approveSuccess`、`rejectSuccess`、`rejectReasonRequired`、`applyTime`
  - 新增 `admin.feedback.*` 系列 key（中英双语）：`statusLabel`、`typeLabel`、`submitter`、`noContact`、`attachment`、`adminReply`、`handler`、`replyRequired`、`replySuccess`、`submitReply`、`replyStatusLabel`、`replyTitle`、`replyPlaceholder`、`replyBtn`、`noPermission`

### 设计决策

- **computed 动态筛选**：筛选标签使用 `computed`，确保语言切换后标签文案自动更新
- **函数式映射**：英语等级映射改为 `getEnglishLevelMap()` 函数而非对象常量，避免 `computed` 中引用对象的问题
- **管理端页面无额外标题文案**：管理端页面通过 `pages.json` 配置标题，暂不需要页面级标题的翻译 key

### 待办 / 已知问题

- 无

---

## 2026-04-29 — Step 10：投诉建议提交页（用户端）

### 完成内容

#### API 层
- 新增 `src/api/feedback.js`：
  - `submitFeedback(data)`：提交投诉建议（接入 `POST /api/feedback`）
  - `uploadFeedbackImage(filePath)`：上传反馈图片（接入 `POST /api/feedback/upload`）

#### 页面
- 新增 `src/pages/feedback/submit.vue` 投诉建议提交页：
  - 反馈类型选择：投诉 / 建议 / 咨询 / 其他（彩色卡片样式，支持选中高亮）
  - 标题输入框（最多 50 字）+ 字数统计
  - 详细描述文本域（最多 500 字）+ 字数统计
  - 联系方式输入框（选填）
  - 附件图片上传（最多 9 张，支持删除、点击预览）
  - 提交前登录状态检查，未登录引导去登录
  - 表单校验：标题和内容必填
  - 提交成功后自动返回上一页

#### 路由与入口
- 更新 `src/pages.json`：新增 `pages/feedback/submit` 路由配置
- 更新 `src/pages/profile/index.vue`：
  - 新增 `goFeedback()` 函数，跳转投诉建议提交页
  - 在"更多功能"菜单中新增"投诉建议"菜单项（📣 图标）

#### 国际化
- 更新 `src/utils/i18n.js`：
  - 在 `ZH` 和 `EN` 字典中新增投诉建议相关翻译 key（feedback.*）
  - 覆盖标题、类型、输入提示、按钮文案等全部静态文案

### 设计决策

- **类型卡片**：使用 2x2 网格布局，每种类型配有专属 Emoji 和主题色，选中时有边框高亮 + 缩放动画
- **图片上传**：复用 `SafeImage` 组件展示已上传图片，点击可放大预览；删除按钮使用半透明黑色圆形按钮
- **登录拦截**：提交前检查登录状态，未登录弹窗引导去登录页（与餐厅详情页评论逻辑一致）
- **API 接口**：feedback 提交走 `POST /api/feedback`，图片走单独的上传接口 `POST /api/feedback/upload`（与译员证书上传逻辑一致）

### 待办 / 已知问题

- [ ] 扩展更多页面使用 t() 函数（当前已集成 TabBar + i18n 字典）

---

## 2026-04-29 — Step 4：译员预约页面

### 完成内容

- 创建 `src/pages/interpreter/booking.vue`：
  - 服务类型选择（个人译员 / 团队译员）
  - 团队人数计数器（仅团队服务时显示，最少 2 人）
  - 服务时间选择（开始时间 / 结束时间）
  - 备注输入框（最多 200 字）
  - 费用预览卡片：时薪 × 服务时长 = 总费用
  - 表单校验：登录状态、时间格式、时间有效性、团队人数限制
  - 提交预约订单，成功后跳转个人中心
  - 接收页面参数：`profileId`（译员档案 ID）、`hourlyRate`（时薪）
  - "暖墨风"UI 设计，与整体风格保持一致

### 设计决策

- **时间选择**：使用 `uni.showModal` 的编辑模式进行时间输入，格式为 `YYYY-MM-DD HH:mm`
- **费用计算**：使用 `computed` 属性实时计算服务时长和总费用
- **表单验证**：提交前进行完整校验，确保数据有效性
- **路由配置**：已在 `pages.json` 中配置（Step 3 时已添加）

### 启动方式

```bash
npm run dev:h5
# 浏览器访问 http://localhost:3000
```

### 待办 / 已知问题

- [ ] 封面图加载失败时展示默认占位图（Minio 图片可能不稳定）
- [ ] 完善订单列表页（当前仅创建预约，未查看订单状态）
- [ ] 多语言文案翻译（当前仅通过后端字段切换，前端文案未完全翻译）
- [ ] 译员列表分页加载（当前一次加载全部）
