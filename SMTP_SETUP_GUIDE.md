# Supabase 自定义 SMTP 设置指南

## 📧 什么是 SMTP？

**SMTP（Simple Mail Transfer Protocol）** 是用于发送电子邮件的协议。

### Supabase 默认 SMTP vs 自定义 SMTP

| 特性 | Supabase 默认 SMTP | 自定义 SMTP |
|------|-------------------|------------|
| **用途** | 仅用于测试 | 生产环境使用 |
| **发送限制** | 严格限制（每小时少量邮件） | 根据服务商而定 |
| **送达率** | 较低，容易被标记为垃圾邮件 | 较高 |
| **可靠性** | 不稳定 | 稳定可靠 |
| **成本** | 免费 | 通常有免费额度 |

### 为什么需要自定义 SMTP？

1. **提高邮件送达率**：避免邮件被标记为垃圾邮件
2. **增加发送量**：突破默认 SMTP 的频率限制
3. **品牌化**：使用自己的域名发送邮件
4. **可靠性**：专业的邮件服务商提供更好的服务
5. **统计功能**：查看邮件发送统计和送达率

---

## 🚀 推荐的 SMTP 服务商

### 1. **SendGrid**（推荐）⭐
- **免费额度**：每天 100 封邮件
- **优点**：稳定、易用、文档完善
- **适合**：中小型应用
- **官网**：https://sendgrid.com

### 2. **Mailgun**
- **免费额度**：每月 5,000 封邮件（前 3 个月）
- **优点**：功能强大、API 友好
- **适合**：需要 API 集成的应用
- **官网**：https://www.mailgun.com

### 3. **Amazon SES**
- **免费额度**：每月 62,000 封（在 EC2 上运行）
- **优点**：价格便宜、可扩展性强
- **适合**：大型应用
- **官网**：https://aws.amazon.com/ses/

### 4. **Resend**（新星）
- **免费额度**：每月 3,000 封邮件
- **优点**：现代化、开发者友好
- **适合**：现代应用
- **官网**：https://resend.com

### 5. **QQ 企业邮箱 / 163 企业邮箱**（国内）
- **优点**：国内访问快、中文支持好
- **适合**：主要面向国内用户的应用
- **注意**：需要企业邮箱账号

---

## 📝 详细设置步骤（以 SendGrid 为例）

### 步骤 1：注册 SendGrid 账号

1. 访问 https://sendgrid.com
2. 点击 "Start for Free" 注册账号
3. 完成邮箱验证

### 步骤 2：创建 API Key

1. 登录 SendGrid Dashboard
2. 进入 **Settings** > **API Keys**
3. 点击 **Create API Key**
4. 输入名称（如：Supabase SMTP）
5. 选择权限：**Full Access** 或 **Restricted Access**（推荐选择 Mail Send）
6. 点击 **Create & View**
7. **重要**：复制 API Key（只显示一次，请妥善保存）

### 步骤 3：验证发件人域名（可选但推荐）

**为什么要验证域名？**
- 提高邮件送达率
- 避免被标记为垃圾邮件
- 使用自己的域名发送邮件

**验证步骤：**

1. 进入 **Settings** > **Sender Authentication**
2. 选择 **Authenticate Your Domain**
3. 选择您的域名提供商（如 Cloudflare、GoDaddy 等）
4. 按照提示添加 DNS 记录
5. 等待验证完成（通常几分钟到几小时）

**如果暂时没有域名：**
- 可以使用 SendGrid 提供的单发件人验证（Single Sender Verification）
- 进入 **Settings** > **Sender Authentication** > **Single Sender Verification**
- 添加您的邮箱地址并验证

### 步骤 4：在 Supabase 中配置 SMTP

1. **登录 Supabase Dashboard**
   - 访问 https://app.supabase.com
   - 选择您的项目

2. **进入邮件设置**
   - 点击左侧菜单 **Authentication**
   - 选择 **Email Templates** 或 **SMTP Settings**

