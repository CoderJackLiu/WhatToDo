# 阿里云邮件推送 - 发信域名 DNS 配置指南

## 📋 什么是发信域名？

**发信域名**就是您用来发送邮件的域名，例如：
- `yourdomain.com`
- `example.com`
- `mydomain.cn`

配置发信域名后，您可以使用该域名下的任意邮箱地址发送邮件，如：
- `noreply@yourdomain.com`
- `support@yourdomain.com`
- `info@yourdomain.com`

---

## 🎯 配置流程总览

1. **在阿里云邮件推送中添加发信域名**
2. **获取需要添加的 DNS 记录**
3. **在域名管理后台添加 DNS 记录**
4. **等待 DNS 生效**
5. **在阿里云验证域名**

---

## 第一步：在阿里云邮件推送中添加发信域名

### 1.1 进入发件地址管理

1. 登录阿里云控制台
2. 进入 **邮件推送** 服务
3. 点击左侧菜单 **"发件地址管理"**
4. 点击 **"新建发件地址"**

### 1.2 选择域名发信

1. 选择 **"域名发信"**（不是"邮箱账号发信"）
2. 输入您的域名（如：`yourdomain.com`）
   - **注意**：只输入域名，不要带 `www` 或 `http://`
   - 正确：`yourdomain.com`
   - 错误：`www.yourdomain.com` 或 `http://yourdomain.com`
3. 点击 **"确定"** 或 **"下一步"**

### 1.3 获取 DNS 记录信息

添加域名后，系统会显示需要添加的 DNS 记录，通常包括：

1. **SPF 记录**（必须）
2. **DKIM 记录**（推荐）
3. **DMARC 记录**（可选）

**重要：** 请复制或截图保存这些 DNS 记录信息！

---

## 第二步：在域名管理后台添加 DNS 记录

### 2.1 确定您的域名服务商

首先需要知道您的域名在哪里注册和管理。常见的有：

- **阿里云域名**
- **腾讯云域名**
- **Cloudflare**
- **GoDaddy**
- **Namecheap**
- **其他域名服务商**

### 2.2 登录域名管理后台

根据您的域名服务商，登录相应的管理后台：

- **阿里云**：https://dc.console.aliyun.com
- **腾讯云**：https://console.cloud.tencent.com/domain
- **Cloudflare**：https://dash.cloudflare.com
- **GoDaddy**：https://www.godaddy.com
- **其他**：访问您的域名注册商网站

---

## 第三步：添加 DNS 记录（详细步骤）

### 3.1 找到 DNS 管理页面

在域名管理后台，找到以下位置之一：
- **DNS 管理**
- **域名解析**
- **DNS 设置**
- **域名解析设置**
- **DNS Records**

### 3.2 添加 SPF 记录（必须）

**SPF 记录的作用：** 告诉邮箱服务商哪些服务器可以代表您的域名发送邮件。

#### 记录格式：

```
类型：TXT
主机记录：@ 或 yourdomain.com（或留空）
记录值：v=spf1 include:spf1.dm.aliyun.com include:spf2.dm.aliyun.com ~all
TTL：600（或默认值）
```

#### 不同服务商的填写方式：

**阿里云域名：**
1. 进入 **域名** > **解析**
2. 点击 **"添加记录"**
3. 填写：
   - **记录类型**：选择 `TXT`
   - **主机记录**：填写 `@`（表示根域名）
   - **记录值**：`v=spf1 include:spf1.dm.aliyun.com include:spf2.dm.aliyun.com ~all`
   - **TTL**：600（或默认）
4. 点击 **"确定"**

**腾讯云域名：**
1. 进入 **域名解析**
2. 点击 **"添加记录"**
3. 填写：
   - **主机记录**：`@`
   - **记录类型**：`TXT`
   - **记录值**：`v=spf1 include:spf1.dm.aliyun.com include:spf2.dm.aliyun.com ~all`
   - **TTL**：600
4. 点击 **"保存"**

**Cloudflare：**
1. 选择您的域名
2. 进入 **DNS** 页面
3. 点击 **"Add record"**
4. 填写：
   - **Type**：选择 `TXT`
   - **Name**：`@` 或 `yourdomain.com`
   - **Content**：`v=spf1 include:spf1.dm.aliyun.com include:spf2.dm.aliyun.com ~all`
   - **TTL**：Auto
5. 点击 **"Save"**

