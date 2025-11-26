# 视频转 GIF 说明

## 方法一：使用 ffmpeg（推荐）

### 1. 安装 ffmpeg

**选项 A：使用 Chocolatey（如果已安装）**
```powershell
choco install ffmpeg
```

**选项 B：手动安装**
1. 访问 https://ffmpeg.org/download.html
2. 下载 Windows 版本
3. 解压到某个目录（如 `C:\ffmpeg`）
4. 将 `C:\ffmpeg\bin` 添加到系统 PATH 环境变量

**选项 C：使用 winget（Windows 10/11）**
```powershell
winget install ffmpeg
```

### 2. 运行转换脚本

```powershell
powershell -ExecutionPolicy Bypass -File scripts/convert-video-to-gif.ps1
```

转换后的 GIF 文件将保存在 `docs/Demo.gif`

## 方法二：使用在线工具

1. 访问在线转换工具（如 https://ezgif.com/video-to-gif）
2. 上传 `docs/Demo.mp4`
3. 设置参数：
   - 帧率：15 fps
   - 尺寸：800px 宽度（保持宽高比）
   - 质量：中等
4. 下载转换后的 GIF
5. 保存为 `docs/Demo.gif`

## 注意事项

- GIF 文件可能会比较大（通常 5-20MB），如果超过 GitHub 的推荐大小，建议：
  - 降低帧率（10-12 fps）
  - 减小尺寸（600px 宽度）
  - 或使用视频平台（Bilibili/YouTube）托管

