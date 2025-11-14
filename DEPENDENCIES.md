# 依赖说明文档

## 生产依赖 (dependencies)

这些依赖会被打包到最终的应用中：

### @supabase/supabase-js@2.81.1
- **用途**: Supabase 客户端库，用于数据库操作和身份认证
- **使用位置**: 
  - `supabase-config.js` - 创建 Supabase 客户端
  - `auth-service.js` - 身份认证服务
  - `data-service.js` - 数据操作服务
- **必需**: ✅ 是

### tslib@2.8.1
- **用途**: TypeScript 辅助库（@supabase/supabase-js 的依赖）
- **使用位置**: 由 @supabase/supabase-js 内部使用
- **必需**: ✅ 是（@supabase/supabase-js 的传递依赖）

## 开发依赖 (devDependencies)

这些依赖仅在开发时使用，不会被打包：

- `electron@^27.0.0` - Electron 运行时
- `electron-builder@^24.6.4` - 应用打包工具
- `sharp@^0.34.5` - 图标生成工具
- `to-ico@^1.1.5` - ICO 格式转换工具

## 打包配置说明

electron-builder 会自动：
1. 打包 `dependencies` 中的所有包及其依赖
2. 排除 `devDependencies` 中的包
3. 排除不必要的文件（类型定义、测试文件、文档等）

当前配置确保：
- ✅ 所有生产依赖都会被正确打包
- ✅ 排除不必要的文件以减小体积
- ✅ 保持依赖树完整

## 更新依赖

```bash
# 更新所有依赖
npm update

# 更新特定依赖
npm update @supabase/supabase-js

# 检查过时的依赖
npm outdated
```

