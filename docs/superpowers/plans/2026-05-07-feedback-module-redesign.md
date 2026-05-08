# 投诉建议模块完整重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复投诉建议模块的图片上传、用户端查看功能、管理员弹窗风格统一、图片变更检测失效等4个Bug。

**Architecture:** 
- 后端新增5个用户端接口（查看列表、修改投诉单、追加回复、关闭、已解决）
- 前端新建 my-feedback.vue（列表+详情页模式），复用 my-application 的变更检测逻辑
- 管理员弹窗改为 confirm-dialog 风格，修复 my-application 图片变更检测的空值处理

**Tech Stack:** 
- Frontend: UniApp + Vue3 `<script setup>` + i18n
- Backend: Spring Boot 3.2.5 + MyBatis + MySQL
- 回复存储: reply_content 字段文本追加模式

---

## Task 1: 修复前端图片上传路径（Bug #13）

**Files:**
- Modify: `src/api/feedback.js`
- Modify: `src/pages/feedback/submit.vue`

- [ ] **Step 1: 移除错误的 uploadFeedbackImage 函数**

在 `src/api/feedback.js` 中删除错误的 uploadFeedbackImage 函数，改用通用上传接口：

```javascript
// src/api/feedback.js
import { post } from '@/utils/request'

/**
 * 提交投诉建议
 */
export function submitFeedback(data) {
  return post('/feedback', data)
}

/**
 * 上传投诉建议附件图片（使用通用文件上传接口）
 */
export function uploadFeedbackImage(filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: 'http://localhost:8080/api/files/upload',
      filePath,
      name: 'file',
      success: (res) => {
        const data = JSON.parse(res.data)
        if (data && data.code === 200) {
          resolve({ url: data.data })
        } else {
          reject(new Error(data.message || '上传失败'))
        }
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}
```

- [ ] **Step 2: 更新 submit.vue 使用新的上传函数**

在 `src/pages/feedback/submit.vue` 的图片上传逻辑中，使用修复后的 API：

```javascript
// src/pages/feedback/submit.vue (line ~85-95)
import { uploadFeedbackImage } from '@/api/feedback'

function chooseImage() {
  uni.chooseImage({
    count: 9 - form.value.images.length,
    sizeType: ['compressed'],
    success: (res) => {
      uni.showLoading({ title: t('common.uploading') })
      Promise.all(res.tempFilePaths.map(fp => uploadFeedbackImage(fp)))
        .then(results => {
          results.forEach(r => form.value.images.push(r.url))
          uni.hideLoading()
          uni.showToast({ title: t('common.uploadSuccess'), icon: 'success' })
        })
        .catch(() => {
          uni.hideLoading()
          uni.showToast({ title: t('common.uploadFailed'), icon: 'none' })
        })
    },
  })
}
```

- [ ] **Step 3: 测试图片上传**

运行前端，进入投诉建议提交页面，选择图片上传，验证图片正常显示在列表中。

- [ ] **Step 4: 提交代码**

```bash
git add src/api/feedback.js src/pages/feedback/submit.vue
git commit -m "fix: 修复投诉建议图片上传路径错误"
```

---

## Task 2: 后端新增用户端投诉建议接口（Bug #14 - 后端部分）

**Files:**
- Create: `UpdateFeedbackReq.java`
- Modify: `FeedbackController.java`
- Modify: `FeedbackService.java`
- Modify: `FeedbackServiceImpl.java`
- Modify: `SysFeedbackMapper.java`
- Modify: `SysFeedbackMapper.xml`

- [ ] **Step 1: 创建 UpdateFeedbackReq DTO**

创建 `UpdateFeedbackReq.java`:

```java
package com.qinhu.oasis.feedback.dto;

import lombok.Data;

/**
 * 用户修改投诉建议请求
 */
@Data
public class UpdateFeedbackReq {
    private String title;
    private String content;
    private String images;  // JSON 数组字符串
    private String contact;
}
```

- [ ] **Step 2: Mapper 新增查询方法**

