const { supabase } = require('./supabase-config');
const cacheService = require('./cache-service');

// 全局日志开关
const DEBUG_MODE = process.env.DEBUG === 'true' || false;

// 日志包装函数
const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

class DataService {
  constructor() {
    this.subscriptions = new Map();
    this.useCacheFirst = true; // 优先使用缓存
  }

  // ========== 分组操作 ==========

  // 加载所有分组（按 sort_order 排序）- 优先从缓存加载
  async loadGroups(forceRefresh = false) {
    try {
      // 如果不强制刷新，优先从缓存读取
      if (!forceRefresh && this.useCacheFirst) {
        const cachedGroups = cacheService.getGroupsCache();
        if (cachedGroups.length > 0) {
          // 后台异步同步服务器数据
          this._syncGroupsInBackground();
          return { success: true, data: cachedGroups, fromCache: true };
        }
      }

      // 从服务器加载
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      // 保存到缓存
      if (data && data.length > 0) {
        cacheService.saveGroupsCache(data);
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to load groups:', error);
      
      // 如果服务器请求失败，尝试返回缓存数据
      const cachedGroups = cacheService.getGroupsCache();
      if (cachedGroups.length > 0) {
        return { success: true, data: cachedGroups, fromCache: true, error: error.message };
      }
      
      return { success: false, error: error.message, data: [] };
    }
  }

  // 后台同步分组数据
  async _syncGroupsInBackground() {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (!error && data) {
        cacheService.saveGroupsCache(data);
        cacheService.updateLastSync();
      }
    } catch (error) {
      // 后台同步失败不影响用户体验
      console.log('Background sync failed:', error.message);
    }
  }

  // 创建分组 - 乐观更新
  async createGroup(name = '', theme = 'default') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');

      // 获取当前最大 sort_order（优先从缓存）
      const cachedGroups = cacheService.getGroupsCache();
      let maxSortOrder = -1;
      if (cachedGroups.length > 0) {
        maxSortOrder = Math.max(...cachedGroups.map(g => g.sort_order || 0));
      }

      // 创建临时ID和数据（乐观更新）
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempGroup = {
        id: tempId,
        user_id: user.id,
        name,
        theme,
        sort_order: maxSortOrder + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 立即添加到缓存
      cacheService.addGroupCache(tempGroup);

      // 后台同步到服务器
      const { data, error } = await supabase
        .from('groups')
        .insert([{
          user_id: user.id,
          name,
          theme,
          sort_order: maxSortOrder + 1
        }])
        .select()
        .single();
      
      if (error) throw error;

      // 替换临时数据为真实数据
      const groups = cacheService.getGroupsCache();
      const index = groups.findIndex(g => g.id === tempId);
      if (index !== -1) {
        groups[index] = data;
        cacheService.saveGroupsCache(groups);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to create group:', error);
      
      // 失败时从缓存中移除临时数据
      const groups = cacheService.getGroupsCache();
      const filtered = groups.filter(g => !g.id.startsWith('temp_'));
      cacheService.saveGroupsCache(filtered);
      
      return { success: false, error: error.message };
    }
  }

  // 更新分组 - 乐观更新
  async updateGroup(id, updates) {
    try {
      // 立即更新缓存
      const oldData = cacheService.getGroupsCache().find(g => g.id === id);
      cacheService.updateGroupCache(id, updates);

      // 后台同步到服务器
      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // 用服务器返回的数据更新缓存
      cacheService.updateGroupCache(id, data);

      return { success: true, data };
    } catch (error) {
      console.error('Failed to update group:', error);
      
      // 失败时回滚缓存
      if (oldData) {
        cacheService.updateGroupCache(id, oldData);
      }
      
      return { success: false, error: error.message };
    }
  }