**GoDaddy：**
1. 进入 **My Products** > **DNS**
2. 点击 **"Add"**
3. 填写：
   - **Type**：`TXT`
   - **Name**：`@`
   - **Value**：`v=spf1 include:spf1.dm.aliyun.com include:spf2.dm.aliyun.com ~all`
   - **TTL**：600
4. 点击 **"Save"**

### 3.3 添加 DKIM 记录（推荐）

**DKIM 记录的作用：** 用于邮件签名验证，提高邮件送达率。

#### 记录格式：

阿里云会提供具体的 DKIM 记录，格式类似：

```
类型：TXT
主机记录：dm._domainkey 或类似格式
记录值：[阿里云提供的具体值，通常很长]
TTL：600
```

#### 添加步骤：

1. 在阿里云邮件推送控制台，查看 DKIM 记录信息
2. 复制 **主机记录** 和 **记录值**
3. 在域名管理后台添加：
   - **记录类型**：`TXT`
   - **主机记录**：`dm._domainkey`（或阿里云提供的值）
   - **记录值**：粘贴阿里云提供的完整值
   - **TTL**：600

**示例：**

```
主机记录：dm._domainkey
记录值：v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCxxxxxxxxxxxxx...（很长的一串）
```

### 3.4 添加 DMARC 记录（可选）

**DMARC 记录的作用：** 进一步保护域名不被滥用。

#### 记录格式：

```
类型：TXT
主机记录：_dmarc
记录值：v=DMARC1; p=none; rua=mailto:admin@yourdomain.com
TTL：600
```

#### 添加步骤：

1. 添加新的 TXT 记录
2. **主机记录**：`_dmarc`
3. **记录值**：`v=DMARC1; p=none; rua=mailto:admin@yourdomain.com`
   - 将 `admin@yourdomain.com` 替换为您的邮箱地址
4. 保存

---

## 第四步：等待 DNS 生效

### 4.1 DNS 生效时间

- **通常**：几分钟到几小时
- **最长**：最多 48 小时（但通常不需要这么久）
- **国内域名**：通常较快（几分钟到几小时）
- **国外域名**：可能需要更长时间

### 4.2 如何检查 DNS 是否生效？

#### 方法一：使用命令行工具

**Windows：**
```cmd
nslookup -type=TXT yourdomain.com
```

**Linux/Mac：**
```bash
dig TXT yourdomain.com
# 或
nslookup -type=TXT yourdomain.com
```

**检查 SPF 记录：**
```bash
nslookup -type=TXT yourdomain.com
# 应该能看到包含 "spf1" 的记录
```

**检查 DKIM 记录：**
```bash
nslookup -type=TXT dm._domainkey.yourdomain.com
# 应该能看到 DKIM 记录
```

#### 方法二：使用在线工具

访问以下网站检查 DNS 记录：

1. **MXToolbox**：https://mxtoolbox.com/spf.aspx
   - 输入您的域名
   - 查看 SPF 记录

2. **DNS Checker**：https://dnschecker.org
   - 输入域名和记录类型
   - 查看全球 DNS 解析情况

3. **Google Admin Toolbox**：https://toolbox.googleapps.com/apps/checkmx/check
   - 检查邮件相关记录

#### 方法三：在阿里云控制台检查

1. 回到阿里云邮件推送控制台
2. 在发件地址管理中，找到您的域名
3. 点击 **"验证"** 按钮
4. 系统会自动检查 DNS 记录
5. 如果验证通过，状态会变为 **"已验证"**

---

## 第五步：验证域名

### 5.1 在阿里云邮件推送中验证

1. 登录阿里云邮件推送控制台
2. 进入 **"发件地址管理"**
3. 找到您添加的域名
4. 点击 **"验证"** 按钮
5. 等待验证结果

### 5.2 验证结果

**验证成功：**
- 状态显示为 **"已验证"** 或 **"验证通过"**
- 可以使用该域名发送邮件了

**验证失败：**
- 检查 DNS 记录是否正确添加
- 确认 DNS 记录格式正确
- 等待更长时间让 DNS 生效
- 使用 `nslookup` 或 `dig` 命令检查 DNS 记录

---

## 📝 常见问题解答

### Q1: 主机记录填什么？

**答案：**

- **SPF 记录**：填写 `@`（表示根域名）
- **DKIM 记录**：填写 `dm._domainkey`（或阿里云提供的值）
- **DMARC 记录**：填写 `_dmarc`