在 `SysFeedbackMapper.java` 中新增：

```java
/**
 * 根据用户ID分页查询投诉建议
 */
List<FeedbackVO> selectByUserIdPage(@Param("userId") Long userId,
                                    @Param("offset") int offset,
                                    @Param("size") int size);

/**
 * 根据用户ID统计总数
 */
long countByUserId(@Param("userId") Long userId);
```

- [ ] **Step 3: Mapper XML 实现查询**

在 `SysFeedbackMapper.xml` 中新增：

```xml
<select id="selectByUserIdPage" resultType="FeedbackVO">
    SELECT f.*, u.nickname as userNickname
    FROM sys_feedback f
    LEFT JOIN sys_user u ON f.user_id = u.id
    WHERE f.user_id = #{userId}
    ORDER BY f.create_time DESC
    LIMIT #{offset}, #{size}
</select>

<select id="countByUserId" resultType="long">
    SELECT COUNT(*) FROM sys_feedback WHERE user_id = #{userId}
</select>
```

- [ ] **Step 4: Service 接口定义**

在 `FeedbackService.java` 中新增：

```java
/**
 * 获取用户投诉建议列表
 */
List<FeedbackVO> getMyFeedbackList(Long userId, int page, int size);

/**
 * 用户修改投诉建议
 */
void updateFeedback(Long feedbackId, UpdateFeedbackReq req, Long userId);

/**
 * 用户追加回复
 */
void appendReply(Long feedbackId, String replyContent, Long userId);

/**
 * 用户关闭投诉
 */
void closeFeedback(Long feedbackId, Long userId);

/**
 * 用户标记已解决
 */
void resolveFeedback(Long feedbackId, Long userId);
```

- [ ] **Step 5: Service 实现类**

在 `FeedbackServiceImpl.java` 中实现：

```java
@Override
public List<FeedbackVO> getMyFeedbackList(Long userId, int page, int size) {
    int offset = (page - 1) * size;
    return feedbackMapper.selectByUserIdPage(userId, offset, size);
}

@Override
public void updateFeedback(Long feedbackId, UpdateFeedbackReq req, Long userId) {
    SysFeedback feedback = feedbackMapper.selectById(feedbackId);
    if (feedback == null) {
        throw new RuntimeException("投诉建议不存在");
    }
    if (!feedback.getUserId().equals(userId)) {
        throw new RuntimeException("无权限修改");
    }
    if (feedback.getStatus() != 0 && feedback.getStatus() != 1) {
        throw new RuntimeException("仅待处理或处理中状态可修改");
    }
    
    feedback.setTitle(req.getTitle());
    feedback.setContent(req.getContent());
    feedback.setImages(req.getImages());
    feedback.setContact(req.getContact());
    feedbackMapper.updateById(feedback);
}

@Override
public void appendReply(Long feedbackId, String replyContent, Long userId) {
    SysFeedback feedback = feedbackMapper.selectById(feedbackId);
    if (feedback == null) {
        throw new RuntimeException("投诉建议不存在");
    }
    if (!feedback.getUserId().equals(userId)) {
        throw new RuntimeException("无权限操作");
    }
    if (feedback.getStatus() != 1) {
        throw new RuntimeException("仅处理中状态可追加回复");
    }
    
    String existingReply = feedback.getReplyContent() || "";
    String newReply = existingReply + "\n---\n[用户追加] " + 
                      LocalDateTime.now().toString() + ": " + replyContent;
    feedback.setReplyContent(newReply);
    feedbackMapper.updateById(feedback);
}

@Override
public void closeFeedback(Long feedbackId, Long userId) {
    SysFeedback feedback = feedbackMapper.selectById(feedbackId);
    if (feedback == null) {
        throw new RuntimeException("投诉建议不存在");
    }
    if (!feedback.getUserId().equals(userId)) {
        throw new RuntimeException("无权限操作");
    }
    if (feedback.getStatus() != 0 && feedback.getStatus() != 1) {
        throw new RuntimeException("仅待处理或处理中可关闭");
    }
    
    feedback.setStatus(3);  // CLOSED
    feedbackMapper.updateById(feedback);
}

@Override
public void resolveFeedback(Long feedbackId, Long userId) {
    SysFeedback feedback = feedbackMapper.selectById(feedbackId);
    if (feedback == null) {
        throw new RuntimeException("投诉建议不存在");
    }
    if (!feedback.getUserId().equals(userId)) {
        throw new RuntimeException("无权限操作");
    }
    if (feedback.getStatus() != 1) {
        throw new RuntimeException("仅处理中可标记已解决");
    }
    
    feedback.setStatus(2);  // RESOLVED
    feedbackMapper.updateById(feedback);
}
```

