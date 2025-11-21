# 修复缺失的 latest.yml 文件

## 问题说明

如果 GitHub Release 中缺少 `latest.yml` 文件，`electron-updater` 将无法检查更新，会报错：
```
Cannot find latest.yml in the latest release artifacts
```

## 解决方案

### 方法一：手动添加 latest.yml 到现有 Release（推荐）

#### 步骤 1：生成 latest.yml 文件

1. 下载对应版本的 `.exe` 文件（如 `TodoList-v2.3.0.exe`）
2. 计算文件的 SHA512 哈希值：
   ```powershell
   # Windows PowerShell
   $file = "TodoList-v2.3.0.exe"
   $hash = Get-FileHash -Path $file -Algorithm SHA512
   $hash.Hash
   ```
   
   或者使用命令行：
   ```bash
   # Git Bash 或 WSL
   sha512sum TodoList-v2.3.0.exe
   ```

3. 获取文件大小（字节）：
   ```powershell
   # Windows PowerShell
   (Get-Item "TodoList-v2.3.0.exe").Length
   ```

4. 创建 `latest.yml` 文件：
   ```yaml
   version: 2.3.0
   files:
     - url: TodoList-v2.3.0.exe
       sha512: [你的SHA512哈希值]
       size: [文件大小（字节）]
   path: TodoList-v2.3.0.exe
   sha512: [你的SHA512哈希值]
   releaseDate: '2024-12-20T00:00:00.000Z'
   ```

#### 步骤 2：上传到 GitHub Release

1. 访问：`https://github.com/CoderJackLiu/WhatToDo/releases/tag/v2.3.0`
2. 点击 "Edit release"（编辑发布）
3. 在 "Attach binaries" 区域，拖拽或选择 `latest.yml` 文件
4. 点击 "Update release"（更新发布）

### 方法二：重新发布版本（如果方法一不可行）

1. 删除现有的 Release（可选，如果不想保留）
2. 删除标签：
   ```bash
   git tag -d v2.3.0
   git push origin :refs/tags/v2.3.0
   ```
3. 重新创建标签并推送：
   ```bash
   git tag -a v2.3.0 -m "版本 2.3.0"
   git push origin v2.3.0
   ```
4. 等待 GitHub Actions 完成构建（现在会自动生成 latest.yml）

### 方法三：使用脚本自动生成（快速）

创建一个 PowerShell 脚本 `generate-latest-yml.ps1`：

```powershell
param(
    [string]$Version = "2.3.0",
    [string]$ExeFile = "TodoList-v2.3.0.exe",
    [string]$TagName = "v2.3.0"
)

if (-not (Test-Path $ExeFile)) {
    Write-Host "Error: File not found: $ExeFile" -ForegroundColor Red
    exit 1
}

# Calculate SHA512 hash
$hash = Get-FileHash -Path $ExeFile -Algorithm SHA512
$sha512 = $hash.Hash.ToLower()

# Get file size
$size = (Get-Item $ExeFile).Length

# Get current date in ISO format
$releaseDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.000Z")

# Generate latest.yml
$ymlContent = @"
version: $Version
files:
  - url: TodoList-$TagName.exe
    sha512: $sha512
    size: $size
path: TodoList-$TagName.exe
sha512: $sha512
releaseDate: '$releaseDate'
"@

$ymlContent | Out-File -FilePath "latest.yml" -Encoding UTF8

Write-Host "Generated latest.yml:" -ForegroundColor Green
Write-Host $ymlContent
Write-Host "`nFile saved to: latest.yml" -ForegroundColor Green
```

使用方法：
```powershell
.\generate-latest-yml.ps1 -Version "2.3.0" -ExeFile "TodoList-v2.3.0.exe" -TagName "v2.3.0"
```

## 验证修复

修复后，验证 `latest.yml` 文件：

1. 访问：`https://github.com/CoderJackLiu/WhatToDo/releases/download/v2.3.0/latest.yml`
2. 应该能看到 YAML 内容
3. 运行应用，应该能正常检查更新

## 预防措施

已修复的 GitHub Actions 配置会自动：
- 在构建时查找 `latest.yml`（如果 electron-builder 生成了）
- 如果没有找到，自动生成 `latest.yml`
- 上传 `latest.yml` 到 GitHub Release

后续版本不会再出现这个问题。

