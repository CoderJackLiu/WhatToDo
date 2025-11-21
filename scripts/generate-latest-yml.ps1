# 生成 latest.yml 文件用于 GitHub Release
# 使用方法: .\generate-latest-yml.ps1 -Version "2.3.0" -ExeFile "TodoList-v2.3.0.exe" -TagName "v2.3.0"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$true)]
    [string]$ExeFile,
    
    [Parameter(Mandatory=$true)]
    [string]$TagName
)

# 检查文件是否存在
if (-not (Test-Path $ExeFile)) {
    Write-Host "错误: 文件不存在: $ExeFile" -ForegroundColor Red
    exit 1
}

Write-Host "正在生成 latest.yml 文件..." -ForegroundColor Yellow
Write-Host "版本: $Version" -ForegroundColor Cyan
Write-Host "文件: $ExeFile" -ForegroundColor Cyan
Write-Host "标签: $TagName" -ForegroundColor Cyan
Write-Host ""

# 计算 SHA512 哈希值
Write-Host "正在计算 SHA512 哈希值..." -ForegroundColor Yellow
$hash = Get-FileHash -Path $ExeFile -Algorithm SHA512
$sha512 = $hash.Hash.ToLower()
Write-Host "SHA512: $sha512" -ForegroundColor Green

# 获取文件大小
$size = (Get-Item $ExeFile).Length
Write-Host "文件大小: $size 字节" -ForegroundColor Green

# 获取当前日期（UTC）
$releaseDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.000Z")
Write-Host "发布日期: $releaseDate" -ForegroundColor Green

# 确定文件名（使用标签名）
$fileName = "TodoList-$TagName.exe"

# 生成 latest.yml 内容
$ymlContent = @"
version: $Version
files:
  - url: $fileName
    sha512: $sha512
    size: $size
path: $fileName
sha512: $sha512
releaseDate: '$releaseDate'
"@

# 保存到文件
$ymlContent | Out-File -FilePath "latest.yml" -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "✅ latest.yml 文件已生成！" -ForegroundColor Green
Write-Host ""
Write-Host "文件内容:" -ForegroundColor Cyan
Write-Host $ymlContent
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 访问: https://github.com/CoderJackLiu/WhatToDo/releases/edit/$TagName" -ForegroundColor White
Write-Host "2. 在 'Attach binaries' 区域上传 latest.yml 文件" -ForegroundColor White
Write-Host "3. 点击 'Update release'" -ForegroundColor White