- [ ] **Step 6: Controller 新增接口**

在 `FeedbackController.java` 中新增：

```java
@GetMapping("/me")
public Result getMyFeedbackList(@RequestParam(defaultValue = "1") int page,
                                @RequestParam(defaultValue = "10") int size) {
    Long userId = SecurityUtils.getUserId();
    List<FeedbackVO> list = feedbackService.getMyFeedbackList(userId, page, size);
    long total = feedbackMapper.countByUserId(userId);
    return Result.success(Map.of("list", list, "total", total));
}

@PutMapping("/{id}")
public Result updateFeedback(@PathVariable Long id, @RequestBody UpdateFeedbackReq req) {
    Long userId = SecurityUtils.getUserId();
    feedbackService.updateFeedback(id, req, userId);
    return Result.success();
}

@PostMapping("/{id}/reply")
public Result appendReply(@PathVariable Long id, @RequestBody Map<String, String> body) {
    Long userId = SecurityUtils.getUserId();
    String replyContent = body.get("replyContent");
    feedbackService.appendReply(id, replyContent, userId);
    return Result.success();
}

@PostMapping("/{id}/close")
public Result closeFeedback(@PathVariable Long id) {
    Long userId = SecurityUtils.getUserId();
    feedbackService.closeFeedback(id, userId);
    return Result.success();
}

@PostMapping("/{id}/resolve")
public Result resolveFeedback(@PathVariable Long id) {
    Long userId = SecurityUtils.getUserId();
    feedbackService.resolveFeedback(id, userId);
    return Result.success();
}
```

- [ ] **Step 7: 重启后端测试接口**

重启 Spring Boot 应用，用 Postman 测试新增的5个接口。

- [ ] **Step 8: 提交代码**

```bash
git add src/main/java/com/qinhu/oasis/feedback/dto/UpdateFeedbackReq.java
git add src/main/java/com/qinhu/oasis/feedback/mapper/SysFeedbackMapper.java
git add src/main/resources/mapper/feedback/SysFeedbackMapper.xml
git add src/main/java/com/qinhu/oasis/feedback/service/FeedbackService.java
git add src/main/java/com/qinhu/oasis/feedback/service/impl/FeedbackServiceImpl.java
git add src/main/java/com/qinhu/oasis/feedback/controller/FeedbackController.java
git commit -m "feat: 新增用户端投诉建议接口"
```

---

## Task 3: 补全 i18n 翻译（Bug #14 - 前端准备）

**Files:**
- Modify: `src/utils/i18n.js`

- [ ] **Step 1: 补全 ZH 字典翻译**

在 `src/utils/i18n.js` 的 ZH 字典中新增（约 line 370 后）：

