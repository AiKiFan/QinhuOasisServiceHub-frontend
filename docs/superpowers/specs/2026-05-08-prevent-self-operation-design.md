# 防止译员自导自演业务漏洞设计

## 问题

译员可以通过"自预约→自审批→自评价"刷数据，当前后端无校验。

## 方案

后端双拦截 + 前端双屏蔽，从源头切断自预约链路，同时防护详情页直接评价入口。

### 后端改动

1. **InterpreterServiceImpl.bookInterpreter()** — `userId.equals(profile.getUserId())` 时抛 `SELF_BOOKING_NOT_ALLOWED`
2. **BizCommentServiceImpl.createComment()** — 当 targetType=INTERPRETER 且 `userId.equals(profile.getUserId())` 时抛 `SELF_REVIEW_NOT_ALLOWED`，需注入 InterpreterProfileMapper
3. **ResultCode** — 新增 SELF_BOOKING_NOT_ALLOWED、SELF_REVIEW_NOT_ALLOWED 两个错误码及 i18n 消息

### 前端改动

1. **detail.vue** — 新增 `isSelf` 计算属性，预约按钮加 `v-if="!isSelf"`，评论表单加 `v-if/v-else` 切换提示
2. **booking.vue** — 已有前端校验，无需改动