  // 删除分组（级联删除待办）- 乐观更新
  async deleteGroup(id) {
    try {
      // 保存旧数据以便回滚
      const groups = cacheService.getGroupsCache();
      const oldGroup = groups.find(g => g.id === id);
      const oldTodos = cacheService.getTodosCache(id);

      // 立即从缓存删除
      cacheService.deleteGroupCache(id);

      // 后台同步到服务器
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to delete group:', error);
      
      // 失败时回滚缓存
      if (oldGroup) {
        cacheService.addGroupCache(oldGroup);
        if (oldTodos && oldTodos.length > 0) {
          cacheService.saveTodosCache(id, oldTodos);
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  // 重新排序分组 - 乐观更新
  async reorderGroups(groupIds) {
    try {
      // 保存旧顺序以便回滚
      const oldGroups = cacheService.getGroupsCache();

      // 立即更新缓存中的顺序
      const groups = cacheService.getGroupsCache();
      const reorderedGroups = groupIds.map((id, index) => {
        const group = groups.find(g => g.id === id);
        if (group) {
          return { ...group, sort_order: index };
        }
        return null;
      }).filter(g => g !== null);
      
      cacheService.saveGroupsCache(reorderedGroups);

      // 后台同步到服务器
      const updates = groupIds.map((id, index) => ({
        id,
        sort_order: index
      }));

      const { error } = await supabase
        .from('groups')
        .upsert(updates.map(u => ({ id: u.id, sort_order: u.sort_order })));
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to reorder groups:', error);
      
      // 失败时回滚缓存
      cacheService.saveGroupsCache(oldGroups);
      
      return { success: false, error: error.message };
    }
  }

  // ========== 待办操作 ==========

  // 加载分组下的所有待办（按 sort_order 排序）- 优先从缓存加载
  async loadTodos(groupId, forceRefresh = false) {
    debugLog('[data-service] loadTodos 调用, groupId:', groupId, 'forceRefresh:', forceRefresh);
    
    try {
      // 检查用户登录状态
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('[data-service] 用户未登录或认证失败:', authError);
        // 即使未登录，也尝试返回缓存数据
        const cachedTodos = cacheService.getTodosCache(groupId);
        console.log('[data-service] 用户未登录，返回缓存数据, 数量:', cachedTodos.length);
        return { success: true, data: cachedTodos, fromCache: true, authError: true };
      }
      debugLog('[data-service] 用户已登录, userId:', user.id);
      
      // 如果不强制刷新，优先从缓存读取
      if (!forceRefresh && this.useCacheFirst) {
        const cachedTodos = cacheService.getTodosCache(groupId);
        debugLog('[data-service] 从缓存读取待办, 数量:', cachedTodos.length);
        if (cachedTodos.length > 0) {
          // 后台异步同步服务器数据
          this._syncTodosInBackground(groupId);
          return { success: true, data: cachedTodos, fromCache: true };
        }
      }

      // 从服务器加载
      debugLog('[data-service] 从服务器加载待办, groupId:', groupId);
      
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('group_id', groupId)
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.error('[data-service] 从服务器加载待办失败:', error);
        console.error('[data-service] 错误详情:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      debugLog('[data-service] 从服务器加载待办成功, 数量:', data?.length || 0);
      
      // 保存到缓存
      cacheService.saveTodosCache(groupId, data || []);
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('[data-service] Failed to load todos:', error);
      console.error('[data-service] 错误类型:', error.constructor.name);
      console.error('[data-service] 错误消息:', error.message);
      console.error('[data-service] 错误堆栈:', error.stack);
      
      // 如果服务器请求失败，尝试返回缓存数据
      const cachedTodos = cacheService.getTodosCache(groupId);
      debugLog('[data-service] 尝试返回缓存数据, 数量:', cachedTodos.length);
      if (cachedTodos.length > 0) {
        return { success: true, data: cachedTodos, fromCache: true, error: error.message };
      }
      
      return { success: false, error: error.message, data: [] };
    }
  }

  // 后台同步待办数据
  async _syncTodosInBackground(groupId) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('group_id', groupId)
        .order('sort_order', { ascending: true });
      
      if (!error && data) {
        cacheService.saveTodosCache(groupId, data);
        cacheService.updateLastSync();
      }
    } catch (error) {
      // 后台同步失败不影响用户体验
      console.log('Background sync failed:', error.message);
    }
  }

  // 创建待办 - 乐观更新
  async createTodo(groupId, text) {
    try {
      // 获取当前最大 sort_order（优先从缓存）
      const cachedTodos = cacheService.getTodosCache(groupId);
      let maxSortOrder = -1;
      if (cachedTodos.length > 0) {
        maxSortOrder = Math.max(...cachedTodos.map(t => t.sort_order || 0));
      }

      // 创建临时ID和数据（乐观更新）
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempTodo = {
        id: tempId,
        group_id: groupId,
        text,
        completed: false,
        sort_order: maxSortOrder + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 立即添加到缓存
      cacheService.addTodoCache(groupId, tempTodo);

      // 后台同步到服务器
      const { data, error } = await supabase
        .from('todos')
        .insert([{
          group_id: groupId,
          text,
          completed: false,
          sort_order: maxSortOrder + 1
        }])
        .select()
        .single();
      
      if (error) throw error;

      // 替换临时数据为真实数据
      const todos = cacheService.getTodosCache(groupId);
      const index = todos.findIndex(t => t.id === tempId);
      if (index !== -1) {
        todos[index] = data;
        cacheService.saveTodosCache(groupId, todos);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to create todo:', error);
      
      // 失败时从缓存中移除临时数据
      const todos = cacheService.getTodosCache(groupId);
      const filtered = todos.filter(t => !t.id.startsWith('temp_'));
      cacheService.saveTodosCache(groupId, filtered);
      
      return { success: false, error: error.message };
    }
  }

  // 更新待办 - 乐观更新
  async updateTodo(id, updates) {
    try {
      // 找到待办所属的分组
      let targetGroupId = null;
      const groups = cacheService.getGroupsCache();
      for (const group of groups) {
        const todos = cacheService.getTodosCache(group.id);
        const todo = todos.find(t => t.id === id);
        if (todo) {
          targetGroupId = group.id;
          break;
        }
      }

      if (!targetGroupId) {
        throw new Error('Todo not found in cache');
      }

      // 保存旧数据以便回滚
      const todos = cacheService.getTodosCache(targetGroupId);
      const oldTodo = todos.find(t => t.id === id);

      // 立即更新缓存
      cacheService.updateTodoCache(targetGroupId, id, updates);

      // 后台同步到服务器
      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // 用服务器返回的数据更新缓存
      cacheService.updateTodoCache(targetGroupId, id, data);

      return { success: true, data };
    } catch (error) {
      console.error('Failed to update todo:', error);
      
      // 失败时回滚缓存
      if (targetGroupId && oldTodo) {
        cacheService.updateTodoCache(targetGroupId, id, oldTodo);
      }
      
      return { success: false, error: error.message };
    }
  }

  // 删除待办 - 乐观更新
  async deleteTodo(id) {
    try {
      // 找到待办所属的分组
      let targetGroupId = null;
      let oldTodo = null;
      const groups = cacheService.getGroupsCache();
      for (const group of groups) {
        const todos = cacheService.getTodosCache(group.id);
        const todo = todos.find(t => t.id === id);
        if (todo) {
          targetGroupId = group.id;
          oldTodo = todo;
          break;
        }
      }

      if (!targetGroupId) {
        throw new Error('Todo not found in cache');
      }

      // 立即从缓存删除
      cacheService.deleteTodoCache(targetGroupId, id);

      // 后台同步到服务器
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to delete todo:', error);
      
      // 失败时回滚缓存
      if (targetGroupId && oldTodo) {
        cacheService.addTodoCache(targetGroupId, oldTodo);
      }
      
      return { success: false, error: error.message };
    }
  }

  // 批量删除待办 - 乐观更新
  async deleteTodos(ids) {
    try {
      // 找到待办所属的分组并保存旧数据
      const deletedTodos = [];
      let targetGroupId = null;
      const groups = cacheService.getGroupsCache();
      
      for (const group of groups) {
        const todos = cacheService.getTodosCache(group.id);
        const matchingTodos = todos.filter(t => ids.includes(t.id));
        if (matchingTodos.length > 0) {
          targetGroupId = group.id;
          deletedTodos.push(...matchingTodos);
          break;
        }
      }

      if (!targetGroupId) {
        throw new Error('Todos not found in cache');
      }

      // 立即从缓存批量删除
      cacheService.deleteTodosCache(targetGroupId, ids);

      // 后台同步到服务器
      const { error } = await supabase
        .from('todos')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to delete todos in batch:', error);
      
      // 失败时回滚缓存
      if (targetGroupId && deletedTodos.length > 0) {
        const currentTodos = cacheService.getTodosCache(targetGroupId);
        const restoredTodos = [...currentTodos, ...deletedTodos].sort((a, b) => a.sort_order - b.sort_order);
        cacheService.saveTodosCache(targetGroupId, restoredTodos);
      }
      
      return { success: false, error: error.message };
    }
  }

  // 重新排序待办 - 乐观更新
  async reorderTodos(groupId, todoIds) {
    try {
      // 保存旧顺序以便回滚
      const oldTodos = cacheService.getTodosCache(groupId);

      // 立即更新缓存中的顺序
      const todos = cacheService.getTodosCache(groupId);
      const reorderedTodos = todoIds.map((id, index) => {
        const todo = todos.find(t => t.id === id);
        if (todo) {
          return { ...todo, sort_order: index };
        }
        return null;
      }).filter(t => t !== null);
      
      cacheService.saveTodosCache(groupId, reorderedTodos);

      // 后台同步到服务器
      const updates = todoIds.map((id, index) => ({
        id,
        sort_order: index
      }));

      const { error } = await supabase
        .from('todos')
        .upsert(updates.map(u => ({ id: u.id, sort_order: u.sort_order })));
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to reorder todos:', error);
      
      // 失败时回滚缓存
      cacheService.saveTodosCache(groupId, oldTodos);
      
      return { success: false, error: error.message };
    }
  }

  // ========== 实时订阅 ==========

  // 订阅分组变化 - 同时更新缓存
  subscribeToGroups(callback) {
    const channel = supabase
      .channel('groups-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'groups' },
        (payload) => {
          // 根据事件类型更新缓存
          if (payload.eventType === 'INSERT' && payload.new) {
            cacheService.addGroupCache(payload.new);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            cacheService.updateGroupCache(payload.new.id, payload.new);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            cacheService.deleteGroupCache(payload.old.id);
          }
          
          // 通知回调
          callback(payload);
        }
      )
      .subscribe();

    this.subscriptions.set('groups', channel);
    return channel;
  }

  // 订阅待办变化 - 同时更新缓存
  subscribeToTodos(groupId, callback) {
    const channelName = `todos-${groupId}`;
    
    debugLog('[data-service] subscribeToTodos 调用, groupId:', groupId, 'channelName:', channelName);
    
    // 取消之前的订阅
    if (this.subscriptions.has(channelName)) {
      debugLog('[data-service] 取消之前的订阅, channelName:', channelName);
      this.unsubscribe(channelName);
    }

    debugLog('[data-service] 创建新的订阅, channelName:', channelName);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'todos',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          debugLog('[data-service] 收到待办变化通知, groupId:', groupId, 'eventType:', payload.eventType);
          // 根据事件类型更新缓存
          if (payload.eventType === 'INSERT' && payload.new) {
            debugLog('[data-service] 添加待办到缓存:', payload.new);
            cacheService.addTodoCache(groupId, payload.new);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            debugLog('[data-service] 更新待办缓存:', payload.new);
            cacheService.updateTodoCache(groupId, payload.new.id, payload.new);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            debugLog('[data-service] 从缓存删除待办:', payload.old);
            cacheService.deleteTodoCache(groupId, payload.old.id);
          }
          
          // 通知回调
          callback(payload);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    debugLog('[data-service] 订阅完成, channelName:', channelName);
    return channel;
  }

  // 取消订阅
  unsubscribe(channelName) {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  // 取消所有订阅
  unsubscribeAll() {
    this.subscriptions.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
  }
}

module.exports = new DataService();