```javascript
'feedback.view.title': '我的投诉建议',
'feedback.view.status.pending': '待处理',
'feedback.view.status.processing': '处理中',
'feedback.view.status.resolved': '已解决',
'feedback.view.status.closed': '已关闭',
'feedback.view.type.complaint': '投诉',
'feedback.view.type.suggestion': '建议',
'feedback.view.type.consult': '咨询',
'feedback.view.type.other': '其他',
'feedback.view.replyFrom': '管理员回复',
'feedback.view.replyAppend': '追加回复',
'feedback.view.noChangeHint': '当前暂无修改内容，无需保存',
'feedback.view.closeBtn': '关闭投诉',
'feedback.view.resolveBtn': '已解决',
'feedback.view.cancelBtn': '取消',
'feedback.view.submitReplyBtn': '提交回复',
'feedback.view.replyPlaceholder': '请输入追加回复内容...',
'feedback.view.closeConfirm': '确定关闭此投诉吗？',
'feedback.view.resolveConfirm': '确定标记为已解决吗？',
'feedback.view.noData': '暂无投诉建议记录',
'feedback.view.titleRequired': '请输入标题',
'feedback.view.contentRequired': '请输入内容',
'feedback.view.editBtn': '修改投诉单',
'feedback.view.replyAppendBtn': '追加回复',
```

- [ ] **Step 2: 补全 EN 字典翻译**

在 EN 字典对应位置新增：

```javascript
'feedback.view.title': 'My Feedback',
'feedback.view.status.pending': 'Pending',
'feedback.view.status.processing': 'Processing',
'feedback.view.status.resolved': 'Resolved',
'feedback.view.status.closed': 'Closed',
'feedback.view.type.complaint': 'Complaint',
'feedback.view.type.suggestion': 'Suggestion',
'feedback.view.type.consult': 'Inquiry',
'feedback.view.type.other': 'Other',
'feedback.view.replyFrom': 'Admin Reply',
'feedback.view.replyAppend': 'Append Reply',
'feedback.view.noChangeHint': 'No changes detected, no need to save',
'feedback.view.closeBtn': 'Close',
'feedback.view.resolveBtn': 'Resolved',
'feedback.view.cancelBtn': 'Cancel',
'feedback.view.submitReplyBtn': 'Submit Reply',
'feedback.view.replyPlaceholder': 'Enter your reply...',
'feedback.view.closeConfirm': 'Are you sure you want to close this complaint?',
'feedback.view.resolveConfirm': 'Are you sure you want to mark as resolved?',
'feedback.view.noData': 'No feedback records yet',
'feedback.view.titleRequired': 'Please enter a title',
'feedback.view.contentRequired': 'Please enter content',
'feedback.view.editBtn': 'Edit',
'feedback.view.replyAppendBtn': 'Append Reply',
```

- [ ] **Step 3: 提交代码**

```bash
git add src/utils/i18n.js
git commit -m "feat: 补全投诉建议模块 i18n 翻译"
```

---

## Task 4: 前端新增 my-feedback.vue 页面（Bug #14 - 核心功能）

**Files:**
- Create: `src/pages/feedback/my-feedback.vue`
- Modify: `src/pages.json`
- Modify: `src/api/feedback.js`

- [ ] **Step 1: 新增 API 函数**

在 `src/api/feedback.js` 中新增：

```javascript
/**
 * 获取用户投诉建议列表
 */
export function getMyFeedbackList(params = {}) {
  return get('/feedback/me', params)
}

/**
 * 修改投诉建议
 */
export function updateFeedback(id, data) {
  return put(`/feedback/${id}`, data)
}

/**
 * 追加回复
 */
export function appendFeedbackReply(id, replyContent) {
  return post(`/feedback/${id}/reply`, { replyContent })
}

/**
 * 关闭投诉
 */
export function closeFeedback(id) {
  return post(`/feedback/${id}/close`)
}

/**
 * 标记已解决
 */
export function resolveFeedback(id) {
  return post(`/feedback/${id}/resolve`)
}
```

- [ ] **Step 2: 注册页面路径**

在 `src/pages.json` 中新增（约 line 170 后）：

```json
{
  "path": "pages/feedback/my-feedback",
  "style": {
    "navigationBarTitleText": "我的投诉建议"
  }
}
```

- [ ] **Step 3: 创建 my-feedback.vue 页面**

创建完整的 `src/pages/feedback/my-feedback.vue` 文件（完整代码见附录 A）。

