# 数据库迁移：添加 show_numbers 字段

## 概述

为 `groups` 表添加 `show_numbers` 字段，用于存储每个分组的编号显示设置。

## 迁移步骤

### 方法一：使用 Supabase SQL Editor（推荐）

1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 选择你的项目
3. 进入 **SQL Editor**
4. 执行以下 SQL 语句：

```sql
-- 为 groups 表添加 show_numbers 字段
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS show_numbers BOOLEAN DEFAULT false NOT NULL;

-- 添加注释说明字段用途
COMMENT ON COLUMN groups.show_numbers IS '是否显示待办项编号，默认 false';
```

### 方法二：使用 Supabase Table Editor

1. 登录 Supabase Dashboard
2. 选择你的项目
3. 进入 **Table Editor**
4. 选择 `groups` 表
5. 点击 **Add Column**
6. 填写字段信息：
   - **Name**: `show_numbers`
   - **Type**: `bool`
   - **Default value**: `false`
   - **Is nullable**: ❌ (取消勾选)
7. 点击 **Save**

## 字段说明

- **字段名**: `show_numbers`
- **类型**: `BOOLEAN`
- **默认值**: `false`
- **是否可空**: `NOT NULL`
- **说明**: 控制该分组是否显示待办项编号

## 验证迁移

执行以下 SQL 查询验证字段是否添加成功：

```sql
-- 查看 groups 表结构
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'groups' AND column_name = 'show_numbers';
```

如果返回结果中包含 `show_numbers` 字段，说明迁移成功。

## 回滚（如果需要）

如果需要回滚此迁移，执行：

```sql
ALTER TABLE groups DROP COLUMN IF EXISTS show_numbers;
```

## 注意事项

1. 此迁移不会影响现有数据，所有现有分组的 `show_numbers` 字段将自动设置为 `false`
2. 迁移完成后，应用将自动使用数据库字段，不再依赖本地存储
3. 如果之前使用过本地存储，迁移后可以手动清理本地存储中的相关数据（可选）