**说明：**
- `@` 表示根域名（yourdomain.com）
- 如果服务商不支持 `@`，可以填写域名本身或留空

### Q2: 记录值在哪里找？

**答案：**

1. **SPF 记录值**：
   ```
   v=spf1 include:spf1.dm.aliyun.com include:spf2.dm.aliyun.com ~all
   ```
   这是固定的，所有阿里云邮件推送用户都一样。

2. **DKIM 记录值**：
   - 在阿里云邮件推送控制台查看
   - 每个域名都不同
   - 通常是一串很长的字符

3. **DMARC 记录值**：
   ```
   v=DMARC1; p=none; rua=mailto:admin@yourdomain.com
   ```
   需要将邮箱地址替换为您的邮箱。

### Q3: TTL 值填多少？

**答案：**

- **推荐**：600（10 分钟）
- **也可以**：3600（1 小时）
- **默认值**：使用服务商提供的默认值即可

TTL 值不影响功能，只影响 DNS 缓存时间。

### Q4: DNS 记录添加后多久生效？

**答案：**

- **最快**：几分钟
- **通常**：30 分钟到 2 小时
- **最长**：48 小时（但很少需要这么久）

**加速方法：**
- 降低 TTL 值（但需要提前设置）
- 清除本地 DNS 缓存

### Q5: 验证一直失败怎么办？

**检查清单：**

- [ ] DNS 记录是否正确添加
- [ ] 记录类型是否为 TXT
- [ ] 主机记录是否正确（SPF 用 `@`，DKIM 用 `dm._domainkey`）
- [ ] 记录值是否完整（没有遗漏字符）
- [ ] 是否等待足够时间（至少 30 分钟）
- [ ] 使用 `nslookup` 检查 DNS 是否生效

**排查步骤：**

1. 使用 `nslookup` 检查 DNS 记录
2. 确认记录值完全正确
3. 等待更长时间（最多 24 小时）
4. 联系域名服务商客服
5. 联系阿里云技术支持

### Q6: 可以只添加 SPF 记录吗？

**答案：**

- **可以**：SPF 记录是必须的
- **推荐**：同时添加 DKIM 记录（提高送达率）
- **可选**：添加 DMARC 记录（增强安全性）

**最低要求：** 至少添加 SPF 记录才能验证通过。

### Q7: 多个域名怎么配置？

**答案：**

- 每个域名都需要单独配置
- 重复上述步骤为每个域名添加 DNS 记录
- 每个域名的 DKIM 记录值都不同

---

## 🎯 快速配置检查清单

在开始配置前，准备以下信息：

- [ ] 您的域名（如：yourdomain.com）
- [ ] 域名服务商账号和密码
- [ ] 阿里云邮件推送控制台已打开
- [ ] 可以访问域名管理后台

配置步骤：

- [ ] 在阿里云邮件推送中添加发信域名
- [ ] 复制 SPF 记录值
- [ ] 复制 DKIM 记录值（如果有）
- [ ] 登录域名管理后台
- [ ] 添加 SPF 记录（TXT 类型，主机记录 `@`）
- [ ] 添加 DKIM 记录（TXT 类型，主机记录 `dm._domainkey`）
- [ ] 等待 DNS 生效（30 分钟到几小时）
- [ ] 在阿里云验证域名
- [ ] 验证通过后即可使用

---

## 💡 重要提示

1. **DNS 记录必须完全正确**
   - 记录值不能有空格或错误
   - 建议直接复制粘贴，不要手动输入

2. **耐心等待 DNS 生效**
   - 不要频繁验证
   - 等待至少 30 分钟后再验证

3. **保存 DNS 记录信息**
   - 截图保存阿里云提供的 DNS 记录
   - 方便后续查看和排查问题

4. **先添加 SPF，再添加 DKIM**
   - SPF 是必须的
   - DKIM 可以提高送达率

5. **验证前检查 DNS**
   - 使用 `nslookup` 确认 DNS 记录已生效
   - 再在阿里云控制台验证

---

## 📞 需要帮助？

如果遇到问题：

1. **查看阿里云文档**：https://help.aliyun.com/product/29412.html
2. **提交阿里云工单**：在控制台提交技术支持工单
3. **检查 DNS 工具**：使用在线工具检查 DNS 记录
4. **联系域名服务商**：如果是 DNS 配置问题

---

完成 DNS 配置后，您的发信域名就可以正常使用了！🎉