核心逻辑：
- 列表展示：调用 `getMyFeedbackList`，按卡片展示所有投诉建议
- 详情页：点击卡片进入详情页，显示完整内容
- 视图模式：显示投诉内容 + 图片网格 + 管理员回复 + 操作按钮
- 编辑模式：仅 status=0 时可修改，复用 my-application 的变更检测逻辑
- 处理中状态：显示追加回复弹窗 + 已解决 + 关闭按钮
- 无变更弹窗：confirm-dialog 风格，提示"当前暂无修改内容，无需保存"

- [ ] **Step 4: 测试页面功能**

进入 my-feedback 页面，测试：
- 提交投诉后列表显示
- 待处理状态可编辑（无变更弹窗）
- 处理中状态追加回复/已解决/关闭功能

- [ ] **Step 5: 提交代码**

```bash
git add src/pages/feedback/my-feedback.vue src/pages.json src/api/feedback.js
git commit -m "feat: 新增用户端投诉建议查看页面"
```

---

## Task 5: 管理员回复弹窗风格统一（Bug #15）

**Files:**
- Modify: `src/pages/admin/feedback-list.vue`

- [ ] **Step 1: 移除 uni-popup 组件**

在 `src/pages/admin/feedback-list.vue` 中，删除 `<uni-popup>` 及相关引用（约 line 270-304）。

- [ ] **Step 2: 替换为自定义弹窗**

在模板末尾新增自定义弹窗（复用 interpreter-review 的 confirm-dialog 风格）：

```vue
<!-- 回复弹窗（自定义 confirm-dialog 风格） -->
<view v-if="showReplyModal" class="confirm-mask" @tap.self="showReplyModal = false">
  <view class="reply-dialog">
    <text class="reply-dialog__title">{{ t('admin.feedback.replyTitle') }}</text>
    <textarea
      class="reply-dialog__input"
      v-model="replyContent"
      :placeholder="t('admin.feedback.replyPlaceholder')"
      maxlength="500"
    />
    <view class="reply-dialog__status">
      <text class="reply-dialog__label">{{ t('admin.feedback.replyStatusLabel') }}</text>
      <view class="status-selector">
        <view
          v-for="st in [1, 2, 3]"
          :key="st"
          class="status-option"
          :class="{ 'status-option--active': replyStatus === st }"
          @tap="replyStatus = st"
        >
          <text class="status-option__text">
            {{ st === 1 ? t('admin.feedback.status.processing') : st === 2 ? t('admin.feedback.status.resolved') : t('admin.feedback.status.closed') }}
          </text>
        </view>
      </view>
    </view>
    <view class="reply-dialog__actions">
      <view class="reply-dialog__btn reply-dialog__btn--cancel" @tap="showReplyModal = false">
        <text>{{ t('common.cancel') }}</text>
      </view>
      <view class="reply-dialog__btn reply-dialog__btn--confirm" @tap="handleReply">
        <text>{{ t('admin.feedback.submitReply') }}</text>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 3: 补充 CSS 样式**

在 `<style>` 块中新增：

```scss
/* ── 自定义回复弹窗 ── */
.confirm-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.reply-dialog {
  width: 600rpx;
  background-color: $color-bg-card;
  border-radius: 24rpx;
  overflow: hidden;

  &__title {
    display: block;
    text-align: center;
    font-size: 32rpx;
    font-weight: 600;
    color: $color-text-primary;
    padding: 48rpx 40rpx 24rpx;
  }

  &__input {
    width: calc(100% - 80rpx);
    height: 240rpx;
    margin: 0 40rpx;
    padding: 16rpx;
    background-color: $color-bg-page;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: $color-text-primary;
    line-height: 1.5;
    box-sizing: border-box;
  }

  &__status {
    margin: 24rpx 40rpx;
  }

  &__label {
    display: block;
    font-size: 26rpx;
    color: $color-text-secondary;
    margin-bottom: 12rpx;
  }

  .status-selector {
    display: flex;
    gap: 12rpx;
  }

  .status-option {
    flex: 1;
    padding: 16rpx;
    border-radius: 16rpx;
    border: 2rpx solid $color-divider;
    text-align: center;

    &__text {
      font-size: 24rpx;
      color: $color-text-secondary;
    }

    &--active {
      border-color: $color-primary;
      background-color: $color-primary-light;

      .status-option__text {
        color: $color-primary;
        font-weight: 600;
      }
    }
  }

  &__actions {
    display: flex;
    border-top: 2rpx solid $color-divider;
    margin-top: 32rpx;
  }

  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 96rpx;
    font-size: 30rpx;

    &--cancel {
      color: $color-text-secondary;
      border-right: 2rpx solid $color-divider;
    }

    &--confirm {
      color: $color-primary;
      font-weight: 600;
    }
  }
}
```

- [ ] **Step 4: 测试弹窗风格**

进入管理员投诉建议列表，点击"回复处理"，验证弹窗风格与 interpreter-review 一致。

- [ ] **Step 5: 提交代码**

```bash
git add src/pages/admin/feedback-list.vue
git commit -m "fix: 管理员回复弹窗改为 confirm-dialog 风格"
```

---

## Task 6: 修复 my-application 图片变更检测（Bug #16）

**Files:**
- Modify: `src/pages/interpreter/my-application.vue`

- [ ] **Step 1: 检查变更检测逻辑**

在 `src/pages/interpreter/my-application.vue` 的 `handleSubmit()` 函数中，找到图片变更检测部分（约 line 173），确认问题：

当前代码可能为：
```javascript
const certUrlsStr = form.value.certUrls.join(',')
const origCertUrlsStr = (original.value.certUrls || []).join(',')
```

问题：`form.value.certUrls` 为 `undefined` 时会报错。

- [ ] **Step 2: 修复空值处理**

修改为安全的空值处理：

```javascript
const certUrlsStr = (form.value.certUrls || []).join(',')
const origCertUrlsStr = (original.value.certUrls || []).join(',')
const changed =
  form.value.realName !== original.value.realName ||
  form.value.studentId !== original.value.studentId ||
  form.value.school !== original.value.school ||
  form.value.englishLevel !== original.value.englishLevel ||
  certUrlsStr !== origCertUrlsStr ||
  form.value.introduction !== original.value.introduction ||
  form.value.introductionEn !== original.value.introductionEn ||
  form.value.serviceTypes !== original.value.serviceTypes ||
  form.value.hourlyRate !== original.value.hourlyRate

