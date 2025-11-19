# 邮箱确认邮件收不到问题排查指南

## 问题现象
注册时发送确认邮件，但邮箱收不到邮件。

## 可能原因和解决方案

### 1. Supabase Dashboard 配置问题 ⚠️

**检查邮箱确认功能是否启用：**

1. 登录 Supabase Dashboard
2. 进入 **Authentication** > **Providers** > **Email**
3. 确认以下设置：
   - ✅ **Enable email confirmations** 已启用
   - ✅ **Enable email signup** 已启用
   - ✅ SMTP 配置正确（如果使用自定义 SMTP）

**检查邮件模板配置：**

1. 进入 **Authentication** > **Email Templates**
2. 检查 **Confirm signup** 模板是否存在且已启用
3. 确认模板中的确认链接格式正确

### 2. 重定向 URL 配置问题

**确保已配置重定向 URL：**

1. 进入 **Authentication** > **URL Configuration**
2. 在 **Redirect URLs** 中添加：
   ```
   com.electron.todolist://auth/callback
   ```
3. 保存配置

### 3. Supabase 默认 SMTP 限制

Supabase 默认的 SMTP 服务器主要用于测试，有以下限制：

- ⚠️ **发送频率限制**：每小时只能发送少量邮件
- ⚠️ **可能被标记为垃圾邮件**：某些邮箱服务商会将默认 SMTP 的邮件标记为垃圾邮件
- ⚠️ **某些邮箱服务商不支持**：部分企业邮箱可能屏蔽默认 SMTP

**解决方案：**

1. **检查垃圾邮件文件夹**：邮件可能被误判
2. **等待几分钟后重试**：避免频率限制
3. **使用其他邮箱地址测试**：如 Gmail、Outlook 等
4. **配置自定义 SMTP**（推荐用于生产环境）

### 4. 配置自定义 SMTP 服务器

**推荐配置（生产环境）：**

1. 进入 **Authentication** > **Email Templates**
2. 点击 **SMTP Settings**
3. 配置您的 SMTP 服务器：
   - **SMTP Host**: 您的 SMTP 服务器地址
   - **SMTP Port**: 通常 587 (TLS) 或 465 (SSL)
   - **SMTP User**: SMTP 用户名
   - **SMTP Password**: SMTP 密码
   - **Sender email**: 发件人邮箱地址
   - **Sender name**: 发件人名称

**常用 SMTP 服务商配置：**

- **Gmail**: smtp.gmail.com:587
- **Outlook**: smtp-mail.outlook.com:587
- **SendGrid**: smtp.sendgrid.net:587
- **Mailgun**: smtp.mailgun.org:587

### 5. 检查邮件发送日志

**查看 Supabase 日志：**

1. 进入 **Logs** > **Auth Logs**
2. 查找注册相关的日志
3. 检查是否有邮件发送错误

**查看应用控制台日志：**

应用现在会输出详细的注册日志，包括：
- 注册请求详情
- 返回数据
- 错误信息

### 6. 测试步骤

1. **注册新用户**
2. **查看控制台日志**，确认注册是否成功
3. **检查邮箱**（包括垃圾邮件文件夹）
4. **等待 2-3 分钟**后检查
5. **如果仍未收到**，尝试点击"重新发送确认邮件"

### 7. 常见错误代码

- **429**: 发送频率过高，等待后重试
- **Email rate limit exceeded**: 达到发送频率限制
- **User not found**: 用户不存在或已确认
- **Invalid email**: 邮箱格式错误

## 调试建议

1. **启用详细日志**：代码已添加详细的控制台日志
2. **检查 Supabase Dashboard**：确认配置正确
3. **测试不同邮箱**：排除邮箱服务商限制
4. **查看 Supabase 日志**：检查服务器端错误
5. **配置自定义 SMTP**：提高邮件发送成功率

## 联系支持

如果以上方法都无法解决问题，请：
1. 提供控制台日志
2. 提供 Supabase Dashboard 的配置截图
3. 提供 Supabase Auth Logs 中的相关错误信息

