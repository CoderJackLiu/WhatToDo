const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class CacheService {
  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'cache');
    this.groupsCachePath = path.join(this.cacheDir, 'groups.json');
    this.syncStatePath = path.join(this.cacheDir, 'sync-state.json');
    this.todosCache = new Map(); // 内存中的待办缓存
    
    // 确保缓存目录存在
    this.ensureCacheDir();
  }

  // 确保缓存目录存在
  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create cache directory:', error);
      }
    }
  }

  // ========== 分组缓存操作 ==========

  // 获取分组缓存
  getGroupsCache() {
    try {
      if (fs.existsSync(this.groupsCachePath)) {
        const data = fs.readFileSync(this.groupsCachePath, 'utf-8');
        const cache = JSON.parse(data);
        return cache.groups || [];
      }
    } catch (error) {
      console.error('Failed to read groups cache:', error);
    }
    return [];
  }

  // 保存分组缓存
  saveGroupsCache(groups) {
    try {
      const cache = {
        groups,
        timestamp: Date.now()
      };
      fs.writeFileSync(this.groupsCachePath, JSON.stringify(cache, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save groups cache:', error);
      return false;
    }
  }

  // 更新单个分组缓存
  updateGroupCache(groupId, updates) {
    const groups = this.getGroupsCache();
    const index = groups.findIndex(g => g.id === groupId);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...updates, updated_at: new Date().toISOString() };
      return this.saveGroupsCache(groups);
    }
    return false;
  }

  // 添加分组到缓存
  addGroupCache(group) {
    const groups = this.getGroupsCache();
    groups.push(group);
    return this.saveGroupsCache(groups);
  }

  // 从缓存中删除分组
  deleteGroupCache(groupId) {
    const groups = this.getGroupsCache();
    const filtered = groups.filter(g => g.id !== groupId);
    
    // 同时删除该分组的待办缓存
    this.deleteTodosCacheFile(groupId);
    
    return this.saveGroupsCache(filtered);
  }

  // ========== 待办缓存操作 ==========

  // 获取待办缓存路径
  getTodosCachePath(groupId) {
    return path.join(this.cacheDir, `todos-${groupId}.json`);
  }

  // 获取待办缓存
  getTodosCache(groupId) {
    try {
      // 先检查内存缓存
      if (this.todosCache.has(groupId)) {
        return this.todosCache.get(groupId);
      }

      // 从文件读取
      const cachePath = this.getTodosCachePath(groupId);
      if (fs.existsSync(cachePath)) {
        const data = fs.readFileSync(cachePath, 'utf-8');
        const cache = JSON.parse(data);
        const todos = cache.todos || [];
        
        // 存入内存缓存
        this.todosCache.set(groupId, todos);
        return todos;
      }
    } catch (error) {
      console.error(`Failed to read todos cache for group ${groupId}:`, error);
    }
    return [];
  }

  // 保存待办缓存
  saveTodosCache(groupId, todos) {
    try {
      const cache = {
        groupId,
        todos,
        timestamp: Date.now()
      };
      
      const cachePath = this.getTodosCachePath(groupId);
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      
      // 更新内存缓存
      this.todosCache.set(groupId, todos);
      return true;
    } catch (error) {
      console.error(`Failed to save todos cache for group ${groupId}:`, error);
      return false;
    }
  }

  // 更新单个待办缓存
  updateTodoCache(groupId, todoId, updates) {
    const todos = this.getTodosCache(groupId);
    const index = todos.findIndex(t => t.id === todoId);
    if (index !== -1) {
      todos[index] = { ...todos[index], ...updates, updated_at: new Date().toISOString() };
      return this.saveTodosCache(groupId, todos);
    }
    return false;
  }

  // 添加待办到缓存
  addTodoCache(groupId, todo) {
    const todos = this.getTodosCache(groupId);
    todos.push(todo);
    return this.saveTodosCache(groupId, todos);
  }

  // 从缓存中删除待办
  deleteTodoCache(groupId, todoId) {
    const todos = this.getTodosCache(groupId);
    const filtered = todos.filter(t => t.id !== todoId);
    return this.saveTodosCache(groupId, filtered);
  }

  // 从缓存中批量删除待办
  deleteTodosCache(groupId, todoIds) {
    const todos = this.getTodosCache(groupId);
    const idsSet = new Set(todoIds);
    const filtered = todos.filter(t => !idsSet.has(t.id));
    return this.saveTodosCache(groupId, filtered);
  }

  // 删除待办缓存文件
  deleteTodosCacheFile(groupId) {
    try {
      const cachePath = this.getTodosCachePath(groupId);
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
      // 清除内存缓存
      this.todosCache.delete(groupId);
      return true;
    } catch (error) {
      console.error(`Failed to delete todos cache file for group ${groupId}:`, error);
      return false;
    }
  }

  // ========== 同步状态管理 ==========

  // 获取同步状态
  getSyncState() {
    try {
      if (fs.existsSync(this.syncStatePath)) {
        const data = fs.readFileSync(this.syncStatePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read sync state:', error);
    }
    return {
      lastSync: null,
      pendingOperations: []
    };
  }

  // 保存同步状态
  saveSyncState(state) {
    try {
      fs.writeFileSync(this.syncStatePath, JSON.stringify(state, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save sync state:', error);
      return false;
    }
  }

  // 更新最后同步时间
  updateLastSync() {
    const state = this.getSyncState();
    state.lastSync = Date.now();
    return this.saveSyncState(state);
  }

  // 添加待同步操作
  addPendingOperation(operation) {
    const state = this.getSyncState();
    state.pendingOperations.push({
      ...operation,
      timestamp: Date.now()
    });
    return this.saveSyncState(state);
  }

  // 移除待同步操作
  removePendingOperation(operationId) {
    const state = this.getSyncState();
    state.pendingOperations = state.pendingOperations.filter(op => op.id !== operationId);
    return this.saveSyncState(state);
  }

  // 清空所有待同步操作
  clearPendingOperations() {
    const state = this.getSyncState();
    state.pendingOperations = [];
    return this.saveSyncState(state);
  }

  // ========== 缓存清理 ==========

  // 清空所有缓存
  clearAllCache() {
    try {
      // 清空分组缓存
      if (fs.existsSync(this.groupsCachePath)) {
        fs.unlinkSync(this.groupsCachePath);
      }

      // 清空所有待办缓存
      const files = fs.readdirSync(this.cacheDir);
      files.forEach(file => {
        if (file.startsWith('todos-') && file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      });

      // 清空同步状态
      if (fs.existsSync(this.syncStatePath)) {
        fs.unlinkSync(this.syncStatePath);
      }

      // 清空内存缓存
      this.todosCache.clear();

      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  // 检查缓存是否存在
  hasCachedData() {
    return fs.existsSync(this.groupsCachePath);
  }

  // 获取缓存统计信息
  getCacheStats() {
    try {
      const stats = {
        groupsCount: 0,
        todoCachesCount: 0,
        totalSize: 0,
        lastSync: null
      };

      // 分组缓存
      if (fs.existsSync(this.groupsCachePath)) {
        const groupsData = this.getGroupsCache();
        stats.groupsCount = groupsData.length;
        const groupsStats = fs.statSync(this.groupsCachePath);
        stats.totalSize += groupsStats.size;
      }

      // 待办缓存
      const files = fs.readdirSync(this.cacheDir);
      files.forEach(file => {
        if (file.startsWith('todos-') && file.endsWith('.json')) {
          stats.todoCachesCount++;
          const filePath = path.join(this.cacheDir, file);
          const fileStats = fs.statSync(filePath);
          stats.totalSize += fileStats.size;
        }
      });

      // 同步状态
      const syncState = this.getSyncState();
      stats.lastSync = syncState.lastSync;

      return stats;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }
}

module.exports = new CacheService();