if (!changed) {
  showNoChangeDialog.value = true
  submitting.value = false
  return
}
```

- [ ] **Step 3: 确保 original 在正确时机 snapshot**

在 `startEdit()` 函数中，确认 `original.value = { ...form.value }` 在图片数据加载后执行：

```javascript
function startEdit() {
  if (!profile.value) return
  form.value = {
    certUrls: (profile.value.certUrl || '').split(',').filter(Boolean),
    realName: profile.value.realName,
    studentId: profile.value.studentId,
    school: profile.value.school,
    englishLevel: profile.value.englishLevel,
    introduction: profile.value.introduction,
    introductionEn: profile.value.introductionEn,
    serviceTypes: profile.value.serviceTypes,
    hourlyRate: profile.value.hourlyRate,
  }
  original.value = { ...form.value }  // 确保在 form.value 初始化后 snapshot
  editing.value = true
}
```

- [ ] **Step 4: 测试图片变更检测**

测试场景：
- 仅修改图片（增加/删除/替换）→ 保存时不弹"无变更"
- 不修改任何内容 → 保存时弹"当前暂无修改内容"
- 修改图片 + 其他字段 → 正常保存

- [ ] **Step 5: 提交代码**

```bash
git add src/pages/interpreter/my-application.vue
git commit -m "fix: 修复 my-application 图片变更检测空值处理"
```

---

## 附录 A: my-feedback.vue 完整代码

（完整代码见下一步，因篇幅较长单独列出）