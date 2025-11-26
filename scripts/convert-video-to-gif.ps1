# 将视频转换为 GIF
# 需要先安装 ffmpeg: https://ffmpeg.org/download.html

$videoPath = "docs/Demo.mp4"
$outputPath = "docs/Demo.gif"

# 检查 ffmpeg 是否安装
try {
    $null = Get-Command ffmpeg -ErrorAction Stop
} catch {
    Write-Host "错误: 未找到 ffmpeg，请先安装 ffmpeg" -ForegroundColor Red
    Write-Host "下载地址: https://ffmpeg.org/download.html" -ForegroundColor Yellow
    Write-Host "或者使用 Chocolatey: choco install ffmpeg" -ForegroundColor Yellow
    exit 1
}

# 检查视频文件是否存在
if (-not (Test-Path $videoPath)) {
    Write-Host "错误: 找不到视频文件: $videoPath" -ForegroundColor Red
    exit 1
}

Write-Host "正在转换视频为 GIF..." -ForegroundColor Green
Write-Host "输入文件: $videoPath" -ForegroundColor Cyan
Write-Host "输出文件: $outputPath" -ForegroundColor Cyan

# 使用 ffmpeg 转换
# 参数说明:
# -i: 输入文件
# -vf: 视频滤镜，设置帧率和缩放
# -r: 帧率 (15fps 适合 GIF)
# -s: 尺寸 (宽度x高度，保持宽高比)
# -loop: 循环次数 (0 表示无限循环)
ffmpeg -i $videoPath -vf "fps=15,scale=800:-1:flags=lanczos" -loop 0 $outputPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "转换成功！" -ForegroundColor Green
    Write-Host "GIF 文件已保存到: $outputPath" -ForegroundColor Cyan
    
    # 获取文件大小
    $fileSize = (Get-Item $outputPath).Length / 1MB
    Write-Host "文件大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Yellow
    
    if ($fileSize -gt 10) {
        Write-Host "警告: GIF 文件较大，建议优化或使用视频平台托管" -ForegroundColor Yellow
    }
} else {
    Write-Host "转换失败，请检查错误信息" -ForegroundColor Red
    exit 1
}