3. **配置 SMTP 信息**

   根据 SendGrid 的配置，填写以下信息：

   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587（TLS）或 465（SSL）
   SMTP User: apikey（固定值）
   SMTP Password: [您的 SendGrid API Key]
   Sender Email: [已验证的发件人邮箱，如 noreply@yourdomain.com]
   Sender Name: [发件人名称，如 Your App Name]
   ```

   **详细说明：**
   - **SMTP Host**: `smtp.sendgrid.net`
   - **SMTP Port**: 
     - `587`（推荐，使用 TLS）
     - `465`（使用 SSL）
   - **SMTP User**: `apikey`（固定值，不是您的邮箱）
   - **SMTP Password**: 粘贴您在第 2 步创建的 API Key
   - **Sender Email**: 使用已验证的发件人邮箱
   - **Sender Name**: 您的应用名称

4. **测试配置**
   - 点击 **Test Connection** 或 **Send Test Email**
   - 输入测试邮箱地址
   - 检查是否收到测试邮件

5. **保存配置**
   - 点击 **Save** 保存设置

---

## 🔧 其他常用 SMTP 服务商配置

### Mailgun 配置

```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: postmaster@your-domain.mailgun.org
SMTP Password: [您的 Mailgun SMTP Password]
Sender Email: noreply@yourdomain.com
```

**获取 Mailgun SMTP 密码：**
1. 登录 Mailgun Dashboard
2. 进入 **Sending** > **Domain Settings**
3. 选择您的域名
4. 在 **SMTP credentials** 部分查看密码

### Amazon SES 配置

```
SMTP Host: email-smtp.[region].amazonaws.com
SMTP Port: 587
SMTP User: [您的 SES SMTP Username]
SMTP Password: [您的 SES SMTP Password]
Sender Email: verified-email@yourdomain.com
```

**获取 Amazon SES 凭证：**
1. 登录 AWS Console
2. 进入 Amazon SES
3. 进入 **SMTP Settings**
4. 创建 SMTP 凭证

### Resend 配置

```
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP User: resend
SMTP Password: [您的 Resend API Key]
Sender Email: onboarding@resend.dev（测试）或已验证域名
```

---

## ⚙️ 在 Supabase 中配置的详细步骤

### 方法 1：通过 Email Templates 配置

1. 登录 Supabase Dashboard
2. 进入 **Authentication** > **Email Templates**
3. 点击任意模板（如 **Confirm signup**）
4. 在页面底部找到 **SMTP Settings** 或 **Custom SMTP**
5. 点击 **Enable Custom SMTP** 或 **Configure SMTP**
6. 填写 SMTP 信息
7. 点击 **Save**

### 方法 2：通过项目设置配置

1. 进入 **Project Settings** > **Auth**
2. 找到 **SMTP Settings** 部分
3. 启用 **Custom SMTP**
4. 填写配置信息
5. 保存

---

## ✅ 配置后的检查清单

- [ ] SMTP 服务商账号已注册
- [ ] API Key 或 SMTP 密码已获取
- [ ] 发件人邮箱已验证（推荐）
- [ ] 域名已验证（可选但推荐）
- [ ] Supabase 中已填写所有 SMTP 信息
- [ ] 已发送测试邮件并成功接收
- [ ] 检查邮件是否在收件箱（而非垃圾邮件）

---

## 🐛 常见问题

### Q1: 测试邮件发送失败？
**A:** 检查：
- SMTP Host 和 Port 是否正确
- API Key 或密码是否正确
- 发件人邮箱是否已验证
- 防火墙是否阻止了连接

### Q2: 邮件被标记为垃圾邮件？
**A:** 
- 验证发件人域名（SPF、DKIM、DMARC）
- 使用专业的 SMTP 服务商
- 避免使用免费邮箱作为发件人
- 邮件内容不要包含垃圾邮件关键词

### Q3: 如何查看邮件发送统计？
**A:** 
- SendGrid: Dashboard > Activity
- Mailgun: Dashboard > Logs
- 大多数服务商都提供统计面板

### Q4: 免费额度用完了怎么办？
**A:** 
- 升级到付费计划
- 切换到其他服务商
- 使用多个服务商轮换

### Q5: 国内用户推荐什么服务商？
**A:** 
- **阿里云邮件推送**（推荐）
- **腾讯云 SES**
- **SendCloud**（国内）
- 或使用企业邮箱（QQ、163 等）

---

## 💡 最佳实践

1. **验证域名**：提高邮件送达率
2. **使用专业服务商**：避免使用免费邮箱
3. **监控发送统计**：定期检查送达率和退信率
4. **设置发件人名称**：使用有意义的名称
5. **测试不同邮箱**：确保各种邮箱都能正常接收
6. **备份配置**：保存 SMTP 配置信息

---

## 📚 相关资源

- [SendGrid 文档](https://docs.sendgrid.com/)
- [Mailgun 文档](https://documentation.mailgun.com/)
- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [SMTP 协议说明](https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol)

---

## 🎯 快速开始推荐

**如果您是第一次设置，推荐流程：**

1. **注册 SendGrid**（最简单）
2. **创建 API Key**
3. **验证单个发件人邮箱**（不需要域名）
4. **在 Supabase 中配置 SMTP**
5. **发送测试邮件**

整个过程大约 10-15 分钟即可完成！

